"""
End-to-end admin UI verification (HTTP layer):
  1. Admin login -> real JWT obtained
  2. GET /admin/farmers?search=sahil -> only sahil returned
  3. GET /admin/farmers?offset=0&limit=1 -> exactly 1 result
  4. Admin dashboard farmer list -> includes test-farmer@example.test
  5. GET /admin/farmers/{test_farmer_id} -> profile + empty activity
  6. PATCH /admin/farmers/{test_farmer_id}/status (deactivate) -> is_active False
  7. GET detail confirms is_active False
  8. PATCH reactivate -> is_active True
  9. GET detail confirms is_active True
"""
import json, urllib.request, urllib.error, sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

BASE = "http://127.0.0.1:8000"
ADMIN_EMAIL = "admin-test@example.test"
TEST_EMAIL = "test-farmer@example.test"

def req(method, path, data=None, token=None):
    r = urllib.request.Request(f"{BASE}{path}", method=method)
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    if data is not None:
        r.add_header("Content-Type", "application/json")
        data = json.dumps(data).encode()
    try:
        with urllib.request.urlopen(r, data=data) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

# ── 1. Admin login ─────────────────────────────────────────────────────────
print("="*60)
print("1. POST /admin/login")
s, r = req("POST", "/admin/login", {"email": ADMIN_EMAIL, "password": "adminpass"})
print(f"Status: {s}")
assert s == 200, f"Login failed: {r}"
tok = r["access_token"]
print("Admin token acquired (not printed). token_type:", r["token_type"])

# ── 2. Search filter ───────────────────────────────────────────────────────
print("\n" + "="*60)
print("2. GET /admin/farmers?search=sahil")
s, r = req("GET", "/admin/farmers?search=sahil", token=tok)
print(f"Status: {s}  |  Result count: {len(r)}")
print(json.dumps(r, indent=2))
assert s == 200
assert len(r) == 1, f"Expected 1, got {len(r)}"
assert r[0]["email"] == "sahil@gmail.com"
print("✓ Search correctly isolated one farmer")

# ── 3. Pagination ──────────────────────────────────────────────────────────
print("\n" + "="*60)
print("3. GET /admin/farmers?offset=0&limit=1")
s, r = req("GET", "/admin/farmers?offset=0&limit=1", token=tok)
print(f"Status: {s}  |  Result count: {len(r)}")
print(json.dumps(r, indent=2))
assert s == 200
assert len(r) == 1, f"Expected exactly 1, got {len(r)}"
print("✓ limit=1 respected — exactly one result returned")

# ── 4. Full farmer list ────────────────────────────────────────────────────
print("\n" + "="*60)
print("4. GET /admin/farmers (unfiltered, shows all)")
s, all_farmers = req("GET", "/admin/farmers", token=tok)
print(f"Status: {s}  |  Total farmers: {len(all_farmers)}")
for f in all_farmers:
    print(f"  user_id={f['user_id']}  {f['name']}  {f['email']}  active={f['is_active']}")
assert s == 200
test_farmer = next((f for f in all_farmers if f["email"] == TEST_EMAIL), None)
assert test_farmer is not None, "test-farmer@example.test not found"
tid = test_farmer["user_id"]
print(f"✓ test-farmer found: user_id={tid}")

# ── 5. Farmer detail ───────────────────────────────────────────────────────
print("\n" + "="*60)
print(f"5. GET /admin/farmers/{tid}")
s, detail = req("GET", f"/admin/farmers/{tid}", token=tok)
print(f"Status: {s}")
print(json.dumps(detail, indent=2))
assert s == 200
assert detail["recent_disease_scans"] == [], "Expected empty scans"
assert detail["recent_soil_analyses"] == [], "Expected empty soil"
assert detail["recent_weather_records"] == [], "Expected empty weather"
print("✓ All three activity lists are genuine empty arrays")

# ── 6–7. Deactivate then confirm ──────────────────────────────────────────
print("\n" + "="*60)
print(f"6. PATCH /admin/farmers/{tid}/status  (deactivate)")
s, r = req("PATCH", f"/admin/farmers/{tid}/status", {"is_active": False}, token=tok)
print(f"Status: {s}  Response: {json.dumps(r)}")
assert s == 200 and r["is_active"] == False

s, chk = req("GET", f"/admin/farmers/{tid}", token=tok)
assert chk["profile"]["is_active"] == False
print(f"✓ GET /admin/farmers/{tid} confirms is_active = False")

# ── 8–9. Reactivate then confirm ──────────────────────────────────────────
print("\n" + "="*60)
print(f"7. PATCH /admin/farmers/{tid}/status  (reactivate)")
s, r = req("PATCH", f"/admin/farmers/{tid}/status", {"is_active": True}, token=tok)
print(f"Status: {s}  Response: {json.dumps(r)}")
assert s == 200 and r["is_active"] == True

s, chk = req("GET", f"/admin/farmers/{tid}", token=tok)
assert chk["profile"]["is_active"] == True
print(f"✓ GET /admin/farmers/{tid} confirms is_active = True")

print("\n" + "="*60)
print("ALL CHECKS PASSED")
print("""
Cleanup still needed before submission:
  - test-farmer@example.test (user_id varies per run)
  - Test_Disease (disease_id=11)
""")
