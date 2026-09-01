import urllib.request
import urllib.error
import json
import time
import subprocess
import sys
import os

# Set up DB connection to verify rows
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
from app.core.db import SessionLocal
from app.models.user import User
from app.models.farm import Farm

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL environment variable missing")
    sys.exit(1)

# Start server
env = os.environ.copy()
server = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], cwd="backend", env=env)
time.sleep(4) # Wait for server to start

def make_request(method, url, data=None, headers=None):
    req = urllib.request.Request(f"http://127.0.0.1:8000{url}", method=method)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    if data:
        req.add_header("Content-Type", "application/json")
        data = json.dumps(data).encode("utf-8")
    try:
        with urllib.request.urlopen(req, data=data) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 500, str(e)

try:
    # Cleanup any existing test data
    db = SessionLocal()
    test_email = "test-farmer@example.test"
    existing_user = db.query(User).filter(User.email == test_email).first()
    if existing_user:
        db.query(Farm).filter(Farm.user_id == existing_user.user_id).delete()
        db.delete(existing_user)
        db.commit()

    print("--- 1. POST /auth/signup ---")
    status, resp = make_request("POST", "/auth/signup", data={
        "name": "Test Farmer",
        "email": test_email,
        "password": "securepassword123",
        "farm_name": "Test Farm",
        "village": "Test Village"
    })
    print(f"Status: {status}\nResponse: {json.dumps(resp, indent=2)}")

    print("\n--- 2. POST /auth/login ---")
    status, resp2 = make_request("POST", "/auth/login", data={
        "email": test_email,
        "password": "securepassword123"
    })
    print(f"Status: {status}\nResponse: {json.dumps(resp2, indent=2)}")
    access_token = resp2.get("access_token")
    refresh_token = resp2.get("refresh_token")

    print("\n--- 3. GET /auth/me ---")
    status, resp3 = make_request("GET", "/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    print(f"Status: {status}\nResponse: {json.dumps(resp3, indent=2)}")

    print("\n--- 4. POST /auth/refresh ---")
    status, resp4 = make_request("POST", "/auth/refresh", data={"refresh_token": refresh_token})
    print(f"Status: {status}\nResponse: {json.dumps(resp4, indent=2)}")

    print("\n--- Database Verification ---")
    user = db.query(User).filter(User.email == test_email).first()
    farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()

    print("User Row:")
    print(f"user_id: {user.user_id}, name: {user.name}, email: {user.email}, is_active: {user.is_active}")
    print("Farm Row:")
    print(f"farm_id: {farm.farm_id}, user_id: {farm.user_id}, farm_name: {farm.farm_name}")
    db.close()
finally:
    server.terminate()
    server.wait()
