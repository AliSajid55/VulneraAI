
# VULNERABILITY DETECTION MODEL - 300 TEST CASES
# Easy: 100 | Medium: 100 | Complex: 100

import torch
import numpy as np
from transformers import AutoTokenizer, RobertaForSequenceClassification
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score


# UPDATE THIS PATH to where your model is saved
MODEL_PATH = "/content/drive/MyDrive/graphcodebert_multilang_vuln_scanner"
# If running locally, change to:
# MODEL_PATH = "./graphcodebert_multilang_vuln_scanner"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = RobertaForSequenceClassification.from_pretrained(MODEL_PATH)
model = model.to(device)
model.eval()
print(f"Model loaded on {device}")


# 300 TEST CASES
# Format: (code, label)
# label: 0 = SAFE, 1 = VULNERABLE
# EASY TEST CASES (1-100)
# Single obvious vulnerabilities, simple code


easy_test_cases = [
    # --- SQL Injection (Easy) ---
    ('''
def get_user(username):
    query = "SELECT * FROM users WHERE name = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchone()
''', 1),

    ('''
def search_products(name):
    sql = "SELECT * FROM products WHERE name = '" + name + "'"
    db.execute(sql)
    return db.fetchall()
''', 1),

    ('''
def delete_user(user_id):
    query = "DELETE FROM users WHERE id = " + user_id
    db.execute(query)
''', 1),

    ('''
def login(user, password):
    q = "SELECT * FROM users WHERE name='" + user + "' AND pass='" + password + "'"
    return db.execute(q).fetchone()
''', 1),

    ('''
def get_orders(customer):
    sql = "SELECT * FROM orders WHERE customer = '" + customer + "'"
    return cursor.execute(sql).fetchall()
''', 1),

    ('''
def update_email(uid, email):
    q = "UPDATE users SET email='" + email + "' WHERE id=" + uid
    db.execute(q)
''', 1),

    ('''
def find_product(pid):
    query = "SELECT * FROM products WHERE id = '" + pid + "'"
    return db.execute(query).fetchone()
''', 1),

    ('''
def get_messages(user):
    sql = "SELECT * FROM messages WHERE recipient='" + user + "'"
    return cursor.execute(sql).fetchall()
''', 1),

    ('''
def check_stock(item):
    q = "SELECT quantity FROM inventory WHERE item='" + item + "'"
    return db.execute(q).fetchone()[0]
''', 1),

    ('''
def add_comment(post_id, comment):
    query = "INSERT INTO comments VALUES(" + post_id + ",'" + comment + "')"
    db.execute(query)
''', 1),

    # --- XSS (Easy) ---
    ('''
def show_name(name):
    return "<h1>Hello " + name + "</h1>"
''', 1),

    ('''
def render_profile(user_input):
    return "<div>" + user_input + "</div>"
''', 1),

    ('''
def display_comment(comment):
    html = "<p>" + comment + "</p>"
    return html
''', 1),

    ('''
def show_search(query):
    return "<h2>Results for: " + query + "</h2>"
''', 1),

    ('''
def greet_user(name):
    return "<p>Welcome, " + name + "!</p>"
''', 1),

    # --- Command Injection (Easy) ---
    ('''
import os
def ping(host):
    os.system("ping -c 1 " + host)
''', 1),

    ('''
import subprocess
def run_cmd(command):
    subprocess.call("ls " + command, shell=True)
''', 1),

    ('''
import os
def list_dir(path):
    os.system("ls -la " + path)
''', 1),

    ('''
import subprocess
def check_host(host):
    result = subprocess.check_output("nslookup " + host, shell=True)
    return result
''', 1),

    ('''
import os
def compress(file):
    os.system("gzip " + file)
''', 1),

    # --- Path Traversal (Easy) ---
    ('''
def read_file(filename):
    f = open("/uploads/" + filename, "r")
    return f.read()
''', 1),

    ('''
import os
def get_file(name):
    path = "/data/" + name
    with open(path) as f:
        return f.read()
''', 1),

    ('''
def load_config(conf):
    f = open("/etc/app/" + conf)
    return f.read()
''', 1),

    ('''
import os
def show_image(img):
    return open("/images/" + img, "rb").read()
''', 1),

    ('''
def download_file(file):
    data = open("/downloads/" + file, "rb").read()
    return data
''', 1),

    # --- Hardcoded Credentials (Easy) ---
    ('''
DB_PASSWORD = "admin123"
def connect_db():
    return psycopg2.connect(password=DB_PASSWORD)
''', 1),

    ('''
API_KEY = "sk-1234567890abcdef"
def call_api():
    return requests.get("https://api.com", headers={"key": API_KEY})
''', 1),

    ('''
def authenticate():
    username = "admin"
    password = "password123"
    return check(username, password)
''', 1),

    ('''
AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
def connect_s3():
    return boto3.client("s3", aws_secret_access_key=AWS_SECRET)
''', 1),

    ('''
TOKEN = "ghp_ABCDEFGHIJKLMNOPqrstuvwxyz123456"
def github_request():
    return requests.get("https://api.github.com/user", headers={"Authorization": f"token {TOKEN}"})
''', 1),

    # --- Insecure Deserialization (Easy) ---
    ('''
import pickle
def load_data(data):
    return pickle.loads(data)
''', 1),

    ('''
import yaml
def parse_config(data):
    return yaml.load(data)
''', 1),

    ('''
import pickle
def restore_user(obj):
    return pickle.loads(obj)
''', 1),

    ('''
import yaml
def read_config(path):
    with open(path) as f:
        return yaml.load(f)
''', 1),

    ('''
import pickle, base64
def decode_session(token):
    return pickle.loads(base64.b64decode(token))
''', 1),

    # --- Weak Crypto (Easy) ---
    ('''
import hashlib
def hash_password(pw):
    return hashlib.md5(pw.encode()).hexdigest()
''', 1),

    ('''
import hashlib
def checksum(data):
    return hashlib.sha1(data).hexdigest()
''', 1),

    ('''
import md5
def verify(data, sig):
    h = md5.new(data).hexdigest()
    return h == sig
''', 1),

    ('''
from hashlib import md5
def gen_hash(text):
    return md5(text.encode('utf-8')).hexdigest()
''', 1),

    ('''
import hashlib
def simple_hash(pw):
    m = hashlib.md5()
    m.update(pw.encode())
    return m.hexdigest()
''', 1),

    # --- Open Redirect (Easy) ---
    ('''
def redirect(url):
    return HttpResponse(status=302, headers={"Location": url})
''', 1),

    ('''
def go_to(url):
    return redirect(url)
''', 1),

    ('''
def external_link(link):
    return HTTPResponse(status=302, Location=link)
''', 1),

    ('''
def move_user(dest):
    raise Response(status=302, headers={"Location": dest})
''', 1),

    ('''
def navigate(url):
    return HttpResponseRedirect(url)
''', 1),

    # --- Log Injection (Easy) ---
    ('''
import logging
def log_user(name):
    logging.info("User logged in: " + name)
''', 1),

    ('''
def log_search(query):
    logger.info("Search query: " + query)
''', 1),

    ('''
def audit_log(action, user):
    log = "ACTION=" + action + " USER=" + user
    write_to_log(log)
''', 1),

    ('''
def record_event(event):
    print("EVENT: " + event, file=open("app.log", "a"))
''', 1),

    ('''
def log_message(msg):
    with open("logs.txt", "a") as f:
        f.write(msg + "\\n")
''', 1),

    # --- SAFE Code (Easy) ---
    ('''
def add(a, b):
    return a + b
''', 0),

    ('''
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
''', 0),

    ('''
def is_even(n):
    return n % 2 == 0
''', 0),

    ('''
def greet(name):
    return f"Hello, {name}!"
''', 0),

    ('''
def maximum(a, b):
    if a > b:
        return a
    return b
''', 0),

    ('''
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
''', 0),

    ('''
def reverse_string(s):
    return s[::-1]
''', 0),

    ('''
def count_words(text):
    return len(text.split())
''', 0),

    ('''
def to_upper(s):
    return s.upper()
''', 0),

    ('''
def sum_list(lst):
    total = 0
    for item in lst:
        total += item
    return total
''', 0),

    ('''
def celsius_to_fahrenheit(c):
    return (c * 9/5) + 32
''', 0),

    ('''
def is_palindrome(s):
    return s == s[::-1]
''', 0),

    ('''
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr
''', 0),

    ('''
def power(base, exp):
    result = 1
    for _ in range(exp):
        result *= base
    return result
''', 0),

    ('''
def abs_value(n):
    if n < 0:
        return -n
    return n
''', 0),

    ('''
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a
''', 0),

    ('''
def flatten(lst):
    result = []
    for item in lst:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result
''', 0),

    ('''
def capitalize_words(s):
    return " ".join(w.capitalize() for w in s.split())
''', 0),

    ('''
def min_value(lst):
    minimum = lst[0]
    for v in lst[1:]:
        if v < minimum:
            minimum = v
    return minimum
''', 0),

    ('''
def is_valid_email(email):
    return "@" in email and "." in email
''', 0),

    ('''
def longest_word(sentence):
    words = sentence.split()
    return max(words, key=len)
''', 0),

    ('''
def range_sum(start, end):
    return sum(range(start, end + 1))
''', 0),

    ('''
def matrix_transpose(m):
    return [list(row) for row in zip(*m)]
''', 0),

    ('''
def string_length(s):
    count = 0
    for _ in s:
        count += 1
    return count
''', 0),

    ('''
def common_elements(a, b):
    return list(set(a) & set(b))
''', 0),

    ('''
def is_anagram(s1, s2):
    return sorted(s1.lower()) == sorted(s2.lower())
''', 0),

    ('''
def decimal_to_binary(n):
    return bin(n)[2:]
''', 0),

    ('''
def vowel_count(s):
    return sum(1 for c in s.lower() if c in "aeiou")
''', 0),

    ('''
def unique_elements(lst):
    seen = set()
    result = []
    for item in lst:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result
''', 0),

    ('''
def prime_check(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True
''', 0),

    ('''
def dict_merge(d1, d2):
    result = d1.copy()
    result.update(d2)
    return result
''', 0),

    ('''
def chunks(lst, size):
    return [lst[i:i+size] for i in range(0, len(lst), size)]
''', 0),

    ('''
def rotate_list(lst, k):
    if not lst:
        return lst
    k = k % len(lst)
    return lst[-k:] + lst[:-k]
''', 0),

    ('''
def count_chars(s):
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    return freq
''', 0),

    ('''
def remove_duplicates(lst):
    return list(dict.fromkeys(lst))
''', 0),

    ('''
def spiral_order(matrix):
    if not matrix:
        return []
    result = []
    while matrix:
        result += matrix.pop(0)
        if matrix and matrix[0]:
            for row in matrix:
                result.append(row.pop())
        if matrix:
            result += matrix.pop()[::-1]
        if matrix and matrix[0]:
            for row in matrix[::-1]:
                result.append(row.pop(0))
    return result
''', 0),

    ('''
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
''', 0),

    ('''
def roman_to_int(s):
    rom = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    result = 0
    for i in range(len(s)):
        if i + 1 < len(s) and rom[s[i]] < rom[s[i+1]]:
            result -= rom[s[i]]
        else:
            result += rom[s[i]]
    return result
''', 0),

    # --- More SAFE code ---
    ('''
def word_frequency(text):
    words = text.lower().split()
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    return freq
''', 0),

    ('''
def collatz(n):
    steps = 0
    while n != 1:
        n = n // 2 if n % 2 == 0 else 3 * n + 1
        steps += 1
    return steps
''', 0),

    ('''
def pascal_triangle(n):
    triangle = [[1]]
    for i in range(1, n):
        prev = triangle[-1]
        row = [1] + [prev[j-1] + prev[j] for j in range(1, len(prev))] + [1]
        triangle.append(row)
    return triangle
''', 0),

    ('''
def caesar_cipher(text, shift):
    result = ""
    for c in text:
        if c.isalpha():
            base = ord('A') if c.isupper() else ord('a')
            result += chr((ord(c) - base + shift) % 26 + base)
        else:
            result += c
    return result
''', 0),

    ('''
def matrix_multiply(a, b):
    rows_a, cols_a = len(a), len(a[0])
    cols_b = len(b[0])
    result = [[0] * cols_b for _ in range(rows_a)]
    for i in range(rows_a):
        for j in range(cols_b):
            for k in range(cols_a):
                result[i][j] += a[i][k] * b[k][j]
    return result
''', 0),

    # --- More Vulnerable (Easy) ---
    ('''
import os
def backup(file):
    os.system("cp " + file + " /backup/")
''', 1),

    ('''
def process_input(user_input):
    cmd = "echo " + user_input
    os.popen(cmd)
''', 1),

    ('''
def load_image(name):
    f = open("static/" + name, "rb")
    return f.read()
''', 1),

    ('''
def query_db(table):
    sql = "SELECT * FROM " + table
    return cursor.execute(sql).fetchall()
''', 1),

    ('''
def render_page(title, body):
    return "<html><head>" + title + "</head><body>" + body + "</body></html>"
''', 1),

    ('''
def fetch_url(url):
    return requests.get(url).text
''', 0),

    ('''
def get_server_ip():
    import socket
    return socket.gethostbyname("localhost")
''', 0),

    ('''
def read_json(path):
    with open(path) as f:
        return json.load(f)
''', 0),

    ('''
def write_log(msg):
    with open("app.log", "a") as f:
        f.write(f"[INFO] {msg}\\n")
''', 0),

    ('''
def send_email(to, subject, body):
    msg = MIMEMultipart()
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body))
    server.sendmail(FROM, to, msg.as_string())
''', 0),
]


