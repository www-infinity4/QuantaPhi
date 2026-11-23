import test from 'node:test';
import assert from 'node:assert/strict';
import {colorPassageStatus,measureWordOrb,suggestFirstWord,acceptWordSuggestion,nextAssistMode} from '../bubbles-byte-assist.mjs';
import {buildWalletColorWindow} from '../workers/unified-wallet/device-color-graph.mjs';
import {webcrypto} from 'node:crypto';

test('the word orb measures UTF-8 bytes and starts with the grapheme the user chose',()=>{
 const word=measureWordOrb('Bubbles is here');
 assert.equal(word.firstWord,'Bubbles');
 assert.equal(word.firstLetter,'B');
 assert.equal(word.bytes,7);
 assert.equal(word.graphemes,7);
 assert.ok(word.orbSizePx>=20&&word.orbSizePx<=62);
 assert.equal(measureWordOrb('  écho example').bytes,5,'UTF-8 not JS character count');
 assert.equal(measureWordOrb('👩‍💻 build').firstLetter,'👩‍💻','first grapheme cluster stays intact');
 assert.equal(measureWordOrb('   ').firstLetter,'');
 assert.equal(measureWordOrb('   ').bytes,0);
});
test('byte orb never reveals private text in a transcript or network packet',()=>{
 const weight=measureWordOrb('private passphrase abcdef');
 assert.equal('draft' in weight,false);
 assert.equal('content' in weight,false);
 assert.equal('tokens' in weight,false);
 assert.equal(weight.firstWord,'private');
 assert.ok(weight.byteWeight>=1);
});
test('one letter may suggest local possible continuations but never writes, sends or executes',()=>{
 const suggestions=suggestFirstWord('B',{mode:'training'});
 assert.ok(suggestions.length>=1);
 assert.ok(suggestions.length<=3);
 assert.ok(suggestions.every(x=>x.source==='local_examples'&&x.requiresTap===true));
 assert.deepEqual(suggestFirstWord('B',{mode:'off'}),[]);
 assert.deepEqual(suggestFirstWord('B',{mode:'training',skipped:4}),[]);
 assert.deepEqual(suggestFirstWord('B',{mode:'fade',accepted:6}),[]);
 assert.deepEqual(suggestFirstWord('password 123456789',{mode:'training'}),[],'do not complete sensitive content');
 assert.deepEqual(suggestFirstWord('B\nsecond paragraph',{mode:'training'}),[],'do not rewrite multiline drafts');
});
test('applying an optional suggestion requires an explicit tap and never replaces later text',()=>{
 const candidates=suggestFirstWord('Bu',{mode:'training'});
 assert.ok(candidates[0].text.startsWith('Bu'));
 assert.equal(acceptWordSuggestion('Bu',candidates[0].text,{explicitTap:true,caretAtEnd:true}),candidates[0].text);
 assert.equal(acceptWordSuggestion('Bu',candidates[0].text,{explicitTap:false,caretAtEnd:true}),'Bu');
 assert.equal(acceptWordSuggestion('Bu',candidates[0].text,{explicitTap:true,caretAtEnd:false}),'Bu');
 assert.equal(acceptWordSuggestion('Bu any extra',candidates[0].text,{explicitTap:true,caretAtEnd:true}),'Bu any extra');
});
test('training wheels ease off when dismissed, never switch themselves on',()=>{
 assert.equal(nextAssistMode('off','accept'),'off');
 assert.equal(nextAssistMode('training','ease_off'),'off');
 assert.equal(nextAssistMode('training','fade'),'fade');
 assert.equal(nextAssistMode('fade','ease_off'),'off');
 assert.equal(nextAssistMode('unknown','accept'),'off');
});
test('RGB color passages align exactly but never become wallet authorization',async()=>{
 const a=await buildWalletColorWindow({
  verifiedAccountId:'account-A',linkedAccountId:'account-A',
  deviceNumbers:['0'.repeat(38)+'1'],crypto:webcrypto
 });
 const b={...a,colors:[...a.colors]};
 const view=colorPassageStatus(a,b,24);
 assert.equal(view.aligned,true);
 assert.equal(view.matchedTiles,11);
 assert.equal(view.passageMask.length,11);
 assert.equal(view.passagesOpenForDisplay,true);
 assert.equal(view.dataAccessGranted,false);
 assert.equal(view.requiresSignedDeviceProof,true);
 assert.equal(view.byteWeight,24);
 assert.equal('payload' in view,false);
 b.colors[3]='#010203';
 const partial=colorPassageStatus(a,b,24);
 assert.equal(partial.aligned,false);
 assert.equal(partial.passagesOpenForDisplay,false);
 assert.equal(partial.matchedTiles,10);
 assert.equal(partial.passageMask[3],false);
});
test('malformed or other-account colors never open even a visual passage',()=>{
 const fake={format:'wallet-color-window/v1',deviceCount:1,colors:Array(11).fill('#abc123'),isAuthentication:false};
 assert.equal(colorPassageStatus(fake,{...fake,deviceCount:2},100).aligned,false);
 assert.equal(colorPassageStatus(fake,{...fake,colors:Array(11).fill('#xxxxxx')},100).aligned,false);
 assert.equal(colorPassageStatus(fake,fake,NaN).byteWeight,0);
});
