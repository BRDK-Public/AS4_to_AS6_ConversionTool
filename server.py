#!/usr/bin/env python3
"""
Development server for AS4 to AS6 Converter
Serves files with no-cache headers to ensure fresh content during development
"""

import http.server
import socketserver
import os

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add no-cache headers to all responses
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # More informative logging
        if '%' in format:
            super().log_message(format, *args)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    PORT = 8000
    Handler = NoCacheHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving HTTP on http://localhost:{PORT}/as4-to-as6-converter.html")
        print("Press Ctrl+C to stop the server")
        print("Cache headers set to prevent stale content during development")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
