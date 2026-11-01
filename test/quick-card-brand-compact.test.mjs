import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Google and CNN source hero images are compact only in the Oracle viewer on small screens',()=>{
 const css=src('quick-card-brand-compact.css');
 const main=src('index.html');
 assert.match(main,/quick-card-brand-compact\.css\?v=20261101-compact1/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/\.qcx-art\[data-brand="google"\]/);
 assert.match(css,/\.qcx-art\[data-brand="cnn"\]/);
 assert.match(css,/min-height:96px/);
 assert.match(css,/\.qcx-google-wordmark/);
 assert.doesNotMatch(css,/display:none/);
 assert.doesNotMatch(css,/\.qca-controls/);
});
