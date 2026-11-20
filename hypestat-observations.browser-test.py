"""Android-size local-browser tests; only local HTTP, no Tor or public-site requests."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = 'http://127.0.0.1:8765/hypestat-observations.html'
KEY = 'quantaphi-hypestat-observations-v1'
ONION = 'pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd.onion'

def fill(page, status, checked, observation):
    page.locator('[name=caseId]').fill('Public sample research')
    page.locator('[name=checkedAt]').fill(checked)
    page.locator('[name=status]').select_option(status)
    page.locator('[name=exactUrl]').fill('https://example.org/report')
    page.locator('[name=onionAddress]').fill(ONION)
    page.locator('[name=publicMirror]').fill('https://example.org/mirror')
    page.locator('[name=sourceUrl]').fill('https://example.org/source')
    page.locator('[name=sourceReported]').fill('Estimated 80 visits; period not established.')
    page.locator('[name=observedData]').fill(observation)
    page.locator('[name=unknowns]').fill('Origin and operator not established.')
    page.locator('[name=nextAction]').fill('Read one additional public source.')
    page.locator('[name=custody]').fill('Test operator retained original locally.')

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context(viewport={'width':360,'height':800},timezone_id='America/Chicago',accept_downloads=True)
        page=context.new_page()
        errors,requests=[],[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda request:requests.append(request.url))
        page.goto(URL)
        expect(page.locator('#result-count')).to_contain_text('0 of 0')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert all(request.startswith('http://127.0.0.1:8765/') for request in requests)
        print('PASS: mobile layout, no external network and zero fabricated data')

        payload='<img src=x onerror="window.evil=true">'
        fill(page,'unverified','2026-11-19T06:30',payload)
        file_bytes=b'public-local-screenshot-test-bytes'
        page.locator('#screenshot-file').set_input_files({'name':'sample.png','mimeType':'image/png','buffer':file_bytes})
        page.locator('#save-check').click()
        expect(page.locator('#result-count')).to_contain_text('1 of 1')
        expect(page.locator('#form-message')).to_contain_text('Saved one dated observation')
        assert not page.evaluate('Boolean(window.evil)')
        state=json.loads(page.evaluate(f'localStorage.getItem({json.dumps(KEY)})'))
        assert state['checks'][0]['checkedAt']=='2026-11-19T12:30:00.000Z'
        assert state['checks'][0]['screenshotSha256']==hashlib.sha256(file_bytes).hexdigest()
        assert state['checks'][0]['screenshotSize']==len(file_bytes)
        assert payload in page.locator('#records-list').inner_text()
        print('PASS: safe rendering, timezone, screenshot fingerprint and saved custody')

        fill(page,'changed','2026-11-20T06:30','Public report now shows a different redirect.')
        page.locator('[name=redirectUrl]').fill('https://example.net/new')
        page.locator('#save-check').click()
        expect(page.locator('#result-count')).to_contain_text('2 of 2')
        expect(page.locator('#form-message')).to_contain_text('Saved one dated observation')
        saved=json.loads(page.evaluate(f'localStorage.getItem({json.dumps(KEY)})'))
        assert [c for c in saved['checks'] if c['status']=='changed'][0]['screenshotName']=='', saved
        page.get_by_role('tab',name='Timeline').click()
        expect(page.locator('#timeline-list article')).to_have_count(2)
        page.get_by_role('tab',name='Compare').click()
        page.locator('#compare-case').select_option('Public sample research')
        expect(page.locator('#comparison-summary')).to_contain_text('2 saved checks')
        expect(page.locator('#comparison-summary')).to_contain_text('Status at check')
        expect(page.locator('#comparison-summary')).to_contain_text('Reported or observed redirect')
        expect(page.locator('#comparison-panels section')).to_have_count(2)
        print('PASS: repeat checks, timeline and last-two comparisons')

        page.get_by_role('tab',name='Records + Add').click()
        page.locator('#record-search').fill('sample.png')
        expect(page.locator('#result-count')).to_contain_text('1 of 2')
        page.locator('#record-search').fill('')
        page.locator('#status-filter').select_option('unavailable')
        expect(page.locator('#result-count')).to_contain_text('0 of 2')
        page.locator('#status-filter').select_option('')
        page.reload()
        expect(page.locator('#result-count')).to_contain_text('2 of 2')
        print('PASS: filters and storage persistence after reload')

        page.get_by_role('tab',name='Safety + Backup').click()
        with page.expect_download() as downloaded:
            page.locator('#export-json').click()
        file=Path(downloaded.value.path()).read_bytes()
        saved=json.loads(file)
        assert len(saved['checks'])==2
        page.locator('#import-json').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':file})
        expect(page.locator('#backup-message')).to_contain_text('Merged 0 new checks')
        bad=json.loads(file)
        bad['checks'][0]['observedData']='conflicting history'
        page.locator('#import-json').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':json.dumps(bad).encode()})
        expect(page.locator('#backup-message')).to_contain_text('Import rejected')
        assert len(json.loads(page.evaluate(f'localStorage.getItem({json.dumps(KEY)})'))['checks'])==2
        print('PASS: export, deduplication, conflict rejection and no silent overwrite')

        for width in [320,360,412,768,1280]:
            page.set_viewport_size({'width':width,'height':820})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),width
        page.set_viewport_size({'width':360,'height':800})
        page.get_by_role('tab',name='Records + Add').click()
        page.screenshot(path='hypestat-observations-mobile.png',full_page=True)
        page.set_viewport_size({'width':1280,'height':860})
        page.screenshot(path='hypestat-observations-desktop.png',full_page=True)
        assert all(request.startswith('http://127.0.0.1:8765/') for request in requests),requests
        assert not errors,errors
        print('PASS: five responsive viewports, no external requests or browser exceptions')
        browser.close()

if __name__=='__main__':
    run()
