const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    geolocation: { latitude: 28.7041, longitude: 77.1025 },
    permissions: ['geolocation']
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="email"]', 'test-farmer3@example.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("Sign in")');
  
  // Wait for login
  await page.waitForTimeout(3000);
  
  // Go to Weather page directly
  await page.goto('http://localhost:5173/weather');
  
  // Wait for weather data to load
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(__dirname, 'weather_screenshot.png') });

  await browser.close();
})();