# //////////////////////////////////////////////////////////////
# MEDIUM TEST CASES (101-200)
# Subtle vulnerabilities, more context needed


medium_test_cases = [
    # --- SQL Injection with partial sanitization (Medium) ---
    ('''
def get_user_safe(username):
    username = username.replace("'", "''")
    query = "SELECT * FROM users WHERE name = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchone()
''', 1),

    ('''
def search(query):
    q = "SELECT * FROM items WHERE name LIKE '%" + query + "%'"
    return db.execute(q).fetchall()
''', 1),

    ('''
def get_orders(user_id, sort):
    sql = f"SELECT * FROM orders WHERE uid={user_id} ORDER BY {sort}"
    return db.execute(sql).fetchall()
''', 1),

    ('''
def login_check(user, pw):
    q = "SELECT id FROM users WHERE name=? AND pass=?"
    return db.execute(q, [user, pw]).fetchone()
''', 0),

    ('''
def fetch_items(category, limit):
    query = f"SELECT * FROM items WHERE cat='{category}' LIMIT {int(limit)}"
    return db.execute(query).fetchall()
''', 1),

    # --- XXE (Medium) ---
    ('''
import xml.etree.ElementTree as ET
def parse_xml(data):
    tree = ET.fromstring(data)
    return tree.find("name").text
''', 0),

    ('''
import xml.sax
def parse SAX(data):
    parser = xml.sax.make_parser()
    parser.parseString(data)
''', 1),

    ('''
from lxml import etree
def parse_doc(xml_data):
    doc = etree.fromstring(xml_data)
    return doc.text
''', 1),

    ('''
import defusedxml.ElementTree as ET
def safe_parse(data):
    return ET.fromstring(data)
''', 0),

    ('''
import xml.etree.ElementTree as ET
def process_xml(data):
    root = ET.fromstring(data)
    return [child.text for child in root]
''', 0),

    # --- SSRF (Medium) ---
    ('''
def fetch_resource(url):
    if url.startswith("http"):
        return requests.get(url).content
    return None
''', 1),

    ('''
def proxy_request(url):
    allowed = ["example.com", "api.trusted.com"]
    from urllib.parse import urlparse
    host = urlparse(url).hostname
    if host in allowed:
        return requests.get(url).text
    raise ValueError("Not allowed")
''', 0),

    ('''
def get_webpage(url):
    resp = requests.get(url, timeout=5)
    return resp.text
''', 1),

    ('''
def download_image(url):
    import urllib.request
    return urllib.request.urlopen(url).read()
''', 1),

    ('''
def webhook(url):
    requests.post(url, json={"status": "ok"})
''', 1),

    # --- IDOR (Medium) ---
    ('''
def get_user_profile(user_id):
    profile = db.execute("SELECT * FROM profiles WHERE id=?", [user_id]).fetchone()
    return profile
''', 0),

    ('''
def view_order(order_id):
    return db.execute("SELECT * FROM orders WHERE id=?", [order_id]).fetchone()
''', 0),

    ('''
def get_invoice(inv_id):
    return db.execute("SELECT * FROM invoices WHERE id=" + str(inv_id)).fetchone()
''', 1),

    ('''
def download_report(report_id, user):
    path = f"/reports/{user}/{report_id}.pdf"
    return send_file(path)
''', 0),

    ('''
def view_document(doc_id):
    doc = db.execute("SELECT * FROM docs WHERE id=?", [doc_id]).fetchone()
    return doc
''', 0),

    # --- Insecure Random (Medium) ---
    ('''
import random
def generate_token():
    return ''.join(random.choice("abcdef0123456789") for _ in range(32))
''', 1),

    ('''
import random
def session_id():
    return str(random.randint(100000, 999999))
''', 1),

    ('''
import secrets
def gen_secret():
    return secrets.token_hex(32)
''', 0),

    ('''
import random
def otp():
    return str(random.randint(100000, 999999))
''', 1),

    ('''
import os
def api_key():
    return os.urandom(32).hex()
''', 0),

    # --- Race Condition (Medium) ---
    ('''
def transfer(from_acc, to_acc, amount):
    bal = db.execute("SELECT bal FROM accounts WHERE id=?", [from_acc]).fetchone()[0]
    if bal >= amount:
        db.execute("UPDATE accounts SET bal=bal-? WHERE id=?", [amount, from_acc])
        db.execute("UPDATE accounts SET bal=bal+? WHERE id=?", [amount, to_acc])
        db.commit()
''', 1),

    ('''
def increment_counter(item_id):
    val = cache.get(item_id)
    cache.set(item_id, val + 1)
''', 1),

    ('''
def buy_item(user_id, item_id):
    stock = db.execute("SELECT stock FROM items WHERE id=?", [item_id]).fetchone()[0]
    if stock > 0:
        db.execute("UPDATE items SET stock=stock-1 WHERE id=?", [item_id])
        db.execute("INSERT INTO purchases (user, item) VALUES (?, ?)", [user_id, item_id])
        db.commit()
''', 1),

    ('''
def withdraw(account, amount):
    with db.transaction():
        bal = db.get_balance(account)
        if bal >= amount:
            db.deduct(account, amount)
''', 0),

    ('''
def reserve_seat(flight_id, seat):
    current = db.execute("SELECT count(*) FROM reservations WHERE flight=?", [flight_id]).fetchone()[0]
    capacity = db.execute("SELECT capacity FROM flights WHERE id=?", [flight_id]).fetchone()[0]
    if current < capacity:
        db.execute("INSERT INTO reservations (flight, seat) VALUES (?, ?)", [flight_id, seat])
        db.commit()
''', 1),

    # --- Information Disclosure (Medium) ---
    ('''
def error_handler(e):
    return f"Error: {str(e)}\nTraceback: {traceback.format_exc()}"
''', 1),

    ('''
def debug_info(request):
    return JsonResponse({
        "path": request.path,
        "method": request.method,
        "headers": dict(request.headers),
        "settings": dict(app.config)
    })
''', 1),

    ('''
@app.route("/health")
def health():
    return jsonify({"status": "ok", "db": db.status, "version": "1.0"})
''', 0),

    ('''
def get_version():
    import os
    return jsonify({
        "version": "2.1",
        "env": os.environ.get("FLASK_ENV"),
        "debug": os.environ.get("DEBUG")
    })
''', 1),

    ('''
def server_info():
    return jsonify({"status": "running", "uptime": get_uptime()})
''', 0),

    # --- CORS Misconfiguration (Medium) ---
    ('''
@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response
''', 1),

    ('''
@app.route("/api/data")
@cross_origin(origin="*")
def data():
    return jsonify(get_data())
''', 1),

    ('''
@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"] = "https://myapp.com"
    return response
''', 0),

    ('''
def setup_cors(app):
    CORS(app, origins=["https://trusted.com"])
''', 0),

    ('''
@app.after_request
def allow_all(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response
''', 1),

    # --- Unsafe Eval (Medium) ---
    ('''
def calculate(expression):
    return eval(expression)
''', 1),

    ('''
def process_data(formula):
    result = eval(formula, {"__builtins__": {}})
    return result
''', 1),

    ('''
def safe_calc(expr):
    import ast
    tree = ast.parse(expr, mode='eval')
    return eval(compile(tree, '<string>', 'eval'))
''', 0),

    ('''
def run_code(code_string):
    exec(code_string)
''', 1),

    ('''
def dynamic_import(module_name):
    import importlib
    return importlib.import_module(module_name)
''', 1),

    # --- Prototype Pollution (Medium) ---
    ('''
import json
def merge(target, source):
    for key in source:
        if isinstance(source[key], dict):
            merge(target[key], source[key])
        else:
            target[key] = source[key]
    return target
''', 1),

    ('''
def clone(obj):
    import copy
    return copy.deepcopy(obj)
''', 0),

    ('''
def deep_extend(target, source):
    for k, v in source.items():
        if isinstance(v, dict):
            target.setdefault(k, {})
            deep_extend(target[k], v)
        else:
            target[k] = v
    return target
''', 1),

    ('''
def merge_configs(defaults, custom):
    result = defaults.copy()
    result.update(custom)
    return result
''', 0),

    ('''
def set_nested(data, path, value):
    keys = path.split(".")
    current = data
    for key in keys[:-1]:
        current = current.setdefault(key, {})
    current[keys[-1]] = value
    return data
''', 1),

    # --- Template Injection (Medium) ---
    ('''
from jinja2 import Template
def render(tpl, **kwargs):
    t = Template(tpl)
    return t.render(**kwargs)
''', 1),

    ('''
from jinja2 import Environment
def render_template(template_str, data):
    env = Environment()
    t = env.from_string(template_str)
    return t.render(data)
''', 1),

    ('''
from jinja2 import Environment, SandboxedEnvironment
def render_safe(tpl, **kwargs):
    env = SandboxedEnvironment()
    t = env.from_string(tpl)
    return t.render(**kwargs)
''', 0),

    ('''
def format_html(template, **values):
    return template % values
''', 1),

    ('''
from string import Template
def format_msg(tpl, **values):
    return Template(tpl).safe_substitute(**values)
''', 0),

    # --- HTTP Header Injection (Medium) ---
    ('''
def redirect_user(url):
    response = make_response("", 302)
    response.headers["Location"] = url
    return response
''', 1),

    ('''
def set_cookie(response, name, value):
    response.set_cookie(name, value)
    return response
''', 0),

    ('''
def download(filename):
    response = make_response()
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response
''', 1),

    ('''
def forward_header(request, name):
    value = request.headers.get(name)
    return value
''', 1),

    ('''
def custom_header(response, name, val):
    response.headers[name] = val
    return response
''', 1),

    # --- Mass Assignment (Medium) ---
    ('''
@app.route("/update", methods=["POST"])
def update():
    data = request.form.to_dict()
    user.update(data)
    db.commit()
    return "OK"
''', 1),

    ('''
@app.route("/profile", methods=["PUT"])
def update_profile():
    user.name = request.json.get("name", user.name)
    user.email = request.json.get("email", user.email)
    db.commit()
    return jsonify(user.to_dict())
''', 0),

    ('''
@app.route("/register", methods=["POST"])
def register():
    fields = request.json
    db.execute("INSERT INTO users VALUES(?, ?, ?)", [fields["name"], fields["email"], fields["pass"]])
    return "Created"
''', 1),

    ('''
def update_user(user_id):
    allowed = ["name", "email", "bio"]
    data = {k: v for k, v in request.json.items() if k in allowed}
    db.execute("UPDATE users SET ? WHERE id=?", [data, user_id])
''', 0),

    ('''
def create_post():
    post = Post(**request.json)
    db.add(post)
    db.commit()
    return "Created"
''', 1),

    # --- SAFE Medium Code ---
    ('''
import hashlib, os
def hash_password(password):
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return salt + key
''', 0),

    ('''
import secrets
def generate_token():
    return secrets.token_urlsafe(32)
''', 0),

    ('''
from flask_limiter import Limiter
limiter = Limiter(app, default_limits=["100 per hour"])
''', 0),

    ('''
import re
def sanitize_input(text):
    return re.sub(r'[^a-zA-Z0-9_]', '', text)
''', 0),

    ('''
def read_config(path):
    import json
    with open(path) as f:
        config = json.load(f)
    return {k: v for k, v in config.items() if k in ALLOWED_KEYS}
''', 0),

    ('''
import subprocess
def safe_command(cmd):
    args = shlex.split(cmd)
    return subprocess.run(args, capture_output=True, text=True)
''', 0),

    ('''
def secure_filename(filename):
    import re
    name = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    return name
''', 0),

    ('''
@app.before_request
def check_auth():
    if not session.get("user_id"):
        return redirect("/login")
''', 0),

    ('''
def validate_email(email):
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None
''', 0),

    ('''
def safe_int(value, default=0):
    try:
        return int(value)
    except (ValueError, TypeError):
        return default
''', 0),

    ('''
def escape_html(text):
    import html
    return html.escape(text)
''', 0),

    ('''
def rate_limit_key():
    from flask import request
    return request.remote_addr
''', 0),

    ('''
def check_file_type(filename):
    allowed = {'.jpg', '.png', '.gif', '.pdf'}
    ext = os.path.splitext(filename)[1].lower()
    return ext in allowed
''', 0),

    ('''
import logging
secure_log = logging.getLogger("secure")
secure_log.setLevel(logging.WARNING)
''', 0),

    ('''
def get_env(key, default=None):
    import os
    return os.environ.get(key, default)
''', 0),

    ('''
from functools import wraps
def require_role(role):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if current_user.role != role:
                abort(403)
            return f(*args, **kwargs)
        return wrapper
    return decorator
''', 0),

    ('''
def load_extensions(app):
    import importlib
    for ext_name in app.config.get("EXTENSIONS", []):
        mod = importlib.import_module(f"extensions.{ext_name}")
        mod.init_app(app)
''', 0),

    ('''
def check_password_strength(password):
    if len(password) < 8:
        return False
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    return has_upper and has_lower and has_digit
''', 0),

    ('''
from typing import Optional
def process(value: Optional[int] = None) -> int:
    return value if value is not None else 0
''', 0),

    ('''
def safely_remove(path):
    import os
    if os.path.exists(path) and os.path.isfile(path):
        os.remove(path)
        return True
    return False
''', 0),
]


