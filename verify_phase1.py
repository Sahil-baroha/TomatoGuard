"""
Phase 1 verification â€” three steps:
  2. Duplicate-email signup â†’ 409, zero new rows in users/farms
  3. is_active=false login â†’ 403; wrong-password login â†’ 401 (distinct messages)
  4. Server is terminated before this script exits

Run from repo root with the venv active.
DATABASE_URL must be in backend/.env (or environment).
"""

import urllib.request
import urllib.error
import json
import time
import subprocess
import sys
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)

# Load .env so SessionLocal can connect
from dotenv import load_dotenv as _load  # may not be installed; fall back below
_load(os.path.join(BACKEND_DIR, ".env"))

from app.core.db import SessionLocal
from app.models.user import User
from app.models.farm import Farm

TEST_EMAIL = "test-farmer@example.test"
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

def count_rows(email):
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).all()
        f_count = 0
        for uu in u:
            f_count += db.query(Farm).filter(Farm.user_id == uu.user_id).count()
        return len(u), f_count
    finally:
        db.close()

def set_active(email, value: bool):
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            u.is_active = value
            db.commit()
            db.refresh(u)
            return u.is_active
        return None
    finally:
        db.close()

def cleanup():
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == TEST_EMAIL).first()
        if u:
            db.query(Farm).filter(Farm.user_id == u.user_id).delete()
            db.delete(u)
            db.commit()
    finally:
        db.close()

try:
    # â”€â”€ Ensure test account exists (clean slate) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cleanup()

    env = os.environ.copy()
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    print("Server PID:", server.pid)
    time.sleep(5)

    # Confirm server up
    hstatus, hresp = req("GET", "/health")
    print(f"\n/health â†’ {hstatus} {hresp}")
    if hstatus != 200:
        print("Server failed to start. Aborting.")
        sys.exit(1)

    # â”€â”€ Register the test account (first time â€” must succeed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n=== Baseline signup (first time) ===")
    s1, r1 = req("POST", "/auth/signup", data={
        "name": "Test Farmer",
        "email": TEST_EMAIL,
        "password": "securepassword123",
        "farm_name": "Test Farm",
        "village": "Test Village"
    })
    print(f"Status: {s1}")
    print(f"Body:   {json.dumps(r1, indent=2)}")

    users_before, farms_before = count_rows(TEST_EMAIL)
    print(f"\nDB check before duplicate attempt â†’ users: {users_before}, farms: {farms_before}")

    # â”€â”€ STEP 2: Duplicate-email signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n" + "="*60)
    print("STEP 2 â€” Duplicate-email signup")
    print("="*60)
    s2, r2 = req("POST", "/auth/signup", data={
        "name": "Another Farmer",
        "email": TEST_EMAIL,        # same email
        "password": "differentpassword",
        "farm_name": "Another Farm",
        "village": "Other Village"
    })
    print(f"HTTP status : {s2}")
    print(f"Response    : {json.dumps(r2, indent=2)}")

    users_after, farms_after = count_rows(TEST_EMAIL)
    print(f"\nDB check after duplicate attempt  â†’ users: {users_after}, farms: {farms_after}")
    assert s2 == 409,            f"Expected 409, got {s2}"
    assert users_after  == users_before,  f"users grew: {users_before} â†’ {users_after}"
    assert farms_after  == farms_before,  f"farms grew: {farms_before} â†’ {farms_after}"
    print("âœ“ 409 returned AND zero new rows (transaction rolled back / guard worked)")

    # â”€â”€ STEP 3a: Wrong password â†’ 401 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n" + "="*60)
    print("STEP 3a â€” Wrong password login")
    print("="*60)
    s3a, r3a = req("POST", "/auth/login", data={
        "email": TEST_EMAIL,
        "password": "WRONGPASSWORD"
    })
    print(f"HTTP status : {s3a}")
    print(f"Response    : {json.dumps(r3a, indent=2)}")
    assert s3a == 401, f"Expected 401, got {s3a}"
    print("âœ“ Wrong-password returns 401")

    # â”€â”€ STEP 3b: Deactivate account, attempt login with correct password â†’ 403 â”€
    print("\n" + "="*60)
    print("STEP 3b â€” Deactivated account login (correct password)")
    print("="*60)
    active_val = set_active(TEST_EMAIL, False)
    print(f"Set is_active â†’ {active_val}  (confirmed via direct DB query)")

    s3b, r3b = req("POST", "/auth/login", data={
        "email": TEST_EMAIL,
        "password": "securepassword123"   # correct password
    })
    print(f"HTTP status : {s3b}")
    print(f"Response    : {json.dumps(r3b, indent=2)}")
    assert s3b == 403, f"Expected 403, got {s3b}"
    assert r3b.get("detail") != r3a.get("detail"), \
        f"Messages must differ; both returned: {r3a.get('detail')!r}"
    print(f"âœ“ Deactivated account returns 403 (msg={r3b['detail']!r})")
    print(f"  Distinct from 401 msg        (msg={r3a['detail']!r})")

    # Restore is_active
    restored = set_active(TEST_EMAIL, True)
    print(f"\nis_active restored â†’ {restored}  (confirmed via direct DB query)")

    # Verify login works again
    s3c, r3c = req("POST", "/auth/login", data={
        "email": TEST_EMAIL,
        "password": "securepassword123"
    })
    print(f"Post-restore login â†’ {s3c} (expected 200)")
    assert s3c == 200, f"Expected 200 after restore, got {s3c}"
    print("âœ“ Account re-enabled; login succeeds")

finally:
    # â”€â”€ STEP 4: Shut down server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if server:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
        print(f"\n{'='*60}")
        print(f"STEP 4 â€” Server (PID {server.pid}) terminated")
        print(f"  returncode: {server.returncode}")
        print("="*60)

    # Confirm no python/uvicorn process on :8000
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    result = sock.connect_ex(("127.0.0.1", 8000))
    sock.close()
    status_str = "STILL OPEN (unexpected)" if result == 0 else "CLOSED (expected)"
    print(f"Port 8000 after termination: {status_str}")

