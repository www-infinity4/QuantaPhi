import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TARGETS,inspectPage,checkSitemap} from '../scripts/audience-audit.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const SITE='https://quantaphi.org';

test('privacy page is public, descriptive, indexable and contains Google advertising disclosures',()=>{
  const html=read('privacy.html');
  const info=inspectPage({html,status:200,url:SITE+'/privacy.html'});
  assert.equal(info.healthy,true,JSON.stringify(info.findings));
  for(const term of ['Google Analytics','Google AdSense','cookies','web beacons','IP address',
   'personalization','myadcenter.google.com','optout.aboutads.info',
   'Cloudflare','Bubbles','wallet','IndexedDB','local storage','retention','children']){
    assert.ok(html.toLowerCase().includes(term.toLowerCase()),'Missing disclosure: '+term);
  }
  assert.match(html,/A dedicated privacy-request email or secure form has not yet been published/);
});

test('every indexable landing page links to the privacy policy in a visible footer',()=>{
  const map={
    '/':'index.html',
    '/about.html':'about.html',
    '/privacy.html':'privacy.html',
    '/bubbles.html':'bubbles.html',
    '/video-studio.html':'video-studio.html',
    '/explore/':'explore/index.html',
    '/learn/':'learn/index.html',
    '/learn/ruthenium/':'learn/ruthenium/index.html',
    '/learn/atomic-number/':'learn/atomic-number/index.html',
    '/learn/search-to-quants/':'learn/search-to-quants/index.html'
  };
  for(const path of Object.values(map)){
    const html=read(path);
    assert.match(html,/<footer\b[^>]*>[\s\S]*?href="\/privacy\.html"[\s\S]*?<\/footer>/i,'Footer link missing on '+path);
  }
  for(const path of TARGETS)assert.ok(map[path],'Add test mapping for audited URL '+path);
});

test('sitemap lists the privacy page and has no duplicate URLs',()=>{
  const xml=read('sitemap.xml');
  const expected=TARGETS.map(path=>SITE+path);
  const result=checkSitemap(xml,expected);
  assert.equal(result.healthy,true,JSON.stringify(result));
  assert.ok(xml.includes('<loc>'+SITE+'/privacy.html</loc>'));
});
