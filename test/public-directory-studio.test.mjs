import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DIRECTORY_SOURCES,directorySearch,publicListingValid,safeProfileDraft} from '../directory/records.mjs';
import {STUDIO_SONGS,findSongs,songLinkValid,OFFICIAL_SONGBOOK} from '../studio/songbook.mjs';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('public phone entries have validated official-source contact numbers, not harvested private people',()=>{
 assert.ok(DIRECTORY_SOURCES.length>=10);
 assert.equal(new Set(DIRECTORY_SOURCES.map(x=>x.id)).size,DIRECTORY_SOURCES.length);
 for(const entry of DIRECTORY_SOURCES){
  assert.ok(publicListingValid(entry),entry.id);
  assert.match(entry.source,/^https:\/\//);
  assert.match(entry.verifiedAt,/^\d{4}-\d\d-\d\d$/);
  assert.notEqual(entry.kind,'professional');
 }
 const phones=DIRECTORY_SOURCES.filter(x=>x.phone);
 assert.ok(phones.length>=3);
 assert.deepEqual(phones.map(x=>x.id).sort(),['nasa-inquiries','national-archives','usagov']);
 assert.ok(phones.every(x=>x.publicationBasis==='official_contact'));
});
test('search finds public organizations, websites and validated phone numbers without generating names',()=>{
 const found=directorySearch(DIRECTORY_SOURCES,{query:'202-358-0001'});
 assert.equal(found.length,1);assert.equal(found[0].id,'nasa-inquiries');
 assert.equal(directorySearch(DIRECTORY_SOURCES,{kind:'professional'}).length,0);
 assert.ok(directorySearch(DIRECTORY_SOURCES,{kind:'website',query:'music'}).some(x=>x.id==='starmaker'));
 assert.equal(directorySearch(DIRECTORY_SOURCES,{query:'unlisted private contact'}).length,0);
 assert.equal(publicListingValid({...DIRECTORY_SOURCES[0],kind:'professional',publicationBasis:'official_contact'}),false);
 assert.equal(publicListingValid({...DIRECTORY_SOURCES[0],facebook:'https://evil.example/profile'}),false);
 assert.equal(publicListingValid({...DIRECTORY_SOURCES[0],phone:'+1123'}),false);
});
test('unverified submitted business details remain a private, not indexable preview',()=>{
 const info={name:'Example Repair Shop',website:'https://example.com',description:'A sample website for verified professional repair services and support.'};
 const draft=safeProfileDraft({...info,phone:'+12025550123',email:'help@example.com',
  facebook:'https://www.facebook.com/example',x:'https://x.com/example'});
 assert.equal(draft.ok,true);
 assert.equal(draft.draft.public,false);
 assert.equal(draft.draft.searchIndexable,false);
 assert.equal(publicListingValid({...draft.draft,id:'example-service',verifiedAt:'2026-10-23',kind:'professional',source:info.website}),false);
 assert.equal(safeProfileDraft({...info,phone:'5551234'}).ok,false);
 assert.equal(safeProfileDraft({...info,facebook:'https://malicious.test/fake'}).ok,false);
 assert.equal(safeProfileDraft({...info,website:'javascript:alert(1)'}).ok,false);
});
test('StarMaker songs are exact, independently verifiable external song URLs, not mirrored audio',()=>{
 assert.equal(new Set(STUDIO_SONGS.map(x=>x.id)).size,STUDIO_SONGS.length);
 for(const song of STUDIO_SONGS){assert.ok(songLinkValid(song),song.id);assert.equal(song.artStatus,'original_card_art_only')}
 assert.equal(findSongs('perfect').length,1);
 assert.equal(findSongs('ed sheeran').length,2);
 assert.equal(findSongs('abcdefg').length,0);
 assert.equal(OFFICIAL_SONGBOOK,'https://www.starmakerstudios.com/en/songs');
 assert.equal(songLinkValid({...STUDIO_SONGS[0],url:'https://starmaker.example/track.mp3'}),false);
});
test('real home directory cards, existing Infinity Viewer, Bubbles catalog and sitemap are connected',()=>{
 const home=file('index.html'),deck=file('oracle-card-deck.js'),catalog=file('bubbles-card-catalog.mjs'),sitemap=file('sitemap.xml');
 assert.match(home,/id="quantaDirectoryCards"/);
 assert.match(home,/\/directory\/\?kind=organization/);
 assert.match(home,/\/directory\/\?kind=website/);
 assert.match(home,/\/studio\//);
 assert.match(home,/inPageSite/);
 assert.match(deck,/quantaDirectoryCards/);
 for(const id of ['public-directory','website-directory','starmaker-studio'])
  assert.ok(catalog.includes("'"+id+"'"),id);
 assert.match(sitemap,/https:\/\/quantaphi\.org\/directory\//);
 assert.match(sitemap,/https:\/\/quantaphi\.org\/studio\//);
 const source=file('source-quick-cards.mjs');
 assert.match(source,/card\.id==='starmaker'/);
 assert.match(source,/Search songs \+ record your voice in QuantaPhi/);
});
test('directory is searchable and accessible without collecting a public people phonebook',()=>{
 const html=file('directory/index.html'),script=file('directory/directory.mjs');
 assert.match(html,/name="robots" content="index,follow"/);
 assert.match(html,/id="directoryResults"/);
 assert.match(html,/id="listingDraftForm"/);
 assert.match(html,/id="draftConsent"/);
 assert.match(html,/https:\/\/schema\.org/);
 assert.match(script,/sessionStorage\.setItem/);
 assert.match(script,/public:false|public = false|safeProfileDraft/);
 assert.doesNotMatch(script,/fetch\(|XMLHttpRequest|navigator\.contacts/);
 assert.match(file('privacy.html'),/Public directories:/);
});
test('studio uses tap-gated MediaRecorder, optional device-supplied backing, local playback',()=>{
 const html=file('studio/index.html'),script=file('studio/studio.mjs');
 assert.match(html,/id="recordStart"/);
 assert.match(html,/id="recordStop"/);
 assert.match(html,/id="recordedPlayer"/);
 assert.match(html,/id="backingFile"/);
 assert.match(html,/Microphone is OFF/);
 assert.match(script,/start\.addEventListener\('click',async/);
 assert.match(script,/navigator\.mediaDevices\.getUserMedia/);
 assert.match(script,/MediaRecorder/);
 assert.match(script,/createMediaStreamDestination/);
 assert.match(script,/URL\.createObjectURL/);
 assert.match(script,/getTracks\(\)\.forEach\(t=>t\.stop\(\)\)/);
 assert.doesNotMatch(script,/fetch\(|sendBeacon|localStorage\.setItem|upload\.php|R2_BUCKET/);
 assert.match(file('privacy.html'),/Local singing studio:/);
});
