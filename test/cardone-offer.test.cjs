'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Cardone standalone card is unpublished and no longer indexed',()=>{
 assert.equal(fs.existsSync(path.join(root,'cardone-capital.html')),false);
 for(const p of ['index.html','sitemap.xml','public-card-trends.js','oracle-card-deck.js','bubbles-card-catalog.mjs','tinyfish-card-catalog.mjs'])
  assert.doesNotMatch(read(p),/cardone|church-of-i-am|churchOfIAmCard|cardoneCapitalOffer/i,p);
});
test('other interactive cards are retained',()=>{
 assert.match(read('index.html'),/id="oracleCardDeck"/);
 assert.match(read('index.html'),/id="pixieStoryCard"/);
 assert.match(read('oracle-card-deck.js'),/stage\\.append\\(entry\\.node\\)/);
});
