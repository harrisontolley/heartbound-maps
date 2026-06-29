import base64, os
from http.server import HTTPServer, SimpleHTTPRequestHandler

DIR = os.path.dirname(os.path.abspath(__file__))

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIR, **k)
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(n)
        with open(os.path.join(DIR, 'size-comparison.png'), 'wb') as f:
            f.write(base64.b64decode(data))
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')

HTTPServer(('127.0.0.1', 8899), H).serve_forever()
