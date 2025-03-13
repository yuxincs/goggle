from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(
        viewport={'width': 3840, 'height': 2160},  # 4K resolution
        device_scale_factor=4,  # 4x UI scaling
    )
    page = context.new_page()
    page.goto("http://localhost:5173")
    page.wait_for_load_state('networkidle')
    page.screenshot(path="dist/assets/screenshot.png")
    browser.close()
