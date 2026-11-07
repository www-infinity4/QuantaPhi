import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
test('retired Church of I AM card does not load in homepage or carousel',()=>{
 const page=read('index.html'),deck=read('oracle-card-deck.js'),catalog=read('bubbles-card-catalog.mjs');
 assert.doesNotMatch(page,/churchOfIAmCard|church-iam-card|Gary Cardone|Church of I AM/i);
 assert.doesNotMatch(deck,/churchOfIAmCard|church-of-i-am/i);
 assert.doesNotMatch(catalog,/church-of-i-am/i);
 assert.equal(existsSync(new URL('church-iam-card.js',root)),false);
 assert.equal(existsSync(new URL('church-iam-card.css',root)),false);
});
