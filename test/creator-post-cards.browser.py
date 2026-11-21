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
                        if len(widget_requests) == 1:
                            request.abort()
                        else:
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
                expect(card.get_by_role('link', name='Official event photos')).to_have_attribute('href', 'https://elenacardone.com/elena-cardone-event-gallery/')
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
                expect(card.get_by_role('button', name='Retry original X post', exact=True)).to_be_visible()
                card.get_by_role('button', name='Retry original X post', exact=True).click()
                expect(card.get_by_role('button', name='Original loaded', exact=True)).to_be_visible()
                assert len(widget_requests) == 2, 'Retry must make a fresh provider script request'
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
                page.locator('#oracleCardInventory').click()
                chooser.select_option('source-'+POST)
                expect(stage.locator('[data-source-id="'+POST+'"]')).to_be_visible()
                assert stage.get_attribute('data-switchboard-category') == 'Business & finance'
                page.locator('[data-oracle-feed="following"]').click()
                expect(chooser.locator('option[value="source-elena-cardone"]')).to_have_count(1)
                expect(chooser.locator('option[value="source-'+POST+'"]')).to_have_count(0)
                checks.append(f'{width}px: six original carousel cards, business placement and strict Following')

                # AbbeCAdventures: source data, native card search and consented
                # YouTube iframe only after a human Play click (not playback rights).
                page.goto(base+'/source-quick-card.html?card=abbecadventures-youtube', wait_until='domcontentloaded')
                yt = page.locator('.youtube-creator-post-card')
                expect(yt).to_be_visible()
                expect(yt).to_contain_text('11 source-identified videos')
                assert yt.locator('iframe').count() == 0, 'No video frame before Play'
                yt_search = yt.get_by_role('searchbox', name='Search AbbeCAdventures indexed videos')
                yt_search.fill('daycare')
                expect(yt.get_by_role('status')).to_contain_text('1 of 3')
                yt_search.fill('no-matching-video-xyz')
                expect(yt.get_by_role('status')).to_contain_text('No indexed videos match')
                yt_search.fill('')
                with page.expect_download() as youtube_download:
                    yt.get_by_role('button', name='Export indexed database').click()
                exported_yt = json.loads(Path(youtube_download.value.path()).read_text())
                assert len(exported_yt['videos']) == 11 and exported_yt['coverage']['complete'] is False
                assert exported_yt['coverage']['communityPostsIndexed'] is False
                yt.get_by_role('button', name='Play video in card').click()
                expect(yt.locator('iframe')).to_have_attribute('src', 'https://www.youtube-nocookie.com/embed/cF6XusNOfjM')
                yt.get_by_role('button', name='Stop playback').click()
                expect(yt.locator('iframe')).to_have_count(0)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'YouTube card overflow'
                checks.append(f'{width}px: YouTube catalog, search, JSON export, opt-in iframe, Stop and no overflow')

                page.goto(base+'/?card=abbecadventures-youtube', wait_until='domcontentloaded')
                stage = page.locator('#oracleCardStage')
                expect(stage.locator('[data-source-id="abbecadventures-youtube"] .youtube-creator-post-card')).to_be_visible(timeout=20000)
                chooser = page.locator('#oracleCardChooser')
                expect(chooser.locator('option[value^="source-abbecadventures"]')).to_have_count(12)
                page.locator('#oracleCardDepartment').select_option('media')
                page.locator('#oracleCardInventory').click()
                chooser.select_option('source-abbecadventures-video-6346365875734e4f666a4d')
                expect(stage.locator('[data-source-id="abbecadventures-video-6346365875734e4f666a4d"]')).to_be_visible()
                checks.append(f'{width}px: 12 original YouTube source cards with media placement in Oracle')

                # Julie Deru uses the SAME Abbe player and actual Oracle carousel,
                # with no frame or provider request until the viewer chooses Play.
                page.goto(base+'/source-quick-card.html?card=julie-deru-youtube', wait_until='domcontentloaded')
                julie = page.locator('.youtube-creator-post-card')
                expect(julie).to_be_visible()
                expect(julie).to_contain_text('Julie Deru · Public YouTube videos')
                expect(julie).to_contain_text('2 source-identified videos')
                assert julie.locator('iframe').count()==0
                julie_search=julie.get_by_role('searchbox',name='Search Julie Deru indexed videos')
                julie_search.fill('trees')
                expect(julie.get_by_role('status')).to_contain_text('1 of 1')
                assert julie.get_by_role('link',name='Read original on YouTube').get_attribute('href')=='https://www.youtube.com/watch?v=G6zpr59jEas'
                julie_search.fill('nothing-here-xyz')
                expect(julie.get_by_role('status')).to_contain_text('No indexed videos match')
                julie_search.fill('')
                with page.expect_download() as julie_download:
                    julie.get_by_role('button',name='Export indexed database').click()
                exported_julie=json.loads(Path(julie_download.value.path()).read_text())
                assert len(exported_julie['videos'])==2 and exported_julie['coverage']['complete'] is False
                julie.get_by_role('button',name='Play video in card').click()
                expect(julie.locator('iframe')).to_have_attribute('src','https://www.youtube-nocookie.com/embed/G6zpr59jEas')
                julie.get_by_role('button',name='Stop playback').click()
                expect(julie.locator('iframe')).to_have_count(0)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Julie Deru card overflow'
                page.goto(base+'/?card=julie-deru-youtube',wait_until='domcontentloaded')
                stage=page.locator('#oracleCardStage')
                expect(stage.locator('[data-source-id="julie-deru-youtube"] .youtube-creator-post-card')).to_be_visible(timeout=20000)
                chooser=page.locator('#oracleCardChooser')
                expect(chooser.locator('option[value^="source-julie-deru-"]')).to_have_count(3)
                checks.append(f'{width}px: Julie Deru source Quick Cards, search, export, original link, one-player stop and Oracle placement')

                # A deterministic, source-shaped D1 response tests the NEW family
                # channel interface without assuming external Worker availability in CI.
                family_fixture={'channel':'family-parenting-tv','partial':True,'videos':[
                    {'video_id':'5Ox2EPCwt4s','channel_key':'family-parenting-tv',
                     'title':'National Child Care Compensation Data','publisher':'Child Care Aware® of America',
                     'publisher_url':'https://www.youtube.com/@CCAofAmerica',
                     'source_url':'https://www.youtube.com/watch?v=5Ox2EPCwt4s',
                     'topic':'provider-training','observed_at':'2026-11-20',
                     'published_at':None,'content_boundary':'family-education'}
                ]}
                def family_api(route):
                    route.fulfill(status=200, content_type='application/json',
                        headers={'access-control-allow-origin':base,'access-control-allow-credentials':'false'},
                        body=json.dumps(family_fixture))
                page.route('https://quantaphi-family-parenting-tv.marvaseater.workers.dev/episodes', family_api)
                page.goto(base+'/source-quick-card.html?card=family-parenting-tv', wait_until='domcontentloaded')
                family=page.locator('.qcx-family-tv')
                expect(family).to_be_visible()
                expect(family).to_contain_text('Family education')
                expect(family).to_contain_text('Cloudflare D1 read-only database')
                expect(family.get_by_role('status')).to_contain_text('1 of 1',timeout=10000)
                assert family.locator('iframe').count()==0, 'No family YouTube iframe before click'
                assert family.get_by_role('link',name='Read original on YouTube').get_attribute('href').endswith('5Ox2EPCwt4s')
                family.get_by_role('button',name='Play original in card').click()
                expect(family.locator('iframe')).to_have_attribute('src','https://www.youtube-nocookie.com/embed/5Ox2EPCwt4s')
                family.get_by_role('button',name='Stop playback').click()
                expect(family.locator('iframe')).to_have_count(0)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Family TV overflow'
                page.goto(base+'/?card=family-parenting-tv',wait_until='domcontentloaded')
                expect(page.locator('#oracleCardStage [data-source-id="family-parenting-tv"]')).to_be_visible(timeout=20000)
                assert page.locator('#oracleCardChooser option[value="source-family-parenting-tv"]').count()==1
                checks.append(f'{width}px: separate D1 family channel in Oracle, search/player controls, no autoplay or overflow')
                # Owner-submitted YouTube link: separate general-media video card
                # appears in the original Oracle, with click-only playback.
                reviewed_id='youtube-reviewed-50795577586f5461625041'
                page.goto(base+'/source-quick-card.html?card='+reviewed_id,wait_until='domcontentloaded')
                reviewed=page.locator('.qcx-experience')
                expect(reviewed).to_contain_text('REFRESHING! 6-2-2014')
                expect(reviewed.get_by_role('link',name='Original video on YouTube')).to_have_attribute(
                    'href','https://www.youtube.com/watch?v=PyUwXoTabPA')
                assert reviewed.locator('iframe').count()==0, 'Owner video cannot autoplay before consent'
                reviewed.get_by_role('button',name='Play in card').click()
                expect(reviewed.locator('iframe')).to_have_attribute(
                    'src','https://www.youtube-nocookie.com/embed/PyUwXoTabPA')
                reviewed.get_by_role('button',name='Stop playback').click()
                expect(reviewed.locator('iframe')).to_have_count(0)
                # Owner cards have an in-card View More feed, not a dead link:
                # six per page, more real owner URLs, and verified creator RSS.
                reviewed.get_by_role('button',name='View more videos').click()
                more=reviewed.locator('.qcx-owner-more-videos')
                expect(more).to_be_visible()
                expect(more.get_by_role('combobox',name='Filter by video channel')).to_have_value('owner')
                expect(more.locator('.qcx-mix-entry')).to_have_count(6)
                more.get_by_role('button',name='Load more videos').click()
                assert more.locator('.qcx-mix-entry').count()>=11, 'View More must page actual owner links'
                expect(more).to_contain_text('oxVpgLW2k2c')
                expect(more).to_contain_text('O5wUpS5z4SI')
                more.get_by_role('button',name='Play in card').first.click()
                expect(more.locator('iframe')).to_have_count(1)
                reviewed.locator('form.qcx-search-form').get_by_role('button',name='Play in card').click()
                expect(more.locator('iframe')).to_have_count(0)
                expect(reviewed.locator('iframe')).to_have_count(1)
                reviewed.get_by_role('button',name='Stop playback').first.click()
                expect(reviewed.locator('iframe')).to_have_count(0)
                more.get_by_role('combobox',name='Filter by video channel').select_option('gana')
                assert more.locator('.qcx-mix-entry').count()>=1, 'Verified channel filter must show real seed videos'
                reviewed.get_by_role('button',name='Hide more videos').click()
                expect(more).to_be_hidden()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Reviewed video overflow'
                page.goto(base+'/?card='+reviewed_id,wait_until='domcontentloaded')
                expect(page.locator('#oracleCardStage [data-source-id="'+reviewed_id+'"]')).to_be_visible(timeout=20000)
                assert page.locator('#oracleCardChooser option[value="source-'+reviewed_id+'"]').count()==1
                checks.append(f'{width}px: owner video as its own public Oracle source card, opt-in player and Stop')

                # Mixed YouTube creators: paged source-backed cards, owner additions,
                # opt-in single YouTube frame, saved links, media department.
                page.goto(base+'/source-quick-card.html?card=youtube-creator-mix',wait_until='domcontentloaded')
                mix=page.locator('.youtube-creator-mixed-card')
                expect(mix).to_be_visible()
                expect(mix.locator('.qcx-mix-entry')).to_have_count(6)
                expect(mix.locator('iframe')).to_have_count(0)
                mix.get_by_role('button',name='Load more videos').click()
                assert mix.locator('.qcx-mix-entry').count()>=7, 'Load More should paginate inspected uploads'
                mix.get_by_role('searchbox',name='Search loaded creator videos').fill('ice cream')
                expect(mix.locator('.qcx-mix-entry')).to_have_count(1)
                expect(mix).to_contain_text('Everyone Needed Mama')
                mix.get_by_role('button',name='Play in card').click()
                expect(mix.locator('iframe')).to_have_attribute('src','https://www.youtube-nocookie.com/embed/OqRb8RKNgQQ')
                mix.get_by_role('button',name='Stop playback').click()
                expect(mix.locator('iframe')).to_have_count(0)
                mix.get_by_role('searchbox',name='Search loaded creator videos').fill('')
                mix.get_by_role('textbox',name='Add channel or video').fill('https://youtu.be/O4LxiKwh6E0')
                mix.get_by_role('button',name='Add channel or video').click()
                mix.get_by_role('combobox',name='Filter by video channel').select_option('saved')
                expect(mix.locator('.qcx-mix-entry')).to_have_count(1)
                expect(mix.locator('.qcx-mix-entry')).to_contain_text('O4LxiKwh6E0')
                page.reload(wait_until='domcontentloaded')
                mix=page.locator('.youtube-creator-mixed-card')
                mix.get_by_role('combobox',name='Filter by video channel').select_option('saved')
                expect(mix.locator('.qcx-mix-entry')).to_have_count(1)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mixed YouTube overflow'
                page.goto(base+'/?card=youtube-creator-mix',wait_until='domcontentloaded')
                expect(page.locator('#oracleCardStage [data-source-id="youtube-creator-mix"] .youtube-creator-mixed-card')).to_be_visible(timeout=20000)
                assert page.locator('#oracleCardChooser option[value="source-youtube-creator-mix"]').count()==1
                checks.append(f'{width}px: 3-channel creator mix, Load More, single player, saved owner link, Oracle/media and no overflow')

                # LANDing Autism: independently selectable original publisher card.
                page.goto(base+'/source-quick-card.html?card=landing-autism-youtube',wait_until='domcontentloaded')
                landing=page.locator('.youtube-creator-mixed-card')
                expect(landing).to_be_visible()
                expect(landing).to_contain_text('LANDing Autism · Full channel Quick Card')
                expect(landing.get_by_role('combobox',name='Filter by video channel')).to_have_value('landing')
                expect(landing.locator('.qcx-mix-entry')).to_have_count(6)
                expect(landing.locator('iframe')).to_have_count(0)
                landing.get_by_role('searchbox',name='Search loaded creator videos').fill('Penelope')
                expect(landing).to_contain_text('Penelope Takes Her FIRST STEPS!!')
                landing.get_by_role('button',name='Play in card').click()
                expect(landing.locator('iframe')).to_have_attribute('src','https://www.youtube-nocookie.com/embed/QR_c5m1RLtk')
                landing.get_by_role('button',name='Stop playback').click()
                expect(landing.locator('iframe')).to_have_count(0)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'LANDing Autism Quick Card overflow'
                page.goto(base+'/?card=landing-autism-youtube',wait_until='domcontentloaded')
                expect(page.locator('#oracleCardStage [data-source-id="landing-autism-youtube"] .youtube-creator-mixed-card')).to_be_visible(timeout=20000)
                assert page.locator('#oracleCardChooser option[value="source-landing-autism-youtube"]').count()==1
                checks.append(f'{width}px: LANDing Autism source channel in Oracle, Play/Stop, mobile no overflow')

                context.close()
            browser.close()
    finally:
        if server:
            server.shutdown()
    print(json.dumps({'passed': len(checks), 'checks': checks, 'xPlaybackVerified': False, 'physicalAndroidVerified': False}, indent=2))


if __name__ == '__main__':
    run()
