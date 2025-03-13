from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    # Set 4K resolution.
    page.set_viewport_size({"width": 3840, "height": 2160})
    page.goto("http://localhost:5173")
    page.wait_for_load_state('load')
    page.screenshot(path="dist/assets/screenshot.png")
    browser.close()
