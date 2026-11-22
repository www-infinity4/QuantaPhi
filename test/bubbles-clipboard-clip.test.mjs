import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareClipboardClip} from '../bubbles-clipboard-clip.mjs';

test('an explicitly pasted clip remains owner-authored evidence with its useful text intact',()=>{
 const item=prepareClipboardClip('  Yellow extraction + Blue import = Green engineering.  ');
 assert.deepEqual(item,{ok:true,text:'Yellow extraction + Blue import = Green engineering.'});
});

test('empty, excessively long and non-text clipboard data are not silently saved',()=>{
 assert.equal(prepareClipboardClip('  ').ok,false);
 assert.equal(prepareClipboardClip(123).ok,false);
 assert.equal(prepareClipboardClip('a'.repeat(6001)).reason,'too_long');
 assert.equal(prepareClipboardClip('hello').reason,'too_short');
});

test('recognizable private keys and access tokens are refused before confirmation',()=>{
 for(const value of ['-----BEGIN PRIVATE KEY----- abc','ghp_'+'a'.repeat(36),'github_pat_'+'A'.repeat(40)]){
  assert.equal(prepareClipboardClip('Copied message: '+value).reason,'sensitive');
 }
});

test('normal multiline pasted ideas are retained without executing embedded instructions',()=>{
 const item=prepareClipboardClip('Layout: Dynamic\nArchive: Compressed\nStream: Continuous\nNode: Decentralized\nBranch: Infinite');
 assert.equal(item.ok,true);
 assert.match(item.text,/Stream: Continuous\nNode: Decentralized/);
});
