#!/usr/bin/env python3
"""Synthetic localhost-only header exercise. No real users, database or exploit."""
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import argparse
class Lab(BaseHTTPRequestHandler):
    hardened=False
    def log_message(self,*a):pass
    def do_GET(self):
        if self.path!='/':self.send_error(404);return
        body=b'<!doctype html><title>Defensive AI Local Lab</title><h1>Synthetic local lab</h1><p>Only made-up data. Practice one non-destructive header check.</p>'
        self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8')
        if self.hardened:self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--port',type=int,default=8765);p.add_argument('--hardened',action='store_true');a=p.parse_args();Lab.hardened=a.hardened
    server=ThreadingHTTPServer(('127.0.0.1',a.port),Lab);print(f'Local synthetic lab at http://127.0.0.1:{a.port}; hardened={a.hardened}. Ctrl-C to stop.',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
if __name__=='__main__':main()
