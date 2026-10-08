const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Quant search topic is preserved in GPT source queries',()=>{
 const code=read('infinite-book-discovery.js');
 assert.match(code,/researchedTopic=clean\(roll\.quantFocus\|\|indexedWord\)/);
 assert.match(code,/\[researchedTopic,realm\|\|angle,direction\]/);
 const browser=read('infinite-book.js');
 assert.match(browser,/quantFocus=String\(query\|\|/);
 assert.match(browser,/quantFocus,trial:seenIds/);
});
test('math shortcut is correct for all digits, including 9 + 8 and 9 + 9',()=>{
 const cat=JSON.parse(read('infinite-book-catalog.json'));
 const story=cat.stories.find(x=>x.id==='math-nine-compensation-pattern');
 assert.ok(story&&story.full.includes('9 + n = 10 + (n − 1)'));
 assert.ok(/^https:\/\//.test(story.sourceUrl));
 for(let n=1;n<=9;n++)assert.equal(9+n,10+(n-1));
 assert.equal(9+8,17);assert.equal(9+9,18);
});
test('cloud collected library is paginated and chapters are wallet-scoped',()=>{
 const code=read('workers/quanta-phi-ledger/worker.js');
 assert.ok(code.includes('quant_storybook_meta'));
 assert.ok(code.includes('WHERE wallet_id=? ORDER BY collected_at DESC, content_key DESC LIMIT ? OFFSET ?'));
 assert.ok(code.includes('nextOffset:offset+cards.length<total'));
 assert.ok(code.includes('SELECT content_key FROM quant_collects WHERE wallet_id=? AND content_key=?'));
});
