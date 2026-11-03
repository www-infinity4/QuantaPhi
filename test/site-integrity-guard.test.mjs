import test from 'node:test';
import assert from 'node:assert/strict';
import { scanHtml, repairHtml, evaluateLivePage, isRepairableFile } from '../scripts/site-integrity-guard.mjs';

const broken='<section id="one"></section>\\n<section id="two"><img src=""></section>';

test('RED: detects literal escape text node and applies minimal safe fix', () => {
 const findings=scanHtml(broken,'index.html');
 assert.equal(findings.filter(f=>f.kind==='literal_escaped_newline').length,1);
 const result=repairHtml(broken,'index.html');
 assert.equal(result.source,'<section id="one"></section>\n<section id="two"><img src=""></section>');
 assert.equal(result.fixes.length,1);
 assert.equal(repairHtml(result.source,'index.html').fixes.length,0);
});

test('script templates and examples are never altered',()=>{
 const code='<script>const demo="</section>\\n<section>";</script>\n<section>a</section>\\n<section>b</section>';
 const changed=repairHtml(code,'index.html');
 assert.match(changed.source,/demo="<\/section>\\n<section>"/);
 assert.match(changed.source,/<section>a<\/section>\n<section>b<\/section>/);
 assert.equal(changed.fixes.length,1);
});

test('source scanner reports missing assets, empty images and duplicate ids without guessing repairs',()=>{
 const html='<div id="a"><img src=""><script src="/missing.js"></script></div><div id="a"></div>';
 const problems=scanHtml(html,'index.html',new Set(['index.html']));
 assert.ok(problems.some(x=>x.kind==='duplicate_id'));
 assert.ok(problems.some(x=>x.kind==='empty_image_src'));
 assert.ok(problems.some(x=>x.kind==='missing_local_asset'));
 assert.deepEqual(repairHtml(html,'index.html').fixes,[]);
});

test('only a fixed safe allowlist can be modified',()=>{
 for(const path of ['wallet-runtime.js','workers/wallet/index.html','bubbles-identity-settings.html','coliseum/index.html']){
  assert.equal(isRepairableFile(path),false);
  assert.equal(repairHtml(broken,path).source,broken);
 }
 assert.equal(isRepairableFile('index.html'),true);
});

test('live browser findings exclude third party resources and label broken images truthfully',()=>{
 const check=evaluateLivePage({url:'https://quantaphi.org/',pageErrors:['ReferenceError: nope'],responses:[{url:'https://quantaphi.org/foo.js',status:404},{url:'https://youtube.com/nope',status:404}],images:[{src:'https://quantaphi.org/test.png',complete:true,naturalWidth:0}]});
 assert.deepEqual(check.map(x=>x.kind),['page_exception','same_origin_http_failure','broken_image']);
});
