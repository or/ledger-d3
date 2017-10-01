#!/usr/bin/env python3
import csv
import json
import io
import os
import subprocess
import sys

import tornado.ioloop
import tornado.web

from argparse import ArgumentParser

def query_assets():
    data = subprocess.check_output("ledger csv --sort date,-amount Assets", shell=True)
    reader = csv.reader(io.StringIO(data.decode("utf-8")))
    result = []
    for row in reader:
        date, unused, name, account, commodity, amount = row[:6]
        result.append({
            "date": date,
            "name": name,
            "account": account,
            "commodity": commodity,
            "amount": amount,
        })

    return result


def query_expenses():
    data = subprocess.check_output("ledger csv --sort date,-amount Expenses", shell=True)
    reader = csv.reader(io.StringIO(data.decode("utf-8")))
    result = []
    for row in reader:
        date, unused, name, account, commodity, amount = row[:6]
        result.append({
            "date": date,
            "name": name,
            "account": account,
            "commodity": commodity,
            "amount": amount,
        })

    return result


class DataHandler(tornado.web.RequestHandler):
    def get(self, path):
        data = None
        if path == 'assets.json':
            data = query_assets()
        else:
            self.set_status(404)
            self.write("not found")
            return

        self.set_status(200)
        self.set_header('Content-type','text/json')

        self.write(json.dumps(data).encode("utf8"))

    def post(self, path, *args, **kwargs):
        print(path, args, kwargs)


class StaticHandler(tornado.web.StaticFileHandler):
    def parse_url_path(self, url_path):
        if not url_path or url_path.endswith('/'):
            url_path = url_path + 'index.html'

        return url_path


def make_app():
    application = tornado.web.Application([
        ('/data/(.*)', DataHandler),
        ('/(.*)', StaticHandler, {'path': os.getcwd()}),
    ], debug=True)

    return application


def start_server(port=8000):
    app = make_app()
    app.listen(port)
    tornado.ioloop.IOLoop.instance().start()


def parse_args(args=None):
    parser = ArgumentParser()
    parser.add_argument('-p', '--port', type=int, default=8000,
                        help='Port on which to run server.')

    return parser.parse_args(args)


def main(args=None):
    args = parse_args(args)
    print('Starting server on port {}'.format(args.port))
    start_server(port=args.port)


if __name__ == '__main__':
    sys.exit(main())
