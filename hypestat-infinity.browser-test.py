"""Run against a local static server; never contacts the investigation target."""
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('INFINITY_TEST_URL', 'http://127.0.0.1:8765/hypestat-infinity.html')
ROOT = Path(__file__).resolve().parent
KEY = 'infinity.hypestat.v1'
HEADER = 'date,site,scope,basis,provider,referrer,page,destination,country,metric,value\n'
CSV = HEADER + '2026-11-19,example.org,public_site,owner_aggregate,GA4,google.com,/index.html,example.net,US,outbound_clicks,12\n' + '2026-11-19,example.org,public_site,owner_aggregate,Cloudflare,unknown,/index.html,unknown,unknown,requests,40\n'


def run():
    results = []
    with sync_playwright() as p:
        launch = {'headless': True}
        if os.environ.get('INFINITY_CHROMIUM_EXECUTABLE'):
            launch['executable_path'] = os.environ['INFINITY_CHROMIUM_EXECUTABLE']
        browser = p.chromium.launch(**launch)
        context = browser.new_context(viewport={'width': 360, 'height': 800}, device_scale_factor=1, timezone_id='America/Chicago', accept_downloads=True)
        page = context.new_page()
        errors, requests = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda req: requests.append(req.url))
        page.goto(BASE)
        page.wait_for_selector('#records-list article')
        assert page.locator('#records-list article').count() == 5
        assert 'Saved in this browser' in page.locator('#storage-status').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        results.append('360px initial rendering and truthful seed status')

        page.locator('#record-search').fill('Dash')
        assert page.locator('#records-list article').count() == 1
        page.locator('#record-search').fill('')
        page.locator('#record-details summary').click()
        payload = '<img src=x onerror="window.__injected=true">'
        page.locator('[name=subject]').fill(payload)
        page.locator('[name=claim]').fill('Unverified local test note.')
        page.locator('[name=source]').fill('https://example.org/report')
        page.locator('#evidence-time').fill('2026-11-19T06:30')
        page.get_by_role('button', name='Save evidence note', exact=True).click()
        assert page.locator('#records-list article').count() == 6
        assert not page.evaluate('Boolean(window.__injected)')
        state = json.loads(page.evaluate(f'localStorage.getItem({json.dumps(KEY)})'))
        assert state['records'][-1]['observedAt'] == '2026-11-19T12:30:00.000Z'
        page.reload()
        assert page.locator('#records-list article').count() == 6
        results.append('search, safe evidence rendering, timezone conversion, and persistence')

        label = 'pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd.onion.ly'
        page.locator('#address-input').fill(label)
        page.get_by_role('button', name='Classify address', exact=True).click()
        assert 'Gateway address' in page.locator('#address-result').inner_text()
        assert '.onion.ly' not in page.locator('#address-result').inner_text()
        assert 'site%3Ajustice.gov' in page.locator('#address-result a').get_attribute('href')
        assert all(url.startswith('http://127.0.0.1:8765/') for url in requests)
        results.append('address classification without external requests')

        page.get_by_role('tab', name='Traffic workspace', exact=True).click()
        page.locator('#traffic-file').set_input_files({'name': 'aggregate.csv', 'mimeType': 'text/csv', 'buffer': CSV.encode()})
        page.get_by_role('button', name='Validate and import', exact=True).click()
        assert 'Confirm' in page.locator('#message').inner_text()
        page.locator('#authorized-import').check()
        page.get_by_role('button', name='Validate and import', exact=True).click()
        expect(page.locator('#traffic-body tr')).to_have_count(2)
        page.locator('#traffic-file').set_input_files({'name': 'aggregate.csv', 'mimeType': 'text/csv', 'buffer': CSV.encode()})
        page.locator('#authorized-import').check()
        page.get_by_role('button', name='Validate and import', exact=True).click()
        expect(page.locator('#message')).to_contain_text('0 traffic rows added')
        expect(page.locator('#traffic-body tr')).to_have_count(2)
        page.locator('#traffic-file').set_input_files({'name': 'bad.csv', 'mimeType': 'text/csv', 'buffer': CSV.replace('date,site', 'ip,date,site').encode()})
        page.locator('#authorized-import').check()
        page.get_by_role('button', name='Validate and import', exact=True).click()
        expect(page.locator('#message')).to_contain_text('Extra columns')
        assert page.locator('#traffic-body tr').count() == 2
        page.locator('#traffic-provider').fill('GA4')
        assert page.locator('#traffic-body tr').count() == 1
        with page.expect_download() as dl:
            page.get_by_role('button', name='Export filtered CSV', exact=True).click()
        exported = Path(dl.value.path()).read_text()
        assert 'GA4' in exported and 'Cloudflare' not in exported
        results.append('authorized aggregate import, atomic rejection, deduplication, filters, and CSV export')

        page.get_by_role('tab', name='Evidence records', exact=True).click()
        page.get_by_text('Fingerprint a local script', exact=True).click()
        script = b'window.__script_executed = true;'
        page.locator('#script-file').set_input_files({'name': 'script.js', 'mimeType': 'text/javascript', 'buffer': script})
        page.get_by_role('button', name='Calculate fingerprint', exact=True).click()
        page.wait_for_selector('#hash-result:not([hidden])')
        assert hashlib.sha256(script).hexdigest() in page.locator('#hash-result').inner_text()
        assert not page.evaluate('Boolean(window.__script_executed)')
        assert page.locator('#records-list article').count() == 7
        with page.expect_download() as dl:
            page.get_by_role('button', name='Export backup', exact=True).click()
        backup = Path(dl.value.path()).read_bytes()
        page.locator('#backup-file').set_input_files({'name': 'backup.json', 'mimeType': 'application/json', 'buffer': backup})
        assert page.locator('#records-list article').count() == 7
        assert len(json.loads(backup)['traffic']) == 2
        page.locator('#backup-file').set_input_files({'name': 'bad.json', 'mimeType': 'application/json', 'buffer': b'{"version":2,"records":[],"traffic":[]}'})
        expect(page.locator('#message')).to_contain_text('Unsupported backup')
        assert page.locator('#records-list article').count() == 7
        results.append('local SHA-256 without execution, backup round-trip, and invalid backup rejection')

        page.get_by_role('tab', name='Google + Gemini', exact=True).click()
        assert 'public_site' in page.locator('#gemini-prompt').input_value()
        assert 'private browsing histories' in page.locator('#gemini-prompt').input_value()
        for width in [320, 360, 412, 768, 1280]:
            page.set_viewport_size({'width': width, 'height': 900})
            for tab in ['Evidence records', 'Traffic workspace', 'Google + Gemini']:
                page.get_by_role('tab', name=tab, exact=True).click()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, tab)
        page.set_viewport_size({'width': 1280, 'height': 1000})
        page.get_by_role('tab', name='Evidence records', exact=True).click()
        page.screenshot(path=str(ROOT / 'hypestat-infinity-desktop.png'), full_page=True)
        page.set_viewport_size({'width': 360, 'height': 800})
        page.screenshot(path=str(ROOT / 'hypestat-infinity-mobile.png'), full_page=True)
        assert not errors, errors
        assert all(url.startswith('http://127.0.0.1:8765/') for url in requests), requests
        results.append('all tabs at 320/360/412/768/1280px, no JavaScript errors or external requests')

        # Unreadable stored data must survive every subsequent in-memory edit.
        broken = browser.new_context(viewport={'width': 360, 'height': 800})
        broken.add_init_script(f'localStorage.setItem({json.dumps(KEY)}, "unreadable original");')
        bp = broken.new_page()
        bp.goto(BASE)
        assert 'memory only' in bp.locator('#storage-status').inner_text()
        bp.locator('#record-details summary').click()
        bp.locator('[name=subject]').fill('Recovery test')
        bp.locator('[name=claim]').fill('Must not overwrite unreadable prior data.')
        bp.get_by_role('button', name='Save evidence note', exact=True).click()
        assert bp.locator('#records-list article').count() == 6
        assert bp.evaluate(f'localStorage.getItem({json.dumps(KEY)})') == 'unreadable original'
        results.append('unreadable saved-data preservation during edits')

        # Storage-denied browsers still provide a usable in-memory workspace.
        denied = browser.new_context()
        denied.add_init_script('Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Denied","SecurityError")}});')
        dp = denied.new_page()
        dp.goto(BASE)
        assert 'memory only' in dp.locator('#storage-status').inner_text()
        assert dp.locator('#records-list article').count() == 5
        results.append('storage-denied fallback without false Saved state')
        browser.close()
    print(json.dumps({'passed': len(results), 'checks': results}, indent=2))


if __name__ == '__main__':
    run()
