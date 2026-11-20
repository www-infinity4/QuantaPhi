'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('bubbles-ai.css','utf8');

test('Bubbles Notes uses legible mobile cards rather than a 92-pixel notebook',()=>{
 assert.match(css,/\/\* Notes readability upgrade: keep saved notes untouched/);
 const rules=css.slice(css.indexOf('/* Notes readability upgrade: keep saved notes untouched'));
 assert.match(rules,/\.ba-panel \.ba-notes\s*\{[^}]*max-height:none/s);
 assert.match(rules,/\.ba-panel \.ba-note p\s*\{[^}]*font-size:16px/s);
 assert.match(rules,/\.ba-tools-viewer-content \.ba-notes\s*\{[^}]*max-height:65dvh/s);
 assert.match(rules,/\.ba-panel \.ba-note \.ba-remove\s*\{[^}]*min-height:44px/s);
});
