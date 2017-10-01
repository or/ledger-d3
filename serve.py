#!/usr/bin/env python3
import csv
import json
import io
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler


class RequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/data/'):
            handled = self.generate_data(self.path.split('/', 2)[2])
            if handled:
                return

        return super().do_GET()


    def generate_data(self, path):
        data = None
        if path == 'assets.json':
            data = query_assets()
        else:
            return False

        self.send_response(200)
        self.send_header('Content-type','text/json')
        self.end_headers()

        self.wfile.write(json.dumps(data).encode("utf8"))
        return True


def query_assets():
    data = subprocess.check_output("ledger csv Assets", shell=True)
    reader = csv.reader(io.StringIO(data.decode("utf-8")))
    result = []
    for row in reader:
        date, unused, name, account, currency, amount = row[:6]
        result.append({
            "date": date,
            "name": name,
            "account": account,
            "currency": currency,
            "amount": amount,
        })

    return result


def query_expenses():
    data = subprocess.check_output("ledger csv Expenses", shell=True)
    reader = csv.reader(io.StringIO(data.decode("utf-8")))
    result = []
    for row in reader:
        date, unused, name, account, currency, amount = row[:6]
        result.append({
            "date": date,
            "name": name,
            "account": account,
            "currency": currency,
            "amount": amount,
        })

    return result


def run():
    server_address = ('127.0.0.1', 8081)
    httpd = HTTPServer(server_address, RequestHandler)
    print('running server...')
    httpd.serve_forever()


run()
