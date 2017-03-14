# Copyright 2012 Digital Inspiration
# http://www.labnol.org/

import os

from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext.webapp import template
from google.appengine.api import urlfetch


class MainHandler(webapp.RequestHandler):
	def get (self, q):
		if q is None:
			q = 'index.html'
		count()
		path = os.path.join (os.path.dirname (__file__), q)
		self.response.headers ['Content-Type'] = 'text/html'
		self.response.out.write (template.render (path, {}))

	def count(self):
		return
	
#tom = "http://overheadairplanes.com/"
tom = "http://45.79.109.108/"

class PlaneHandler(webapp.RequestHandler):
	def get (self, q):
		try:
			if q is None:
				url = tom
			else:
				url = tom + q
			result = urlfetch.fetch(url)
			if result.status_code == 200:
				self.response.headers ['Content-Type'] = 'text/html'
				self.response.write(result.content)
			else:
				self.response.status_code = result.status_code
			#self.response.write(url)
		except urlfetch.Error:
			logging.exception('Caught exception fetching url')

			
class WildHandler(webapp.RequestHandler):
	def get (self, q):
		if q is None:
			q = 'index.html'
		if q.startswith('/plane_list') or q.startswith('plane_list'):
			url = tom + q
			"""
			try:
				result = urlfetch.fetch(url)
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
	app = webapp.WSGIApplication ([('/(.*html)?', MainHandler), ('/(plane_list/.*)?', PlaneHandler)], debug=True)
	#app = webapp.WSGIApplication ([('/plane_list/.*', PlaneHandler)], debug=True)
	#app = webapp.WSGIApplication ([('/(plane_list/.*)?', WildHandler)], debug=True)
	util.run_wsgi_app (app)

if __name__ == '__main__':
	main ()