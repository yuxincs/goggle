from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000")
    page.wait_for_load_state('load')
    page.screenshot(path="assets/screenshot.png")
    browser.close()
