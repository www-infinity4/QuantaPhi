const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
function card(){
 const window={};
 const document={getElementById:()=>null};
 vm.runInNewContext(read('phi-scholastic-data.js'),{window,document,URL,URLSearchParams,location:{href:'https://quantaphi.org/'}});
 return window.PhiScholasticData;
}
test('Brand is a filter on RadioShack rather than a standalone new search',()=>{
 const {scopedTerm,selectionQueries}=card();
 assert.equal(scopedTerm('Brand','RadioShack'),'RadioShack Brand');
 assert.equal(scopedTerm('model','RadioShack'),'RadioShack model');
 assert.equal(scopedTerm('RadioShack','RadioShack'),'RadioShack');
 assert.equal(scopedTerm('Tandy Corporation','RadioShack'),'Tandy Corporation');
 assert.deepEqual(Array.from(selectionQueries('RadioShack',['Brand','Model','Brand','Tandy Corporation'])),['RadioShack Brand','RadioShack Model','Tandy Corporation']);
});
test('Scholastic Reader is genuinely text-first, while Data Extraction can retain its artwork',()=>{
 const source=read('phi-scholastic-data.js'),css=read('phi-scholastic-data.css');
 assert.ok(!source.includes('phi-scholastic-reader.webp'));
 assert.match(source,/if\(kind==='data'\)/);
 assert.match(css,/qreader-text-only/);
});
test('Compare displays one evidence row per selected subject and persists comparison history',()=>{
 const code=read('phi-scholastic-data.js');
 assert.match(code,/qdata-comparison-table/);
 assert.match(code,/for\(const item of byTerm\)/);
 assert.match(code,/await saveToCurrent\(snapshot.tokenId,\[\],comparison\)/);
 assert.match(code,/sourceQuery:x.query/);
});
test('Purple assimilation only offers search-backed overlapping subjects or extracted entities',()=>{
 const code=read('phi-assimilation.js');
 assert.match(code,/const qs=terms\(q\),qc=cats\(q\)/);
 assert.match(code,/x.overlap>0/);
 assert.match(code,/No relevant earlier Quants/);
});
test('Music Quant balance is not capped by the first 500 receipts',()=>{
 const code=read('workers/quanta-phi-ledger/worker.js');
 assert.match(code,/SELECT COUNT\(\*\) AS count FROM music_quants/);
 assert.match(code,/balance: Number\(total\?\.count \|\| 0\)/);
 assert.match(code,/has_more: offset \+ quants.length/);
});
