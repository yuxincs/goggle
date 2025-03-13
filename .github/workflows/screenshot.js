import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:3000'); // Change this to your local server
    await page.screenshot({ path: 'screenshot.png' });
    await browser.close();
    console.log('Screenshot saved as screenshot.png');
})();
