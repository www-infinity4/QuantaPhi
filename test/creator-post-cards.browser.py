"""Real Chromium UI checks; X's provider embed is stubbed, not a playback receipt."""
import functools
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
POST = 'elena-cardone-post-2122570458897744184'
WIDGET = """window.twttr={widgets:{load:()=>{},createTweet:async(id,host)=>{
 const node=document.createElement('div');node.dataset.mockXPost=id;
 node.textContent='Provider test fixture '+id;host.append(node);return node;
}}};"""

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run():
    server = None
    base = os.environ.get('CREATOR_TEST_BASE_URL', '').rstrip('/')
    if not base:
        server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}'
    checks = []
    try:
        with sync_playwright() as p:
            launch = {'headless': True}
            if os.environ.get('INFINITY_CHROMIUM_EXECUTABLE'):
                launch['executable_path'] = os.environ['INFINITY_CHROMIUM_EXECUTABLE']
            browser = p.chromium.launch(**launch)
            for width in [360, 1280]:
                context = browser.new_context(viewport={'width': width, 'height': 900}, timezone_id='America/Chicago', accept_downloads=True)
                page = context.new_page()
                widget_requests = []
                def route(request):
                    url = request.request.url
                    if url.startswith('https://platform.twitter.com/widgets.js'):
                        widget_requests.append(url)
                        request.fulfill(status=200, content_type='application/javascript', body=WIDGET)
                    elif urlparse(url).netloc == urlparse(base).netloc:
                        request.continue_()
                    else:
                        request.abort()
                page.route('**/*', route)
                page.goto(base+'/source-quick-card.html?card=elena-cardone', wait_until='domcontentloaded')
                card = page.locator('.creator-post-card')
                expect(card).to_be_visible()
                expect(card.locator('.creator-coverage')).to_have_text('5 indexed posts · partial public snapshot')
                assert not widget_requests, 'Creator post card must not contact X widgets before a visitor request'
                search = card.get_by_role('searchbox', name='Search Elena Cardone indexed posts')
                search.fill('gratitude')
                expect(card.locator('.creator-post-status')).to_contain_text('1 of 1')
                assert card.get_by_role('link', name='Read original X post').get_attribute('href').endswith('/2123222229060124837')
                search.fill('')
                card.get_by_role('combobox', name='Post topic', exact=True).select_option('business')
                expect(card.locator('.creator-post-summary')).to_contain_text('her opinion')
                search.fill('zxy-no-results')
                expect(card.locator('.creator-post-status')).to_contain_text('No indexed posts match')
                expect(card.get_by_role('button', name='Next post')).to_be_disabled()
                search.fill('')
                card.get_by_role('combobox', name='Post topic', exact=True).select_option('all')
                before = card.locator('.creator-post-title').inner_text()
                card.get_by_role('button', name='Next post').click()
                assert card.locator('.creator-post-title').inner_text() != before
                with page.expect_download() as download:
                    card.get_by_role('button', name='Export indexed database').click()
                exported = json.loads(Path(download.value.path()).read_text())
                assert len(exported['posts']) == 5 and exported['coverage']['complete'] is False
                card.get_by_role('button', name='Load original X post').click()
                expect(card.get_by_role('button', name='Original loaded', exact=True)).to_be_visible()
                expect(card.locator('[data-mock-x-post]')).to_have_count(1)
                card.get_by_role('button', name='Next post').click()
                expect(card.locator('[data-mock-x-post]')).to_have_count(0)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
                follow = page.locator('[data-card-actions="elena-cardone"] [data-action="follow"]')
                follow.click()
                expect(follow).to_have_attribute('aria-pressed', 'true')
                page.reload(wait_until='domcontentloaded')
                expect(page.locator('[data-card-actions="elena-cardone"] [data-action="follow"]')).to_have_attribute('aria-pressed', 'true')
                checks.append(f'{width}px: search, topics, navigation, JSON export, consented mock embed and durable Follow')

                page.goto(base+'/?card=elena-cardone', wait_until='domcontentloaded')
                stage = page.locator('#oracleCardStage')
                expect(stage.locator('[data-source-id="elena-cardone"] .creator-post-card')).to_be_visible(timeout=20000)
                chooser = page.locator('#oracleCardChooser')
                creator_options = chooser.locator('option[value^="source-elena-cardone"]')
                expect(creator_options).to_have_count(6)
                page.locator('#oracleCardDepartment').select_option('business')
                chooser.select_option('source-'+POST)
                expect(stage.locator('[data-source-id="'+POST+'"]')).to_be_visible()
                assert stage.get_attribute('data-switchboard-category') == 'Business & finance'
                page.locator('[data-oracle-feed="following"]').click()
                expect(chooser.locator('option[value="source-elena-cardone"]')).to_have_count(1)
                expect(chooser.locator('option[value="source-'+POST+'"]')).to_have_count(0)
                checks.append(f'{width}px: six original carousel cards, business placement and strict Following')
                context.close()
            browser.close()
    finally:
        if server:
            server.shutdown()
    print(json.dumps({'passed': len(checks), 'checks': checks, 'xPlaybackVerified': False, 'physicalAndroidVerified': False}, indent=2))


if __name__ == '__main__':
    run()
