"""Destiny Barba channel Quick Card: local Chromium proof only, not provider playback proof."""
import functools
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
CARD='destiny-barba-youtube'
START='https://www.youtube.com/watch?v=KTDIFJJB8-4'
UPLOADS='https://www.youtube.com/playlist?list=UUIQHAxjqVnwHwOKtILiWI0Q'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

def run():
    server=None
    base=os.environ.get('CREATOR_TEST_BASE_URL','').rstrip('/')
    if not base:
        server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
        Thread(target=server.serve_forever,daemon=True).start()
        base=f'http://127.0.0.1:{server.server_port}'
    checks=[]
    try:
        with sync_playwright() as p:
            launch={'headless':True}
            if os.environ.get('INFINITY_CHROMIUM_EXECUTABLE'):
                launch['executable_path']=os.environ['INFINITY_CHROMIUM_EXECUTABLE']
            browser=p.chromium.launch(**launch)
            for width in [360,1280]:
                context=browser.new_context(viewport={'width':width,'height':900})
                page=context.new_page()
                def block_external(route):
                    if urlparse(route.request.url).netloc==urlparse(base).netloc:
                        route.continue_()
                    else:
                        route.abort()
                page.route('**/*',block_external)
                page.goto(base+'/source-quick-card.html?card='+CARD,wait_until='domcontentloaded')
                card=page.locator('.youtube-creator-post-card')
                expect(card).to_be_visible()
                expect(card).to_contain_text('Destiny Barba')
                expect(card).to_contain_text('2 original videos indexed')
                expect(card.get_by_role('link',name='View original video')).to_have_attribute('href',START)
                expect(card.get_by_role('link',name='Open original uploads playlist')).to_have_attribute('href',UPLOADS)
                assert card.locator('iframe').count()==0,'No unrequested autoplay/player'
                card.get_by_role('button',name='Play selected video in card').click()
                expect(card.locator('iframe')).to_have_attribute('src','https://www.youtube-nocookie.com/embed/KTDIFJJB8-4')
                card.get_by_role('button',name='Stop playback').click()
                expect(card.locator('iframe')).to_have_count(0)
                card.get_by_role('button',name='Browse all channel uploads in card').click()
                expect(card.locator('iframe')).to_have_attribute('src',
                    'https://www.youtube-nocookie.com/embed/videoseries?list=UUIQHAxjqVnwHwOKtILiWI0Q')
                card.get_by_role('button',name='Stop playback').click()
                card.get_by_role('button',name='Next →').click()
                expect(card.get_by_role('link',name='View original video')).to_have_attribute('href','https://www.youtube.com/watch?v=lQqwcDeZpFg')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Mobile overflow'
                page.goto(base+'/?card='+CARD,wait_until='domcontentloaded')
                expect(page.locator('#oracleCardStage [data-source-id="'+CARD+'"]')).to_be_visible(timeout=20000)
                checks.append(f'{width}px: reviewed channel, playlist embed intent, stop, Oracle placement')
                context.close()
            browser.close()
    finally:
        if server:
            server.shutdown()
    print(json.dumps({'passed':len(checks),'checks':checks,'youtubePlaybackVerified':False,'physicalAndroidVerified':False},indent=2))

if __name__=='__main__':
    run()
