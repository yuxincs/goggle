import base64

from playwright.sync_api import sync_playwright


APP_WIDTH = 1024
APP_HEIGHT = 768
TITLE_BAR_HEIGHT = 44
FRAME_PADDING = 80


def capture_theme(context, theme):
    page = context.new_page()
    page.add_init_script(f"localStorage.setItem('theme', '{theme}')")
    page.goto("http://localhost:5173")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(f'.app-shell[data-theme="{theme}"]')
    page.evaluate("document.fonts.ready")
    screenshot = page.screenshot()
    page.close()
    return base64.b64encode(screenshot).decode("ascii")


def build_window_html(dark_screenshot, light_screenshot):
    return (
        """
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <style>
              * {
                box-sizing: border-box;
              }

              html,
              body {
                width: 100%;
                height: 100%;
                margin: 0;
                overflow: hidden;
                background: transparent;
              }

              body {
                display: grid;
                place-items: center;
              }

              .window {
                width: 1024px;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.14);
                border-radius: 14px;
                background: #11141b;
                box-shadow:
                  0 32px 80px rgba(0, 0, 0, 0.30),
                  0 14px 32px rgba(0, 0, 0, 0.22),
                  0 3px 10px rgba(0, 0, 0, 0.16);
              }

              .title-bar {
                position: relative;
                display: grid;
                height: 44px;
                place-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.09);
                color: rgba(255, 255, 255, 0.74);
                background: #20242d;
                font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                letter-spacing: -0.01em;
                user-select: none;
              }

              .traffic-lights {
                position: absolute;
                left: 16px;
                display: flex;
                gap: 8px;
              }

              .traffic-light {
                width: 12px;
                height: 12px;
                border: 0.5px solid rgba(0, 0, 0, 0.22);
                border-radius: 50%;
              }

              .traffic-light--close { background: #ff5f57; }
              .traffic-light--minimize { background: #febc2e; }
              .traffic-light--maximize { background: #28c840; }

              .window-content {
                position: relative;
                width: 1024px;
                height: 768px;
                overflow: hidden;
                background: #11141b;
              }

              .theme-shot {
                position: absolute;
                inset: 0;
                display: block;
                width: 100%;
                height: 100%;
              }

              .theme-shot--light {
                clip-path: polygon(52.5% 0, 100% 0, 100% 100%, 47.5% 100%);
              }

              .theme-divider {
                position: absolute;
                z-index: 2;
                top: -40px;
                left: calc(50% - 2px);
                width: 4px;
                height: calc(100% + 80px);
                border-radius: 999px;
                background: linear-gradient(180deg, #7dd3fc 0%, #66d9a8 48%, #8bdfbd 100%);
                box-shadow:
                  0 0 0 1px rgba(10, 14, 20, 0.24),
                  0 0 18px rgba(102, 217, 168, 0.34);
                transform: rotate(3.81deg);
                transform-origin: center;
              }
            </style>
          </head>
          <body>
            <div class="window">
              <div class="title-bar">
                <div class="traffic-lights" aria-hidden="true">
                  <span class="traffic-light traffic-light--close"></span>
                  <span class="traffic-light traffic-light--minimize"></span>
                  <span class="traffic-light traffic-light--maximize"></span>
                </div>
                <span>Goggle</span>
              </div>
              <div class="window-content">
                <img
                  class="theme-shot theme-shot--dark"
                  src="data:image/png;base64,__DARK_SCREENSHOT__"
                  alt=""
                >
                <img
                  class="theme-shot theme-shot--light"
                  src="data:image/png;base64,__LIGHT_SCREENSHOT__"
                  alt=""
                >
                <div class="theme-divider" aria-hidden="true"></div>
              </div>
            </div>
          </body>
        </html>
        """.replace("__DARK_SCREENSHOT__", dark_screenshot).replace(
            "__LIGHT_SCREENSHOT__", light_screenshot
        )
    )


def capture_window(context, dark_screenshot, light_screenshot):
    page = context.new_page()
    page.set_viewport_size(
        {
            "width": APP_WIDTH + FRAME_PADDING * 2,
            "height": APP_HEIGHT + TITLE_BAR_HEIGHT + FRAME_PADDING * 2 + 2,
        }
    )
    page.set_content(
        build_window_html(dark_screenshot, light_screenshot),
        wait_until="load",
    )
    page.locator(".theme-shot").evaluate_all(
        "images => Promise.all(images.map(image => image.decode()))"
    )
    page.screenshot(
        path="dist/assets/screenshot.png",
        omit_background=True,
    )
    page.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        context = browser.new_context(
            viewport={"width": APP_WIDTH, "height": APP_HEIGHT},
            device_scale_factor=2,
        )

        dark_screenshot = capture_theme(context, "dark")
        light_screenshot = capture_theme(context, "light")
        capture_window(context, dark_screenshot, light_screenshot)
    finally:
        browser.close()
