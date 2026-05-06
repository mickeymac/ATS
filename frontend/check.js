const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  // Navigate to the app (assuming it runs on port 5173 or 3000)
  // But wait, it's behind a login screen? If it is behind a login screen, we can't easily see the database page unless we login.
  // Actually, wait, maybe just the build is failing?
  await browser.close();
})();
