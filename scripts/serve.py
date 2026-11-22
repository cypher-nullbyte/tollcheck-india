#!/usr/bin/env python3
"""Local dev server for web/ that tells the browser never to cache (so every reload shows the latest code/data).
Usage: python3 scripts/serve.py [port]   (default 8765)"""
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web"))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"serving web/ on http://127.0.0.1:{port} (no caching)", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCache).serve_forever()
