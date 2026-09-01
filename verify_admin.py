"""
Phase 2 Admin verification:
  a) Farmer token -> GET /admin/farmers (403 expected)
  b) Admin token -> GET /auth/me (403 expected)
  c) PATCH /admin/diseases/{id} changes the DB value.
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

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from app.core.db import SessionLocal
from app.models.user import User
from app.models.farm import Farm
from app.models.admin import Admin
from app.models.disease import Disease
from app.core.security import hash_password

TEST_EMAIL = "test-farmer@example.test"
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

def setup_db():
    db = SessionLocal()
    try:
        # Farmer cleanup
        u = db.query(User).filter(User.email == TEST_EMAIL).first()
        if u:
            db.query(Farm).filter(Farm.user_id == u.user_id).delete()
            db.delete(u)
            db.commit()
            
        # Admin setup
        a = db.query(Admin).filter(Admin.email == ADMIN_EMAIL).first()
        if not a:
            a = Admin(name="Test Admin", email=ADMIN_EMAIL, password_hash=hash_password("adminpass"))
            db.add(a)
            db.commit()
        else:
            a.password_hash = hash_password("adminpass")
            db.commit()
            
        # Disease setup (create one if empty)
        d = db.query(Disease).filter(Disease.disease_name == "Test_Disease").first()
        if not d:
            d = Disease(disease_name="Test_Disease", description="Old description")
            db.add(d)
            db.commit()
        else:
            d.description = "Old description"
            db.commit()
    finally:
        db.close()

try:
    setup_db()

    env = os.environ.copy()
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    print("Server PID:", server.pid)
    time.sleep(5)

    # 1. Login/Signup
    print("\n=== Getting Farmer Token ===")
    req("POST", "/auth/signup", data={
        "name": "Test Farmer", "email": TEST_EMAIL, "password": "farmerpass", "farm_name": "Farm"
    })
    s1, r1 = req("POST", "/auth/login", data={"email": TEST_EMAIL, "password": "farmerpass"})
    farmer_token = r1["access_token"]
    print("Farmer token acquired.")

    print("\n=== Getting Admin Token ===")
    s2, r2 = req("POST", "/admin/login", data={"email": ADMIN_EMAIL, "password": "adminpass"})
    admin_token = r2["access_token"]
    print("Admin token acquired.")

    # 2. Isolation tests
    print("\n" + "="*60)
    print("TEST A: Farmer token -> GET /admin/farmers")
    sa, ra = req("GET", "/admin/farmers", headers={"Authorization": f"Bearer {farmer_token}"})
    print(f"Status: {sa}\nResponse: {json.dumps(ra, indent=2)}")
    assert sa == 401 or sa == 403, f"Expected 401/403, got {sa}"
    print("✓ Farmer token rejected from admin endpoint.")

    print("\n" + "="*60)
    print("TEST B: Admin token -> GET /auth/me")
    sb, rb = req("GET", "/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"Status: {sb}\nResponse: {json.dumps(rb, indent=2)}")
    assert sb == 401 or sb == 403, f"Expected 401/403, got {sb}"
    print("✓ Admin token rejected from farmer endpoint.")

    # 3. Patch disease
    print("\n" + "="*60)
    print("TEST C: Editing a disease via PATCH /admin/diseases/{id}")
    
    db = SessionLocal()
    d = db.query(Disease).filter(Disease.disease_name == "Test_Disease").first()
    disease_id = d.disease_id
    db.close()

    sc, rc = req("PATCH", f"/admin/diseases/{disease_id}", headers={"Authorization": f"Bearer {admin_token}"}, data={"description": "Updated description!"})
    print(f"Status: {sc}\nResponse: {json.dumps(rc, indent=2)}")
    assert sc == 200, f"Expected 200, got {sc}"
    
    # Check DB
    db = SessionLocal()
    d_updated = db.query(Disease).filter(Disease.disease_id == disease_id).first()
    db.close()
    print(f"DB verification: description is '{d_updated.description}'")
    assert d_updated.description == "Updated description!"
    print("✓ DB value successfully updated.")

    # 4. Farmer Oversight endpoints
    print("\n" + "="*60)
    print("TEST D: GET /admin/farmers")
    sd, rd = req("GET", "/admin/farmers", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"Status: {sd}\nResponse: {json.dumps(rd, indent=2)}")
    assert sd == 200, f"Expected 200, got {sd}"
    # Find test farmer id
    test_farmer_id = next((f["user_id"] for f in rd if f["email"] == TEST_EMAIL), None)
    assert test_farmer_id is not None, "Test farmer not found in /admin/farmers response"
    print(f"✓ Found test farmer with user_id={test_farmer_id}")

    print("\n" + "="*60)
    print(f"TEST E: GET /admin/farmers/{test_farmer_id}")
    se, re = req("GET", f"/admin/farmers/{test_farmer_id}", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"Status: {se}\nResponse: {json.dumps(re, indent=2)}")
    assert se == 200, f"Expected 200, got {se}"
    assert len(re["recent_disease_scans"]) == 0, "Expected empty disease scans"
    assert len(re["recent_soil_analyses"]) == 0, "Expected empty soil analyses"
    assert len(re["recent_weather_records"]) == 0, "Expected empty weather records"
    print("✓ Farmer detail returned empty state for activity arrays as expected.")

    print("\n" + "="*60)
    print(f"TEST F: PATCH /admin/farmers/{test_farmer_id}/status")
    print("--- Deactivating farmer ---")
    sf1, rf1 = req("PATCH", f"/admin/farmers/{test_farmer_id}/status", headers={"Authorization": f"Bearer {admin_token}"}, data={"is_active": False})
    print(f"Status: {sf1}\nResponse: {json.dumps(rf1, indent=2)}")
    assert sf1 == 200 and rf1["is_active"] == False

    se_check1, re_check1 = req("GET", f"/admin/farmers/{test_farmer_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert re_check1["profile"]["is_active"] == False
    print("✓ Farmer detail reflects is_active = False")

    print("\n--- Reactivating farmer ---")
    sf2, rf2 = req("PATCH", f"/admin/farmers/{test_farmer_id}/status", headers={"Authorization": f"Bearer {admin_token}"}, data={"is_active": True})
    print(f"Status: {sf2}\nResponse: {json.dumps(rf2, indent=2)}")
    assert sf2 == 200 and rf2["is_active"] == True

    se_check2, re_check2 = req("GET", f"/admin/farmers/{test_farmer_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert re_check2["profile"]["is_active"] == True
    print("✓ Farmer detail reflects is_active = True")

finally:
    if server:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
        print(f"\nServer terminated.")
