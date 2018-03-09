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
#from pytz import timezone
#import pytz
from datetime import datetime

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
			result = urlfetch.fetch(url, deadline=120)
			if result.status_code == 200:
				self.response.headers ['Content-Type'] = 'text/html'
				self.response.write(result.content)
			else:
				self.response.status_code = result.status_code
			#self.response.write(url)
		except urlfetch.Error:
			logging.exception('Caught exception fetching url')

class SouthFlowHandler(webapp.RequestHandler):
  cached_dates = ''
  def getPSTNowTime(self):
    #now = datetime.now(tz=pytz.utc)
    #my_timezone=timezone('US/Pacific')
    #return now.astimezone(my_timezone)
    return  datetime.now()

  def post (self, *args, **kwargs):
    date = self.request.POST['date']
    total = self.request.POST['total']
    write_retry_params = gcs.RetryParams(backoff_factor=1.1)
    bucket_name = os.environ.get('BUCKET_NAME', app_identity.get_default_gcs_bucket_name())
    file_name = '/'+bucket_name+'/southflow.txt' 
    self.response.headers ['Content-Type'] = 'text/plain'
    if total == '-1':
       #we are resetting the southflow days
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
    now = self.getPSTNowTime()
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
    while len(list) > 10:
      list.pop();
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

  def get (self, q):
    bucket_name = os.environ.get('BUCKET_NAME', app_identity.get_default_gcs_bucket_name())
    self.response.headers ['Content-Type'] = 'text/plain'
    try :
      file_name = 'summary.csv'
      if q.startswith('/south') or q.startswith('south'):
        file_name = 'southflow.txt'
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
					
def main ():
	app = webapp.WSGIApplication ([('/(.*html)?', MainHandler), ('/(v.*)?', MainHandler),('/(sum.*)?', SouthFlowHandler), ('/(south.*)?', SouthFlowHandler),('/(plane_list/.*)?', PlaneHandler)], debug=True)
	#app = webapp.WSGIApplication ([('/plane_list/.*', PlaneHandler)], debug=True)
	#app = webapp.WSGIApplication ([('/(plane_list/.*)?', WildHandler)], debug=True)
	util.run_wsgi_app (app)

if __name__ == '__main__':
	main ()