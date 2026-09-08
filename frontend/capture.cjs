const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    geolocation: { latitude: 28.7041, longitude: 77.1025 },
    permissions: ['geolocation']
  });
  const page = await context.newPage();

  // Signup Page screenshot
  await page.goto('http://localhost:5173/signup');
  // Wait for the button
  await page.waitForSelector('text=Use my location');
  await page.screenshot({ path: path.join(__dirname, 'signup_screenshot.png') });
  
  // Click the button to trigger geolocation
  await page.click('text=Use my location');
  await page.waitForSelector('text=Location captured');
  await page.screenshot({ path: path.join(__dirname, 'signup_screenshot_captured.png') });
  
  // Now login as the test-farmer3 we created in python script
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="email"]', 'test-farmer3@example.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("Sign in")');
  
  // Go to Weather page
  await page.waitForURL('**/dashboard');
  await page.goto('http://localhost:5173/weather');
  
  // Wait for weather data to load
  await page.waitForSelector('text=Current conditions', { timeout: 15000 });
  await page.waitForSelector('text=5-day forecast', { timeout: 15000 });
  await page.screenshot({ path: path.join(__dirname, 'weather_screenshot.png') });

  await browser.close();
})();
