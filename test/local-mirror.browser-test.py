"""Browser-level tests for Gap 2. Loopback-only; no remote websites or user data."""
import asyncio
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.request import urlopen
from playwright.async_api import async_playwright

CSP = ("default-src 'none'; script-src 'self'; worker-src 'self'; "
       "style-src 'unsafe-inline'; img-src data:; connect-src 'none'; "
       "frame-src 'none'; object-src 'none'; base-uri 'none'; "
       "form-action 'none'; frame-ancestors 'self'")

class StaticWithCSP(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def end_headers(self):
        if self.path.startswith('/local-mirror'):
            self.send_header('Content-Security-Policy', CSP)
            self.send_header('X-Frame-Options', 'SAMEORIGIN')
            self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

async def verify():
    os.chdir(Path(__file__).resolve().parents[1])
    server = ThreadingHTTPServer(('127.0.0.1', 0), StaticWithCSP)
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        # A page's meta CSP alone does not restrict separately fetched worker scripts.
        for path in ['local-mirror.html','local-mirror-worker.mjs','local-mirror-core.mjs']:
            with urlopen(origin + '/' + path, timeout=10) as response:
                assert "connect-src 'none'" in response.headers['Content-Security-Policy'], path

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            for width in [360, 393, 1280]:
                context = await browser.new_context(viewport={'width': width, 'height': 820})
                page = await context.new_page()
                problems = []
                external = []
                page.on('pageerror', lambda error: problems.append(str(error)))
                page.on('request', lambda request: external.append(request.url) if not request.url.startswith(origin) else None)
                await page.goto(origin+'/local-mirror.html')
                assert await page.title() == 'Local Mirror · Shadow Web Radar · Quantaφ'
                assert await page.locator('#save').is_disabled()
                await page.locator('#consent').check()
                assert await page.locator('#save').is_enabled()
                await page.locator('#text').fill('Private scene, private scene, comet')
                await page.locator('#save').click()
                await page.wait_for_function("document.querySelector('#status').textContent.startsWith('Saved locally')")
                records = await page.evaluate("""async () => {
                    const db = await new Promise((resolve,reject) => {
                        const r=indexedDB.open('quantaphi-local-mirror-v1');
                        r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
                    });
                    const data=await new Promise((resolve,reject)=>{
                        const r=db.transaction('notes').objectStore('notes').getAll();
                        r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
                    });
                    db.close();return data;
                }""")
                assert len(records) == 1, records
                assert 'text' not in records[0], 'Raw private text persisted'
                assert records[0]['lexicalProfile']['private'] == 2
                assert await page.locator('#records').count() == 1
                overflow=await page.evaluate("document.documentElement.scrollWidth > innerWidth+1")
                assert not overflow, f'horizontal overflow at {width}'
                # Attempt a cross-origin loopback connection, without any external Internet address.
                await page.evaluate("""async () => {
                    window.__privacyCspViolations=[];
                    document.addEventListener('securitypolicyviolation',e=>window.__privacyCspViolations.push(e.violatedDirective));
                    try { await fetch('http://127.0.0.1:9/prohibited'); } catch (_) {}
                }""")
                await page.wait_for_function("window.__privacyCspViolations.some(x=>x.includes('connect-src'))")
                await page.locator('#clear').click()
                await page.wait_for_function("document.querySelector('#status').textContent.includes('was cleared')")
                assert 'No locally saved snippets' in await page.locator('#records').inner_text()
                assert not problems, problems
                assert not external, external
                await page.screenshot(path=f'local-mirror-{width}.png', full_page=True)
                print(f'PASS width={width} IndexedDB metadata-only, CSP blocked loopback probe, clear succeeded')
                await context.close()
            await browser.close()
    finally:
        server.shutdown()

if __name__=='__main__':
    asyncio.run(verify())
