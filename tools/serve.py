#!/usr/bin/env python3
"""Serwer do testów na komputerze: podaje zawsze świeże pliki (bez pamięci podręcznej).

Użycie: python3 tools/serve.py [port]   (domyślnie 8766), potem http://localhost:8766
"""
import functools
import http.server
import os
import sys

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app')


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    handler = functools.partial(NoCache, directory=APP)
    http.server.ThreadingHTTPServer(('', port), handler).serve_forever()
