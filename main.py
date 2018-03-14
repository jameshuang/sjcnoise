# Copyright 2012 Digital Inspiration
# http://www.labnol.org/

import os
import logging
import sys
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext.webapp import template
from google.appengine.api import urlfetch
import cloudstorage as gcs
from google.appengine.api import app_identity
from datetime import datetime, timedelta
from google.appengine.api import memcache

def getPSTNowTime():
  return  datetime.now() - timedelta(hours= 7)

class MainHandler(webapp.RequestHandler):
	def get (self, q):
		if q is None:
			q = 'index.html'
		elif q.startswith('vp'):
			q = 'prev.html'
		elif q.startswith('v4'):
			q = 'v4.html'
		path = os.path.join (os.path.dirname (__file__), q)
		self.response.headers ['Content-Type'] = 'text/html'
		self.response.out.write (template.render (path, {}))

#tom = "http://overheadairplanes.com/"
tom = "http://45.79.109.108/"

class PlaneHandler(webapp.RequestHandler):
  def get (self, q):
    try:
      if q is None:
        url = tom
      else:
        url = tom + q
      #checking cache
      cached = memcache.get(key = q);
      if cached is not None:
         logging.info('PlaneHandler: Cached url: ' + q)
         self.response.headers ['Content-Type'] = 'text/html'
         self.response.write(cached)
         return
      #go fetch it
      result = urlfetch.fetch(url, deadline=120)
      if result.status_code == 200:
        self.response.headers ['Content-Type'] = 'text/html'
        self.response.write(result.content)
        #cache it for future use, data detains for one whole day
        #check date
        now = getPSTNowTime()
        now_str = '{}/{}'.format(now.month,now.day)
        if (q.endswith(now_str)):
          memcache.add(key = q, value = result.content, time = 60 * 5)
        else:
          memcache.add(key = q, value = result.content, time = 3600 * 24)
        self.cachedContent = result.content
      else:
        self.response.status_code = result.status_code
        #self.response.write(url)
    except urlfetch.Error:
        logging.exception('Caught exception fetching url')

class SouthFlowHandler(webapp.RequestHandler):
  cached_dates = ''
  def save(self, toSaveList):
    write_retry_params = gcs.RetryParams(backoff_factor=1.1)
    bucket_name = os.environ.get('BUCKET_NAME', app_identity.get_default_gcs_bucket_name())
    file_name = '/'+bucket_name+'/allsouthflow.txt'
    new_str = ', '.join(toSaveList)
    try :
       with gcs.open(file_name,'r') as read_file:
         previous = read_file.read().strip()
         if previous.strip() != '':
            new_str = new_str + ', ' + previous
    except Exception, e:
      logging.exception(e)
    try:
      gcs_file = gcs.open(file_name,
                      'w',
                      content_type='text/plain',
                      retry_params=write_retry_params)
      gcs_file.write(str(new_str))
      gcs_file.close()
    except Exception, e:
      logging.exception(e)
    
  def post (self, *args, **kwargs):
    date = self.request.POST['date']
    total = self.request.POST['total']
    write_retry_params = gcs.RetryParams(backoff_factor=1.1)
    bucket_name = os.environ.get('BUCKET_NAME', app_identity.get_default_gcs_bucket_name())
    file_name = '/'+bucket_name+'/southflow.txt' 
    self.response.headers ['Content-Type'] = 'text/plain'
    if total == '0':
      #something wrong, we should not book this total into sumary, and we shuld not update south flow days
      return
    if total == '-1':
      #we are resetting the southflow days
      #test password
      if not date.startswith(getPSTNowTime().strftime("%d")): 
        self.response.out.write('wrong password')
        return 
      #get rid of the password part
      date = date[2:]

      try:
        write_retry_params = gcs.RetryParams(backoff_factor=1.1)
        gcs_file = gcs.open(file_name,
                      'w',
                      content_type='text/plain',
                      retry_params=write_retry_params)
        self.cached_dates = date
        gcs_file.write(str(self.cached_dates))
        gcs_file.close()
        self.response.out.write(self.cached_dates)
      except Exception, e:
        logging.exception(e)
      return
    # always update the filed complaints count
    # read first
    csv_name = '/'+bucket_name+'/summary.csv'
    now = getPSTNowTime()
    new_str = now.strftime("%Y-%m-%d %H:%M")+','+self.request.remote_addr+','+date+','+total
    try : 
       with gcs.open(csv_name,'r') as read_file:
         previous = read_file.read().strip()
         if previous.strip() != '':
            new_str = new_str + '\n' + previous
    except Exception, e:
      logging.exception(e)
    try:
      gcs_file = gcs.open(csv_name,
                      'w',
                      content_type='text/plain',
                      retry_params=write_retry_params)
      gcs_file.write(str(new_str))
      gcs_file.close()
    except Exception, e:
      logging.exception(e)
    
    # check if we need to update the south flow days record
    if self.cached_dates.find(date) != -1:
       return

    list = []
    my_default_retry_params = gcs.RetryParams(initial_delay=0.2,
                                          max_delay=5.0,
                                          backoff_factor=2,
                                          max_retry_period=15)
    gcs.set_default_retry_params(my_default_retry_params)

    try : 
      with gcs.open(file_name,'r') as read_file:
        dates = read_file.read().strip()
        if (dates.find(date) != -1) :
           self.response.out.write('')
           return
        if dates != '':
          list = dates.split(', ')
    except Exception, e:
      logging.exception(e)
    list.append(date)
    list.sort(reverse=True)
    toSave = []
    while len(list) > 10:
      toSave.insert(0,list.pop());
    try: 
      gcs_file = gcs.open(file_name,
                      'w',
                      content_type='text/plain',
                      retry_params=write_retry_params)
      self.cached_dates = ', '.join(list)
      gcs_file.write(str(self.cached_dates))
      gcs_file.close()
      self.response.out.write(self.cached_dates)

    except Exception, e:
      logging.exception(e)
    if len(toSave) > 0:
      self.save(toSave)

  def get (self, q):
    bucket_name = os.environ.get('BUCKET_NAME', app_identity.get_default_gcs_bucket_name())
    self.response.headers ['Content-Type'] = 'text/plain'
    try :
      file_name = ''
      if q.startswith('/southall') or q.startswith('southall'):
        file_name = 'allsouthflow.txt'
      elif q.startswith('/south') or q.startswith('south'):
        file_name = 'southflow.txt'
      elif q.startswith('/sum') or q.startswith('sum'):
        file_name = 'summary.csv'
      else:
         self.response.out.write('error!')
         return
      with gcs.open('/'+bucket_name+'/'+file_name,'r') as read_file:
        self.response.out.write(read_file.read())
    except Exception, e:
      logging.exception(e)
      self.response.out.write('')

