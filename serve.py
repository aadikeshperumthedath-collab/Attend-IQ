#!/usr/bin/env python3
"""
AttendIQ - Local HTTP Server Runner
Serves the AttendIQ modern web app on http://localhost:5173
and automatically opens your default browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 5173

# Change working directory to this file's folder
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class AttendIQRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable cache during development and demo
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    port = PORT
    for attempt in range(5):
        try:
            with socketserver.TCPServer(("", port), AttendIQRequestHandler) as httpd:
                url = f"http://localhost:{port}"
                print("=" * 60)
                print(f"🚀 AttendIQ — Smart Student Attendance Command Center")
                print(f"📡 Local server running at: {url}")
                print(f"⚡ Press Ctrl+C in terminal to stop the server.")
                print("=" * 60)
                try:
                    webbrowser.open(url)
                except Exception:
                    pass
                httpd.serve_forever()
                break
        except OSError:
            port += 1

if __name__ == '__main__':
    run_server()
