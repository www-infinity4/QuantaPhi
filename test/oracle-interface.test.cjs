const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('Oracle Octaves CSS is present and loaded between shared and story themes',()=>{
 const index=fs.readFileSync('index.html','utf8');
 const css=fs.readFileSync('oracle-interface.css','utf8');
 const electric=index.indexOf('/phi-electric-theme.css');
 const oracle=index.indexOf('/oracle-interface.css?v=20261013-restored1');
 const stories=index.indexOf('/phi-oracle-story-orange.css');
 assert.ok(electric>=0 && oracle>electric && stories>oracle);
 for(const selector of ['.qzoneRed','.qzoneYellow','.qzoneBlue','.qzoneOrange','.qzonePurple','.qzoneGreen'])
  assert.ok(css.includes(selector),selector+' has a daylight style');
 assert.match(css,/--oracle-surface:#fff/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/background\s*:\s*(?:#0[0-9a-f]{5}|#1[0-9a-f]{5})\b/i);
});
