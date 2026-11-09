import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceMatchesChangedSource,verifyPinnedSourceTestLinks} from '../workers/infinity-brain-clock/source-review-test-links.mjs';

test('existing tracked source links are resolved from test directory or repository CWD',()=>{
 assert.equal(referenceMatchesChangedSource(
  "import {QUICK_CARD_SOURCES} from '../source-quick-cards.mjs';",
  'test/source-quick-cards.test.mjs',['source-quick-cards.mjs']),true);
 assert.equal(referenceMatchesChangedSource(
  'const data=fs.readFileSync("js/youtube-only-catalog.js","utf8");',
  'tests/playback-catalog.test.js',['js/youtube-only-catalog.js']),true);
 assert.equal(referenceMatchesChangedSource(
  "import './gate.mjs';",'lib/gate.test.mjs',['lib/gate.mjs']),true);
 assert.equal(referenceMatchesChangedSource(
  "import '../lib/gate.mjs';",'tests/legacy/gate.test.mjs',['lib/gate.mjs']),false);
 assert.equal(referenceMatchesChangedSource(
  "const gate=readFileSync(new URL('../lib/gate.mjs',import.meta.url),'utf8');",
  'tests/gate.test.mjs',['lib/gate.mjs']),true);
});

test('only actual executable source references count, never comments, strings or foreign URLs',()=>{
 const changed=['lib/gate.mjs'],name='tests/fake.test.mjs';
 for(const fake of [
  "// import '../lib/gate.mjs';",
  "/* import '../lib/gate.mjs'; */",
  "const note = \"import '../lib/gate.mjs';\";",
  "const note = 'readFileSync(\"lib/gate.mjs\")';",
  'const text=readFileSync(new URL("../lib/gate.mjs","https://other.test/base/"))',
  'const text=readFileSync("../lib/gate.mjs","utf8")'
 ])assert.equal(referenceMatchesChangedSource(fake,name,changed),false,fake);
});

test('Brain independently fetches pinned test files and rejects unrelated or unpinned paths',async()=>{
 const repo='www-infinity4/QuantaPhi',sourceSha='a'.repeat(40);
 const changed=['source-quick-cards.mjs'];
 const github=async url=>{
  assert.match(url,/^repos\/www-infinity4\/QuantaPhi\/contents\/test\/source-quick-cards\.test\.mjs\?ref=a{40}$/);
  return {type:'file',encoding:'base64',size:82,content:Buffer.from(
   "import {QUICK_CARD_SOURCES} from '../source-quick-cards.mjs';"
  ).toString('base64')};
 };
 assert.equal(await verifyPinnedSourceTestLinks({repo,sourceSha,changedPaths:changed,
  testPaths:['test/source-quick-cards.test.mjs'],github}),true);
 assert.equal(await verifyPinnedSourceTestLinks({repo,sourceSha,changedPaths:changed,
  testPaths:['test/unrelated.test.mjs'],github:async()=>({type:'file',encoding:'base64',content:Buffer.from(
   "import '../other.mjs';").toString('base64')})}),false);
 for(const paths of [[],['../.env.test.mjs'],['test/x.test.mjs','test/x.test.mjs']])
  assert.equal(await verifyPinnedSourceTestLinks({repo,sourceSha,changedPaths:changed,
   testPaths:paths,github}),false);
});
