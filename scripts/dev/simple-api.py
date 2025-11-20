#!/usr/bin/env python3
import json
import random
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timedelta

class MonitoringAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'status': 'ok', 'timestamp': datetime.now().isoformat()}
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/api/metrics':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                'timestamp': datetime.now().isoformat(),
                'cpu_usage': random.uniform(20, 80),
                'memory_usage': random.uniform(30, 70),
                'disk_usage': random.uniform(40, 60),
                'network_io': random.uniform(100000, 1000000),
                'job_queue_size': random.randint(0, 10),
                'active_jobs': random.randint(0, 5)
            }
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/api/jobs':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            jobs = ['politician-trading-monitor', 'db-health-monitor', 'shell-analytics', 'system-metrics-collector']
            response = []
            for job in jobs:
                response.append({
                    'job_name': job,
                    'last_run': (datetime.now() - timedelta(minutes=random.randint(1, 60))).isoformat(),
                    'status': 'failure' if random.random() > 0.8 else 'success',
                    'duration_ms': random.randint(1000, 5000)
                })
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/api/trades':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = [
                {'name': 'Nancy Pelosi', 'ticker': 'NVDA', 'amount': '$1M - $5M', 'transaction_type': 'Purchase', 'transaction_date': '2025-01-20'},
                {'name': 'Dan Crenshaw', 'ticker': 'TSLA', 'amount': '$500K - $1M', 'transaction_type': 'Sale', 'transaction_date': '2025-01-19'},
                {'name': 'Josh Gottheimer', 'ticker': 'AAPL', 'amount': '$100K - $250K', 'transaction_type': 'Purchase', 'transaction_date': '2025-01-18'},
                {'name': 'Mark Green', 'ticker': 'MSFT', 'amount': '$250K - $500K', 'transaction_type': 'Purchase', 'transaction_date': '2025-01-17'},
                {'name': 'Michael McCaul', 'ticker': 'GOOGL', 'amount': '$1M - $5M', 'transaction_type': 'Sale', 'transaction_date': '2025-01-16'},
                {'name': 'Tommy Tuberville', 'ticker': 'META', 'amount': '$100K - $250K', 'transaction_type': 'Purchase', 'transaction_date': '2025-01-15'},
                {'name': 'Pat Fallon', 'ticker': 'AMZN', 'amount': '$50K - $100K', 'transaction_type': 'Sale', 'transaction_date': '2025-01-14'}
            ]
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/api/alerts':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            alerts = []
            if random.random() > 0.5:
                alerts.append({
                    'id': f'alert-{datetime.now().timestamp()}',
                    'severity': random.choice(['info', 'warning', 'error']),
                    'message': random.choice([
                        'High memory usage detected (>80%)',
                        'Job failure: politician-trading-monitor',
                        'Database connection pool exhausted',
                        'Disk usage exceeding threshold'
                    ]),
                    'timestamp': datetime.now().isoformat(),
                    'resolved': False
                })
            self.wfile.write(json.dumps(alerts).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress default logging

if __name__ == '__main__':
    PORT = 3032
    server = HTTPServer(('localhost', PORT), MonitoringAPIHandler)
    print(f'Monitoring API running on http://localhost:{PORT}')
    server.serve_forever()