# //////////////////////////////////////////////////////////////
# COMPLEX TEST CASES (201-300)
# Multiple vulnerabilities, edge cases,
# mixed safe/vulnerable patterns


complex_test_cases = [
    # --- Complex SQL Injection with ORM bypass ---
    ('''
def advanced_search(user, category, sort_by):
    base = "SELECT * FROM products"
    filters = []
    if user:
        filters.append("owner = '" + user + "'")
    if category:
        filters.append("cat = '" + category + "'")
    where = " AND ".join(filters) if filters else "1=1"
    query = f"{base} WHERE {where} ORDER BY {sort_by}"
    return db.execute(query).fetchall()
''', 1),

    ('''
def complex_query(filters):
    conditions = []
    for field, value in filters.items():
        if field in ["name", "email", "status"]:
            conditions.append(f"{field} = '{value}'")
    sql = "SELECT * FROM users WHERE " + " AND ".join(conditions)
    return db.execute(sql).fetchall()
''', 1),

    ('''
def safe_search(params):
    allowed_fields = {"name": "text", "age": "int", "city": "text"}
    conditions = []
    values = []
    for k, v in params.items():
        if k in allowed_fields:
            conditions.append(f"{k} = %s")
            values.append(v)
    if not conditions:
        return []
    sql = "SELECT * FROM users WHERE " + " AND ".join(conditions)
    return db.execute(sql, values).fetchall()
''', 0),

    ('''
def dynamic_filter(table, col, val):
    query = f"SELECT * FROM {table} WHERE {col} = ?"
    return db.execute(query, [val]).fetchall()
''', 1),

    ('''
def aggregate_report(group_by, having):
    sql = f"SELECT {group_by}, count(*) FROM sales GROUP BY {group_by} HAVING {having}"
    return db.execute(sql).fetchall()
''', 1),

    # --- Complex Command Injection ---
    ('''
import subprocess
def run_analysis(tool, input_file, options=""):
    cmd = f"{tool} {input_file} {options}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout
''', 1),

    ('''
import subprocess, shlex
def safe_run(tool, args):
    cmd = [tool] + shlex.split(args)
    return subprocess.run(cmd, capture_output=True, text=True)
''', 0),

    ('''
import os
def process_file(filename, fmt):
    cmd = f"convert {filename} -format {fmt} output.{fmt}"
    os.system(cmd)
''', 1),

    ('''
def analyze_data(source, method):
    import subprocess
    cmd = ["python3", "-m", "analyzer", f"--method={method}", source]
    return subprocess.run(cmd, capture_output=True, text=True).stdout
''', 0),

    ('''
def batch_process(files, action):
    for f in files:
        os.system(f"{action} {f}")
''', 1),

    # --- Complex Deserialization ---
    ('''
import pickle, base64
def decode_token(token):
    data = base64.b64decode(token)
    return pickle.loads(data)
''', 1),

    ('''
import json
def decode_session(token):
    import base64
    data = base64.b64decode(token)
    return json.loads(data)
''', 0),

    ('''
import json
def import_data(file_path):
    with open(file_path) as f:
        data = json.load(f)
    return [Item(**item) for item in data["items"]]
''', 0),

    ('''
import pickle
def restore_backup(backup_data):
    obj = pickle.loads(backup_data)
    return obj
''', 1),

    ('''
import json, zlib, base64
def decode_payload(payload):
    compressed = base64.b64decode(payload)
    data = zlib.decompress(compressed)
    return json.loads(data)
''', 0),

    # --- Complex SSRF ---
    ('''
def fetch_api(endpoint):
    base_url = request.json.get("base_url", "https://api.internal.com")
    return requests.get(f"{base_url}/{endpoint}").json()
''', 1),

    ('''
def proxy(url):
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.scheme in ("http", "https") and parsed.hostname:
        import socket
        ip = socket.gethostbyname(parsed.hostname)
        if ip.startswith("127.") or ip.startswith("10.") or ip.startswith("192.168."):
            raise ValueError("Internal access denied")
        return requests.get(url).text
    raise ValueError("Invalid URL")
''', 0),

    ('''
def webhook_handler():
    url = request.json["url"]
    data = request.json["payload"]
    requests.post(url, json=data)
    return "Sent"
''', 1),

    ('''
def mirror_image(img_url):
    resp = requests.get(img_url)
    content_type = resp.headers.get("Content-Type", "")
    if "image" in content_type:
        return resp.content
    return None
''', 1),

    ('''
def safe_redirect(url):
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.netloc and parsed.netloc != "myapp.com":
        raise ValueError("External URL not allowed")
    return redirect(url)
''', 0),

    # --- Complex Race Conditions ---
    ('''
def concurrent_update(doc_id, user_id):
    doc = db.execute("SELECT * FROM docs WHERE id=?", [doc_id]).fetchone()
    editors = json.loads(doc["editors"])
    if user_id not in editors:
        editors.append(user_id)
        db.execute("UPDATE docs SET editors=? WHERE id=?", [json.dumps(editors), doc_id])
        db.commit()
''', 1),

    ('''
def atomic_transfer(from_acc, to_acc, amount):
    with db.atomic():
        db.execute("UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?", [amount, from_acc, amount])
        db.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", [amount, to_acc])
''', 0),

    ('''
def inventory_check(item_id, qty):
    stock = db.execute("SELECT qty FROM inventory WHERE id=?", [item_id]).fetchone()[0]
    if stock >= qty:
        db.execute("UPDATE inventory SET qty = qty - ? WHERE id = ?", [qty, item_id])
        db.commit()
        return True
    return False
''', 1),

    ('''
def double_submit_check(user_id, form_id):
    key = f"form:{user_id}:{form_id}"
    if cache.get(key):
        return False
    cache.set(key, "1", ex=300)
    return True
''', 0),

    ('''
def concurrent_login(user_id, token):
    active = db.execute("SELECT token FROM sessions WHERE user_id=?", [user_id]).fetchone()
    if active:
        db.execute("DELETE FROM sessions WHERE user_id=?", [user_id])
    db.execute("INSERT INTO sessions (user_id, token) VALUES (?, ?)", [user_id, token])
    db.commit()
''', 1),

    # --- Complex XSS with partial escaping ---
    ('''
def render_comment(comment, user):
    safe_comment = escape_html(comment)
    return f"<div class='comment'><b>{user}:</b> {safe_comment}</div>"
''', 1),

    ('''
def render_user_content(content):
    import bleach
    allowed = bleach.ALLOWED_TAGS + ['p', 'b', 'i', 'u', 'a']
    return bleach.clean(content, tags=allowed, strip=True)
''', 0),

    ('''
def build_page(title, body):
    return f"<html><head><title>{title}</title></head><body>{body}</body></html>"
''', 1),

    ('''
def safe_display(data):
    import markupsafe
    return markupsafe.escape(data)
''', 0),

    ('''
def render_with_template(template_name, **kwargs):
    from jinja2 import Environment, FileSystemLoader
    env = Environment(loader=FileSystemLoader("templates"))
    t = env.get_template(template_name)
    return t.render(**kwargs)
''', 0),

    # --- Complex Path Traversal ---
    ('''
def serve_file(filename):
    base = "/var/www/uploads"
    filepath = os.path.join(base, filename)
    if os.path.isfile(filepath):
        with open(filepath) as f:
            return f.read()
    return "Not found"
''', 1),

    ('''
def get_file(name):
    base = os.path.abspath("/data/files")
    filepath = os.path.abspath(os.path.join("/data/files", name))
    if not filepath.startswith(base):
        return "Access denied"
    with open(filepath) as f:
        return f.read()
''', 0),

    ('''
def download(resource):
    path = "/storage/" + resource
    return send_file(path)
''', 1),

    ('''
def safe_read(filename):
    from pathlib import Path
    base = Path("/uploads").resolve()
    target = (base / filename).resolve()
    if not str(target).startswith(str(base)):
        raise ValueError("Invalid path")
    return target.read_text()
''', 0),

    ('''
def load_resource(name):
    import os
    path = os.path.join("resources", name)
    return open(path).read()
''', 1),

    # --- Complex Insecure Direct Object References ---
    ('''
@app.route("/api/invoice/<int:invoice_id>")
def get_invoice(invoice_id):
    inv = db.execute("SELECT * FROM invoices WHERE id=?", [invoice_id]).fetchone()
    return jsonify(inv)
''', 1),

    ('''
@app.route("/api/invoice/<int:invoice_id>")
@require_auth
def get_invoice(invoice_id):
    inv = db.execute("SELECT * FROM invoices WHERE id=? AND user_id=?", [invoice_id, current_user.id]).fetchone()
    if not inv:
        abort(404)
    return jsonify(inv)
''', 0),

    ('''
def view_message(msg_id):
    msg = db.execute("SELECT * FROM messages WHERE id=?", [msg_id]).fetchone()
    return jsonify(msg)
''', 1),

    ('''
@app.route("/api/doc/<doc_id>")
@require_auth
def view_doc(doc_id):
    doc = db.execute("SELECT * FROM docs WHERE id=? AND owner=?", [doc_id, current_user.id]).fetchone()
    if not doc:
        abort(403)
    return jsonify(doc)
''', 0),

    ('''
def access_file(file_id):
    f = db.execute("SELECT * FROM files WHERE id=?", [file_id]).fetchone()
    return send_file(f["path"])
''', 1),

    # --- Complex Authentication Issues ---
    ('''
@app.route("/login", methods=["POST"])
def login():
    username = request.form["username"]
    password = request.form["password"]
    user = db.execute("SELECT * FROM users WHERE name=?", [username]).fetchone()
    if user and user["pass"] == password:
        session["user_id"] = user["id"]
        return redirect("/dashboard")
    return "Login failed"
''', 1),

    ('''
@app.route("/login", methods=["POST"])
def login():
    username = request.form["username"]
    password = request.form["password"]
    user = db.execute("SELECT * FROM users WHERE name=?", [username]).fetchone()
    if user and bcrypt.checkpw(password.encode(), user["pass_hash"]):
        session["user_id"] = user["id"]
        session.permanent = True
        return redirect("/dashboard")
    return "Login failed"
''', 0),

    ('''
def auto_login(user_id):
    session["user_id"] = user_id
    return redirect("/admin")
''', 1),

    ('''
def magic_link(token):
    data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    user = db.execute("SELECT * FROM users WHERE id=?", [data["user_id"]]).fetchone()
    if user:
        session["user_id"] = user["id"]
        return redirect("/dashboard")
    return "Invalid token"
''', 0),

    ('''
def check_auth():
    if "token" in request.headers:
        token = request.headers["token"]
        session["user_id"] = db.execute("SELECT user_id FROM tokens WHERE token=?", [token]).fetchone()[0]
''', 1),

    # --- Complex Cryptographic Issues ---
    ('''
import hashlib
def verify_integrity(data, expected):
    h = hashlib.sha256(data).hexdigest()
    return hmac.compare_digest(h, expected)
''', 0),

    ('''
import hashlib
def sign_data(data):
    return hashlib.md5(data.encode()).hexdigest()
''', 1),

    ('''
import hmac, hashlib
def create_signature(data):
    return hmac.new(SECRET.encode(), data.encode(), hashlib.sha256).hexdigest()
''', 0),

    ('''
def encrypt_password(pw):
    import base64
    return base64.b64encode(pw.encode()).decode()
''', 1),

    ('''
from cryptography.fernet import Fernet
def encrypt(data, key):
    f = Fernet(key)
    return f.encrypt(data.encode())
''', 0),

    # --- Complex Input Validation ---
    ('''
def process_integer(value):
    return int(value)
''', 1),

    ('''
def safe_integer(value):
    try:
        v = int(value)
        if v < 0 or v > 2**31:
            raise ValueError("Out of range")
        return v
    except (ValueError, TypeError):
        return None
''', 0),

    ('''
def parse_filename(name):
    import os
    return os.path.basename(name)
''', 0),

    ('''
def validate_url(url):
    if url.startswith("javascript:"):
        return False
    return True
''', 1),

    ('''
def check_input(value):
    import re
    return bool(re.match(r'^[a-zA-Z0-9_]{3,20}$', value))
''', 0),

    # --- Mixed Complex Patterns ---
    ('''
@app.route("/api/search")
def search():
    q = request.args.get("q", "")
    category = request.args.get("cat", "")
    sort = request.args.get("sort", "name")
    sql = f"SELECT * FROM products WHERE name LIKE '%{q}%' AND cat='{category}' ORDER BY {sort}"
    results = db.execute(sql).fetchall()
    return jsonify(results)
''', 1),

    ('''
@app.route("/api/search")
def search():
    q = request.args.get("q", "")
    category = request.args.get("cat", "")
    allowed_sorts = {"name", "price", "date"}
    sort = request.args.get("sort", "name")
    if sort not in allowed_sorts:
        sort = "name"
    results = db.execute(
        "SELECT * FROM products WHERE name LIKE ? AND cat=? ORDER BY " + sort,
        [f"%{q}%", category]
    ).fetchall()
    return jsonify(results)
''', 0),

    ('''
def admin_action(action, target):
    import subprocess
    os.system(f"admin_tool --action={action} --target={target}")
''', 1),

    ('''
def admin_action(action, target):
    import subprocess, shlex
    allowed_actions = {"enable", "disable", "restart"}
    if action not in allowed_actions:
        raise ValueError("Invalid action")
    subprocess.run(["admin_tool", f"--action={action}", f"--target={shlex.quote(target)}"])
''', 0),

    ('''
def process_upload(file):
    filename = file.filename
    path = f"/uploads/{filename}"
    file.save(path)
    os.system(f"scan_file {path}")
''', 1),

    ('''
def process_upload(file):
    import uuid
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in {".jpg", ".png", ".pdf"}:
        raise ValueError("Invalid file type")
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join("/uploads", filename)
    file.save(path)
    return filename
''', 0),

    ('''
def load_module(name):
    import importlib
    return importlib.import_module(name)
''', 1),

    ('''
def safe_import(name):
    import importlib
    allowed = {"json", "csv", "math", "datetime", "collections"}
    if name in allowed:
        return importlib.import_module(name)
    raise ImportError("Module not allowed")
''', 0),

    ('''
def render_page(data):
    import json
    template = data.get("template", "default")
    content = data.get("content", "")
    return f"<div class='{template}'>{content}</div>"
''', 1),

    ('''
def render_page(data):
    import html
    template = html.escape(data.get("template", "default"))
    content = html.escape(data.get("content", ""))
    return f"<div class='{template}'>{content}</div>"
''', 0),

    # --- More Complex Patterns ---
    ('''
def create_user():
    data = request.json
    db.execute("INSERT INTO users VALUES(?, ?, ?, ?)", [data["name"], data["email"], data["role"], data["admin"]])
    db.commit()
''', 1),

    ('''
def create_user():
    data = request.json
    allowed = {"name", "email"}
    fields = {k: v for k, v in data.items() if k in allowed}
    db.execute("INSERT INTO users (name, email) VALUES (?, ?)", [fields["name"], fields["email"]])
    db.commit()
''', 0),

    ('''
def backup_all():
    import subprocess
    db_url = os.environ.get("DATABASE_URL")
    subprocess.run(f"pg_dump {db_url} > backup.sql", shell=True)
''', 1),

    ('''
def backup_all():
    import subprocess
    db_url = os.environ.get("DATABASE_URL")
    subprocess.run(["pg_dump", db_url, "-f", "backup.sql"])
''', 0),

    ('''
def email_user(user_id):
    user = db.execute("SELECT * FROM users WHERE id=?", [user_id]).fetchone()
    msg = f"<h1>Hello {user['name']}</h1><p>Your balance: ${user['balance']}</p>"
    send_email(user["email"], "Account Info", msg)
''', 1),

    ('''
def email_user(user_id):
    import html
    user = db.execute("SELECT * FROM users WHERE id=?", [user_id]).fetchone()
    safe_name = html.escape(user["name"])
    msg = f"<h1>Hello {safe_name}</h1>"
    send_email(user["email"], "Account Info", msg)
''', 0),

    ('''
def handle_webhook():
    payload = request.json
    url = payload["callback_url"]
    data = payload["data"]
    requests.post(url, json=data)
    return "OK"
''', 1),

    ('''
def handle_webhook():
    payload = request.json
    allowed_domains = {"api.myapp.com", "hooks.myapp.com"}
    from urllib.parse import urlparse
    url = payload["callback_url"]
    domain = urlparse(url).hostname
    if domain not in allowed_domains:
        raise ValueError("Domain not allowed")
    requests.post(url, json=payload["data"])
    return "OK"
''', 0),

    # --- Final SAFE complex patterns ---
    ('''
from werkzeug.utils import secure_filename
def upload(file):
    filename = secure_filename(file.filename)
    path = os.path.join("/uploads", filename)
    file.save(path)
    return filename
''', 0),

    ('''
@app.route("/api/<int:id>", methods=["DELETE"])
@require_auth
@require_role("admin")
def delete_resource(id):
    resource = db.execute("SELECT * FROM resources WHERE id=? AND owner=?", [id, current_user.id]).fetchone()
    if not resource:
        abort(404)
    db.execute("DELETE FROM resources WHERE id=?", [id])
    db.commit()
    return "Deleted"
''', 0),

    ('''
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)
''', 0),

    ('''
@app.route("/transfer", methods=["POST"])
@require_auth
def transfer():
    to_user = request.form["to"]
    amount = safe_int(request.form["amount"])
    if amount is None or amount <= 0:
        return "Invalid amount", 400
    with db.atomic():
        sender = db.execute("SELECT balance FROM accounts WHERE user_id=?", [current_user.id]).fetchone()
        if sender["balance"] < amount:
            return "Insufficient funds", 400
        db.execute("UPDATE accounts SET balance = balance - ? WHERE user_id=?", [amount, current_user.id])
        db.execute("UPDATE accounts SET balance = balance + ? WHERE user_id=?", [amount, to_user])
    return "Success"
''', 0),

    ('''
from flask_talisman import Talisman
talisman = Talisman(app, force_https=True, strict_transport_security=True)
''', 0),

    ('''
@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
''', 0),

    ('''
def safe_eval(expr):
    import ast
    allowed_nodes = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Num,
                     ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow)
    tree = ast.parse(expr, mode='eval')
    for node in ast.walk(tree):
        if not isinstance(node, allowed_nodes):
            raise ValueError(f"Disallowed node type: {type(node).__name__}")
    return eval(compile(tree, '<expr>', 'eval'))
''', 0),

    ('''
from functools import lru_cache
@lru_cache(maxsize=128)
def expensive_computation(n):
    return sum(i * i for i in range(n))
''', 0),

    ('''
import logging
audit_log = logging.getLogger("audit")
audit_log.setLevel(logging.INFO)
handler = logging.FileHandler("audit.log")
audit_log.addHandler(handler)
''', 0),

    ('''
def create_api_key():
    import secrets
    return secrets.token_urlsafe(48)
''', 0),
]


