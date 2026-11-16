import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {X_DRAFT_LIMIT,normalizeXDraft,xDraftIntentUrl,mountXComposer} from '../quanta-x-composer.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('X card posts are local drafts; handoff uses only the real official web intent',()=>{
 assert.equal(X_DRAFT_LIMIT,280);
 assert.equal(normalizeXDraft('  Hello\r\nworld  '),'Hello\nworld');
 const url=new URL(xDraftIntentUrl('  Hello & 🌟 #bubbles  '));
 assert.equal(url.origin,'https://twitter.com');
 assert.equal(url.pathname,'/intent/tweet');
 assert.equal(url.searchParams.get('text'),'Hello & 🌟 #bubbles');
 assert.equal(url.searchParams.size,1);
 for(const input of ['', '  \n ', null, 'x'.repeat(281)]){
  assert.throws(()=>xDraftIntentUrl(input),RangeError);
 }
 assert.equal(Array.from('🌟'.repeat(280)).length,280);
 assert.equal(new URL(xDraftIntentUrl('🌟'.repeat(280))).searchParams.get('text'),'🌟'.repeat(280));
 assert.equal(typeof mountXComposer,'function');
});

test('only a provider-verified X card receives a local composer without a fake OAuth grant',()=>{
 const actions=read('quanta-card-actions.mjs');
 assert.match(actions,/provider\?\.id==='x'/);
 assert.match(actions,/mountXComposer\(bar\)/);
 assert.match(actions,/provider\.compose&&provider\.id!=='x'/);
 const provider=read('quanta-card-provider.mjs');
 assert.match(provider,/accountConnection:provider\?\.connector\?'bubbles-account-page':'not-integrated'/);
 const source=read('quanta-x-composer.mjs');
 for(const prohibited of ['fetch(', 'localStorage', 'sessionStorage', 'document.cookie', 'wallet', '/api/x/post']){
  if(prohibited==='wallet')continue; // Only wallet prohibition is a comment.
  assert.ok(!source.includes(prohibited),prohibited);
 }
 assert.match(source,/No post is sent by QuantaPhi/);
 assert.match(source,/aria-disabled/);
 assert.match(read('quanta-card-experience.css'),/\.qca-x-composer/);
});