class WildHandler(webapp.RequestHandler):
	def get (self, q):
		if q is None:
			q = 'index.html'
		if q.startswith('/plane_list') or q.startswith('plane_list'):
			url = tom + q
			"""
			try:
				result = urlfetch.fetch(url, deadline = 120)
				if result.status_code == 200:
					self.response.headers ['Content-Type'] = 'text/html'
					self.response.write(result.content)
				else:
					self.response.status_code = result.status_code
			except urlfetch.Error:
				logging.exception('Caught exception fetching url')
			"""
			self.response.write(url)
		else:
			path = os.path.join (os.path.dirname (__file__), q)
			self.response.headers ['Content-Type'] = 'text/html'
			self.response.out.write (template.render (path, {}))
	
class AnnouncementHandler(webapp.RequestHandler):
  def post (self, *args, **kwargs):
    password = self.request.POST['pass']
    announcement = self.request.POST['ann']
    write_retry_params = gcs.RetryParams(backoff_factor=1.1)
    bucket_name = os.environ.get('BUCKET_NAME', app_identity.get_default_gcs_bucket_name())
    file_name = '/'+bucket_name+'/announcement.txt' 
    self.response.headers ['Content-Type'] = 'text/plain'
    day = getPSTNowTime().strftime("%d")
    if password == day:
       #we are resetting the southflow days
      try:
        write_retry_params = gcs.RetryParams(backoff_factor=1.1)
        gcs_file = gcs.open(file_name,
                      'w',
                      content_type='text/plain',
                      retry_params=write_retry_params)
        gcs_file.write(str(announcement))
        gcs_file.close()
        self.response.out.write(announcement)
      except Exception, e:
        logging.exception(e)
      return
    else:
      self.response.out.write('wrong password')
  def get (self, q):
    bucket_name = os.environ.get('BUCKET_NAME', app_identity.get_default_gcs_bucket_name())
    self.response.headers ['Content-Type'] = 'text/plain'
    try :
      file_name = 'announcement.txt'
      with gcs.open('/'+bucket_name+'/'+file_name,'r') as read_file:
        self.response.out.write(read_file.read())
    except Exception, e:
      logging.exception(e)
      self.response.out.write('')
				
def main ():
	app = webapp.WSGIApplication ([('/(.*html)?', MainHandler), ('/(v.*)?', MainHandler),('/(sum.*)?', SouthFlowHandler), ('/(south.*)?', SouthFlowHandler),('/(ann.*)?', AnnouncementHandler),('/(plane_list/.*)?', PlaneHandler)], debug=True)
	#app = webapp.WSGIApplication ([('/plane_list/.*', PlaneHandler)], debug=True)
	#app = webapp.WSGIApplication ([('/(plane_list/.*)?', WildHandler)], debug=True)
	util.run_wsgi_app (app)

if __name__ == '__main__':
	main ()
