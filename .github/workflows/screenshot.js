const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');
    await page.screenshot({ path: 'dist/screenshot.png' });
    await browser.close();
    console.log('Screenshot saved as dist/screenshot.png');
})();