# //////////////////////////////////////////////////////////////
# RUN EVALUATION


def predict_code(code_text):
    """Tokenize and predict a single code snippet."""
    inputs = tokenizer(
        code_text,
        truncation=True,
        max_length=512,
        padding="max_length",
        return_tensors="pt"
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=1)
    pred = torch.argmax(probs, dim=1).item()
    confidence = probs[0][pred].item()
    return pred, confidence

def evaluate_dataset(test_cases, dataset_name):
    """Evaluate model on a set of test cases."""
    y_true = []
    y_pred = []
    confidences = []
    misclassified = []

    for i, (code, label) in enumerate(test_cases):
        pred, conf = predict_code(code)
        y_true.append(label)
        y_pred.append(pred)
        confidences.append(conf)

        if pred != label:
            misclassified.append({
                "index": i + 1,
                "actual": "VULNERABLE" if label == 1 else "SAFE",
                "predicted": "VULNERABLE" if pred == 1 else "SAFE",
                "confidence": f"{conf:.4f}",
                "code_preview": code.strip()[:80] + "..."
            })

    # Metrics
    acc = accuracy_score(y_true, y_pred)
    avg_conf = np.mean(confidences)

    print(f"\n{'='*60}")
    print(f"  {dataset_name}")
    print(f"{'='*60}")
    print(f"  Total Cases     : {len(test_cases)}")
    print(f"  Accuracy        : {acc*100:.2f}%")
    print(f"  Avg Confidence  : {avg_conf:.4f}")
    print(f"\n  Classification Report:")
    print(classification_report(
        y_true, y_pred,
        target_names=["SAFE (0)", "VULNERABLE (1)"],
        digits=4
    ))
    print(f"  Confusion Matrix:")
    cm = confusion_matrix(y_true, y_pred)
    print(f"    {'':>20} Predicted SAFE  Predicted VULN")
    print(f"    {'Actual SAFE':>20}  {cm[0][0]:>10}      {cm[0][1]:>10}")
    print(f"    {'Actual VULN':>20}  {cm[1][0]:>10}      {cm[1][1]:>10}")

    if misclassified:
        print(f"\n  Misclassified ({len(misclassified)}):")
        for m in misclassified[:10]:
            print(f"    Case #{m['index']}: Actual={m['actual']}, Pred={m['predicted']}, Conf={m['confidence']}")
            print(f"      Code: {m['code_preview']}")
    else:
        print(f"\n  All cases classified correctly!")

    return acc, avg_conf, len(misclassified)


# MAIN EXECUTION

print("="*60)
print("  VULNERABILITY DETECTION MODEL - 300 TEST CASES")
print("="*60)

# Run evaluations
acc_easy, conf_easy, misc_easy = evaluate_dataset(easy_test_cases, "EASY TEST CASES (1-100)")
acc_med, conf_med, misc_med = evaluate_dataset(medium_test_cases, "MEDIUM TEST CASES (101-200)")
acc_complex, conf_complex, misc_complex = evaluate_dataset(complex_test_cases, "COMPLEX TEST CASES (201-300)")

# Overall Summary
all_cases = easy_test_cases + medium_test_cases + compl... (1 KB left)