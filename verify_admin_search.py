"""
Quick check for search, offset, and limit on GET /admin/farmers
"""

import urllib.request
import urllib.parse
import json
import time
import subprocess
import sys
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

ADMIN_EMAIL = "admin-test@example.test"
BASE = "http://127.0.0.1:8000"
server = None

def req(method, path, data=None, headers=None):
    r = urllib.request.Request(f"{BASE}{path}", method=method)
    if headers:
        for k, v in headers.items():
            r.add_header(k, v)
    if data:
        r.add_header("Content-Type", "application/json")
        data = json.dumps(data).encode()
    try:
        with urllib.request.urlopen(r, data=data) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 0, str(e)

try:
    env = os.environ.copy()
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    time.sleep(4)

    # Login as Admin
    s2, r2 = req("POST", "/admin/login", data={"email": ADMIN_EMAIL, "password": "adminpass"})
    admin_token = r2.get("access_token")
    if not admin_token:
        print("Failed to get admin token:", r2)
        sys.exit(1)

    print("\n" + "="*60)
    print("TEST: GET /admin/farmers?search=sahil")
    s_search, r_search = req("GET", "/admin/farmers?search=sahil", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"Status: {s_search}")
    print(f"Response: {json.dumps(r_search, indent=2)}")
    
    print("\n" + "="*60)
    print("TEST: GET /admin/farmers?offset=0&limit=1")
    s_limit, r_limit = req("GET", "/admin/farmers?offset=0&limit=1", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"Status: {s_limit}")
    print(f"Response: {json.dumps(r_limit, indent=2)}")
    print(f"Number of results returned: {len(r_limit)}")

finally:
    if server:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
