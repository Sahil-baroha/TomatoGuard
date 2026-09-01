from playwright.sync_api import sync_playwright
import os
import time

ADMIN_EMAIL = "admin-test@example.test"
ADMIN_PASS = "adminpass"
BASE_URL = "http://localhost:5173"
OUT_DIR = r"C:\Users\pc\.gemini\antigravity\brain\4555124e-e750-4f1f-acd2-131b8f920378\scratch"
os.makedirs(OUT_DIR, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("1. Navigate to /admin/login, fill in credentials, submit")
        page.goto(f"{BASE_URL}/admin/login")
        page.wait_for_load_state("networkidle")
        page.fill("input[type='email']", ADMIN_EMAIL)
        page.fill("input[type='password']", ADMIN_PASS)
        page.click("button[type='submit']")

        print("2. Confirm lands on /admin/dashboard")
        try:
            page.wait_for_url(f"{BASE_URL}/admin/dashboard", timeout=5000)
        except Exception:
            page.screenshot(path=os.path.join(OUT_DIR, "debug_failed_login.png"))
            raise
        assert "/admin/dashboard" in page.url, "Failed to reach dashboard"
        print("   -> [PASS] Successfully landed on /admin/dashboard")
        
        # Wait for API to load initial farmer list
        page.wait_for_selector("table tbody tr")
        time.sleep(1)

        print("3. Read localStorage and confirm tomatoAdminTokens")
        val = page.evaluate("localStorage.getItem('tomatoAdminTokens')")
        assert val is not None, "tomatoAdminTokens not found in localStorage"
        print(f"   -> [PASS] Found token in key: tomatoAdminTokens (length: {len(val)})")

        print("4. Search 'sahil' in dashboard")
        page.fill("input[placeholder*='Search by name']", "sahil")
        page.click("button:has-text('Search')")
        time.sleep(2)  # Wait for the API call to resolve and DOM to update
        
        rows = page.locator("tbody tr")
        count = rows.count()
        print(f"   -> Table rows found after search: {count}")
        page.screenshot(path=os.path.join(OUT_DIR, "step4_search_sahil.png"))
        assert count == 1, f"Expected 1 row, got {count}"
        print("   -> [PASS] Exact match shown.")

        print("5. Clear search, click Test Farmer, deactivate, confirm, screenshot")
        page.click("button:has-text('Clear')")
        time.sleep(2)  # wait for API
        
        # Click the row for Test Farmer
        page.click("text=Test Farmer")
        page.wait_for_selector("text=Farmer Detail")
        time.sleep(1)
        
        page.click("button:has-text('Deactivate account')")
        page.wait_for_selector("text=Deactivate this account?")
        time.sleep(1) # let animation settle
        page.screenshot(path=os.path.join(OUT_DIR, "step5_modal_deactivate.png"))
        page.click("button:has-text('Yes, deactivate')")
        
        page.wait_for_selector("text=✗ Deactivated")
        time.sleep(1)
        page.screenshot(path=os.path.join(OUT_DIR, "step5_status_deactivated.png"))
        print("   -> [PASS] Successfully deactivated and verified.")

        print("6. Reactivate, screenshot")
        page.click("button:has-text('Reactivate account')")
        page.wait_for_selector("text=Reactivate this account?")
        time.sleep(1)
        page.screenshot(path=os.path.join(OUT_DIR, "step6_modal_reactivate.png"))
        page.click("button:has-text('Yes, reactivate')")
        
        page.wait_for_selector("text=✓ Active")
        time.sleep(1)
        page.screenshot(path=os.path.join(OUT_DIR, "step6_status_reactivated.png"))
        print("   -> [PASS] Successfully reactivated and verified.")

        print("7. Navigate to farmer login, verify no session bleed")
        page.goto(f"{BASE_URL}/login")
        time.sleep(1)
        farmer_token = page.evaluate("localStorage.getItem('tomatoTokens')")
        admin_token_still_there = page.evaluate("localStorage.getItem('tomatoAdminTokens')")
        print(f"   -> tomatoTokens: {farmer_token}")
        print(f"   -> tomatoAdminTokens: {'Present' if admin_token_still_there else 'Missing'}")
        
        assert "/login" in page.url, "Session bled over to farmer login!"
        assert farmer_token is None, "tomatoTokens should not exist!"
        print("   -> [PASS] Session isolated successfully (remained on /login).")

        browser.close()
        print("ALL TESTS COMPLETED SUCCESSFULLY.")

if __name__ == "__main__":
    run()
