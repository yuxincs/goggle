from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        device_scale_factor=2,  # Set scale factor to 2 for high-DPI
    )
    page = context.new_page()
    page.goto("http://localhost:5173")
    page.wait_for_load_state('networkidle')
    page.screenshot(path="dist/assets/screenshot.png")
    browser.close()
