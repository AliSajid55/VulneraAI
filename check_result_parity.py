"""Live API parity checks. Run while server.py is running: python check_result_parity.py

Uses a new disposable test account, then deletes only that account and its scans.
/api/scan may call the configured Gemini service. No real account credentials needed.
This checks API parity and persistence, not browser rendering or model accuracy.
"""
import argparse
import math
import secrets
import sys
import requests

CASES = {
    'safe_example': 'def add(a, b):\n    return a + b\n',
    'sql_example': 'query = "SELECT * FROM users WHERE id = " + user_id\ncursor.execute(query)\n',
    'long_example': ''.join(f'value_{i} = {i}\n' for i in range(600)) + 'eval(user_input)\n',
}
NUMERIC = ('confidence', 'vulnerable_probability', 'threshold')


def equal_result(a, b):
    differences = []
    for key in ('prediction', 'chunk_count'):
        if a.get(key) != b.get(key):
            differences.append(key)
    for key in NUMERIC:
        x, y = a.get(key), b.get(key)
        if not isinstance(x, (int, float)) or not isinstance(y, (int, float)) or not math.isclose(x, y, rel_tol=0, abs_tol=0.0001):
            differences.append(key)
    if a.get('model', a.get('model_version')) != b.get('model', b.get('model_version')):
        differences.append('model')
    return differences


def run(base):
    session = requests.Session()
    failures = []
    checks = 0
    password = secrets.token_urlsafe(24)
    created = False

    def call(method, path, **kwargs):
        response = session.request(method, base + path, timeout=420, **kwargs)
        response.raise_for_status()
        return response.json()

    def check(name, condition, details=''):
        nonlocal checks
        checks += 1
        print(f'{"PASS" if condition else "FAIL"}: {name}' + (f' ({details})' if details else ''), flush=True)
        if not condition:
            failures.append(name)

    try:
        health = call('GET', '/api/health')
        print('Backend:', base, '\nModel:', health.get('model_name'), '\nRule:', health.get('scoring_rule_description'), flush=True)
        print('Creating a disposable test account; Gemini explanations may take time.', flush=True)
        account = call('POST', '/api/auth/signup', json={
            'name': 'Result parity test',
            'email': f'parity-{secrets.token_hex(10)}@example.invalid', 'password': password,
        })
        created = True
        session.headers['Authorization'] = 'Bearer ' + account['token']
        for name, code in CASES.items():
            raw = call('POST', '/api/predict', json={'code': code, 'language': 'python'})
            scan = call('POST', '/api/scan', json={'code': code, 'language': 'python', 'title': name})
            diff = equal_result(raw, scan)
            check(name + ': predict vs frontend scan API', not diff, ', '.join(diff))
            print(f"  verdict={raw['prediction']}, probability={raw['vulnerable_probability']}, confidence={raw['confidence']}, threshold={raw['threshold']}", flush=True)
            saved = call('GET', f"/api/scans/{scan['id']}")
            check(name + ': saved history retains result', not equal_result(scan, saved))
            check(name + ': returned code unchanged', scan.get('code') == code)
            if name == 'long_example':
                check('Long code: chunk limit exercised', raw['total_chunks'] > raw['chunk_count'])
                check('Long code: configured chunk cap', raw['chunk_count'] == health['max_eval_chunks'])
            else:
                variants = {
                    'no final newline': code.rstrip('\n'),
                    'outer blank lines': '\n\n' + code + '\n\n',
                    'Windows line endings': code.replace('\n', '\r\n'),
                    'trailing spaces': '\n'.join(line + '   ' for line in code.splitlines()) + '\n',
                }
                for label, variant in variants.items():
                    result = call('POST', '/api/predict', json={'code': variant, 'language': 'python'})
                    diff = equal_result(raw, result)
                    check(name + ': ' + label, not diff, ', '.join(diff))
        print(f'\n{checks - len(failures)}/{checks} checks passed.', flush=True)
        print('Parity is separate from accuracy: a safe example may still be misclassified.')
    finally:
        if created:
            try:
                call('DELETE', '/api/auth/me', json={'password': password})
                print('Disposable test account and its scans deleted.', flush=True)
            except Exception as exc:
                failures.append('cleanup')
                print(f'Cleanup failed: {exc}. Only the disposable account may remain.', file=sys.stderr)
        session.close()
    return 1 if failures else 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:5000')
    args = parser.parse_args()
    try:
        sys.exit(run(args.url.rstrip('/')))
    except (requests.RequestException, KeyError, ValueError, TypeError) as exc:
        print(f'Test could not complete: {exc}', file=sys.stderr)
        sys.exit(1)
