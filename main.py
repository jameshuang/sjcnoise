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
from google.appengine.api import mail
import random
#weird mail error
#from google.appengine.api import apiproxy_stub_map

def maskIP(ip):
  ipv4 = str(ip).split('.')
  if len(ipv4) == 4:
       masked = ipv4[0] + '.*.' +ipv4[2] + '.' + ipv4[3]
       return masked
  ipv6 = str(ip).split(':')
  while (len(ipv6) > 0 and ipv6[-1] == ''):
       ipv6.pop()
  if len(ipv6) > 1:
       masked = ipv6[0] + ':**:' + ipv6[-1]
       return masked
  return str(ip)

def getPSTNowTime():
  return  datetime.now() - timedelta(hours= 7)

class MainHandler(webapp.RequestHandler):
  def get (self, q):
    if q is None:
      q = 'index.html'
    elif q == 'vp' or q == '/vp':
      q = 'prev.html'
    elif q == 'man' or q == '/man':
      q = 'man.html'
    else:
      q = 'index.html'
    path = os.path.join (os.path.dirname (__file__), q)
    self.response.headers ['Content-Type'] = 'text/html'
    self.response.out.write (template.render (path, {}))


class IPHandler(webapp.RequestHandler):
  def get(self,q):
    self.response.headers ['Content-Type'] = 'text/html'
    self.response.out.write(self.request.remote_addr) 

#tom = "http://overheadairplanes.com/"
tom = "http://45.79.109.108/"

def send_email(to = "Admin SaveMySunnySkyOrg <admin@savemysunnysky.org>",
                subject = '[Website Feedback]',
                body = 'eom'):
      try:
        mail.send_mail(sender = 'guanxiaohua@gmail.com', to = to,
                     subject = subject ,
                     body = body)
      except Exception, e:
          logging.exception(e)
          return 'Error sending the email:'+str(e)
      return 'Email Sent'

class SendMailHandler(webapp.RequestHandler):
    def post(self, q):
        try:
          self.response.headers['Content-Type'] = 'text/plain'
          if q.lower().startswith('sendmail') or q.lower().startswith('/sendmail'):
            name = self.request.POST['name']
            email = self.request.POST['email']
            message = self.request.POST['message']
            date = getPSTNowTime().strftime("%d/%m/%Y %H:%M")
            udate = datetime.now().strftime("%d/%m/%Y %H:%M")
            ip = self.request.remote_addr
            subject = '[Website Feedback] From ' + name +' <' + email + '>' 
            body = 'Name: {}\nEmail: {}\nDate: {}\nUTC_Date: {}\nIP Address: {}\n\nMessage:\n {}\n'.format(
                   name, email, date, udate, ip, message.decode('ascii', 'ignore'))
            self.response.out.write(send_email(subject=subject, body=body))
          else:
            self.response.out.write('wrong URI')
        except Exception, e:
          logging.exception(e)
          return '\nError in sendemail:'+str(e) + '\n'

    def get(self, q):
      try:
        self.response.headers['Content-Type'] = 'text/plain'
        if q.lower().startswith('sendmail') or q.lower().startswith('/sendmail'):
          to = self.request.GET['to']
          subject = self.request.GET['subject']
          body = self.request.GET['body']
          self.response.out.write(send_email(to, subject, body))
        else:
          self.response.out.write('wrong URI')
      except Exception, e:
        logging.exception(e)
        return '\nError in sendemail:'+str(e) + '\n'

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
          memcache.add(key = q, value = result.content, time = 3600 * 2)
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
    new_str = now.strftime("%m/%d/%Y %H:%M:%S")+', '+ maskIP(self.request.remote_addr)+', '+date+', '+total
    try : 
       with gcs.open(csv_name,'r') as read_file:
         previous = read_file.read().strip()
         if previous.strip() != '':
            new_str = new_str + '\n' + previous
    except Exception, e:
      logging.exception(e)
    try:
      if (len(new_str) > 10000):
        #about 200 lines, then we practically back up and re-create summary.csv
        gcs.delete(csv_name)
        suffix = now.strftime("_%Y%m%d_%H%M%S_")
        suffix += str(random.randint(0,1000))
        csv_name = '/'+bucket_name+'/summary'+suffix+'.csv'
        logging.info('summary.csv backed up to '+csv_name)
        
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
	app = webapp.WSGIApplication ([('/(.*html)?', MainHandler), ('/(man.*)?', MainHandler), ('/(sendmail.*)?', SendMailHandler), ('/(ip.*)?',IPHandler), ('/(v.*)?', MainHandler),('/(sum.*)?', SouthFlowHandler), ('/(south.*)?', SouthFlowHandler),('/(ann.*)?', AnnouncementHandler),('/(plane_list/.*)?', PlaneHandler)], debug=True)
	#app = webapp.WSGIApplication ([('/plane_list/.*', PlaneHandler)], debug=True)
	#app = webapp.WSGIApplication ([('/(plane_list/.*)?', WildHandler)], debug=True)
	util.run_wsgi_app (app)

if __name__ == '__main__':
	main ()
