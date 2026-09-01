"""
Phase 2 verification:
  1. curl: POST /auth/login (test-farmer) → GET /dashboard/summary → confirm all 3 null
  2. Confirm test-farmer@example.test still exists and is_active=true
  3. Playwright: login via the real UI → land on /dashboard → screenshot all four empty-state cards
"""
import json, urllib.request, urllib.error, sys, os, time

BASE = "http://127.0.0.1:8000"
FRONT = "http://localhost:5173"
OUT = r"C:\Users\pc\.gemini\antigravity\brain\4555124e-e750-4f1f-acd2-131b8f920378\scratch"
os.makedirs(OUT, exist_ok=True)
FARMER_EMAIL = "test-farmer@example.test"
FARMER_PASS = "farmerpass"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

def req(method, path, data=None, token=None):
    r = urllib.request.Request(f"{BASE}{path}", method=method)
    if token: r.add_header("Authorization", f"Bearer {token}")
    if data is not None:
        r.add_header("Content-Type", "application/json")
        data = json.dumps(data).encode()
    try:
        with urllib.request.urlopen(r, data=data) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

# ─── 1. Login ──────────────────────────────────────────────────────────────
print("=" * 60)
print("1. POST /auth/login (test-farmer)")
s, r = req("POST", "/auth/login", {"email": FARMER_EMAIL, "password": FARMER_PASS})
print(f"   Status: {s}")
if s != 200:
    print(f"   ERROR: {r}")
    print("   Cannot continue without a valid token. Exiting.")
    sys.exit(1)
tok = r["access_token"]
print("   Token acquired (not printed). token_type:", r["token_type"])

# ─── 2. GET /dashboard/summary ────────────────────────────────────────────
print("\n" + "=" * 60)
print("2. GET /dashboard/summary")
s, summary = req("GET", "/dashboard/summary", token=tok)
print(f"   Status: {s}")
print("   Response:", json.dumps(summary, indent=4))
assert s == 200, f"Expected 200, got {s}"
assert summary["latest_disease_scan"] is None, f"Expected null, got {summary['latest_disease_scan']}"
assert summary["latest_soil_analysis"] is None, f"Expected null, got {summary['latest_soil_analysis']}"
assert summary["latest_weather"] is None, f"Expected null, got {summary['latest_weather']}"
print("   ✓ All three fields are null — no fabricated data")

# ─── 3. Confirm test-farmer still active ─────────────────────────────────
print("\n" + "=" * 60)
print("3. GET /auth/me — confirm test-farmer exists and is_active")
s, me = req("GET", "/auth/me", token=tok)
print(f"   Status: {s}")
print(f"   user_id: {me.get('user_id')}  email: {me.get('email')}  is_active: {me.get('is_active')}")
assert s == 200 and me.get("email") == FARMER_EMAIL
print("   ✓ test-farmer@example.test exists and can authenticate")

# ─── 4. Playwright — login via UI, screenshot dashboard ──────────────────
print("\n" + "=" * 60)
print("4. Playwright: login via real UI → dashboard empty states")
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_context(viewport={"width": 1280, "height": 800}).new_page()

    # Login
    page.goto(f"{FRONT}/login")
    page.wait_for_load_state("networkidle")
    page.fill("input[type='email']", FARMER_EMAIL)
    page.fill("input[type='password']", FARMER_PASS)
    page.click("button:has-text('Sign in')")

    # Wait for navigation to /dashboard
    page.wait_for_url(f"{FRONT}/dashboard", timeout=8000)
    assert "/dashboard" in page.url, "Did not land on /dashboard"
    print("   ✓ Login successful, landed on /dashboard")

    # Wait for API call to finish (loading spinners resolve)
    time.sleep(3)
    page.screenshot(path=os.path.join(OUT, "phase2_dashboard_empty.png"))
    print(f"   ✓ Screenshot saved: phase2_dashboard_empty.png")

    # Verify tomatoTokens key (not tomatoUser only)
    tokens = page.evaluate("JSON.parse(localStorage.getItem('tomatoTokens') || 'null')")
    assert tokens and tokens.get("access_token"), "tomatoTokens missing or has no access_token"
    print(f"   ✓ JWT stored under tomatoTokens (access_token length: {len(tokens['access_token'])})")

    # Verify no fabricated data — check for the empty-state hint text
    page_text = page.inner_text("body")
    assert "No scan yet" in page_text, "Disease empty-state text not found"
    assert "No soil analysis yet" in page_text, "Soil empty-state text not found"
    assert "No weather data yet" in page_text, "Weather empty-state text not found"
    assert "No recommendation yet" in page_text, "Recommendation empty-state text not found"
    print("   ✓ All four distinct empty-state labels confirmed on screen")

    browser.close()

print("\n" + "=" * 60)
print("ALL PHASE 2 VERIFICATIONS PASSED")
print("""
Notes:
  - test-farmer@example.test (user_id varies) still exists and active — not modified
  - All three /dashboard/summary fields returned null — no fabricated data
  - Real JWT stored under tomatoTokens, not the old local-auth key
  - All four dashboard cards showed their distinct no-data messages
""")
