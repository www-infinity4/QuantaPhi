'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Pixie quick card is a first-class visible Oracle option and opens a real local page',()=>{
 const html=read('index.html'),deck=read('oracle-card-deck.js'),css=read('oracle-card-deck.css'),card=read('pixie-card.css'),page=read('pixie/index.html');
 assert.match(html,/<section id="pixieStoryCard" class="card" aria-labelledby="pixieCardHeading">/);
 assert.match(html,/href="\/pixie\/"/);
 assert.match(html,/data-oracle-spotlight="pixieStoryCard"/);
 assert.match(html,/href="\/pixie-card\.css\?v=/);
 assert.match(deck,/\['pixieStoryCard','Pixie Stories/);
 assert.match(deck,/pixie:'pixieStoryCard'/);
 for(const cls of ['.oracle-card-deck-active:not(.oracle-shelf-open)','.oracle-shelf-open'])assert.ok(css.includes(cls));
 assert.equal((css.match(/#pixieStoryCard/g)||[]).length,2,'collapsed and expanded shelf rules');
 assert.match(card,/#pixieStoryCard/);
 assert.match(page,/<title>Pixie Stories/);
 assert.match(page,/id="storyShelf"/);
 assert.match(page,/id="pixie-chat"/);
 assert.match(page,/id="writer"/);
});
test('Bubbles recognizes Pixie card and routes only to the explicit local path',async()=>{
 const {cards,findCard,cardIntent}=await import('../bubbles-card-catalog.mjs');
 const pixie=findCard('pixie');
 assert.equal(pixie.id,'pixie-stories');
 assert.equal(pixie.url,'/pixie/');
 assert.equal(cardIntent('open pixie card')?.card?.id,'pixie-stories');
 assert.ok(cards.some(c=>c.id==='story-writer'),'existing Story Writer retained');
});
test('Pixie quick card never presents private drafts or claims unconfigured features are active',()=>{
 const card=read('index.html'),page=read('pixie/index.html'),catalog=read('bubbles-card-catalog.mjs');
 assert.match(card,/not activated yet/);
 assert.match(page,/No stories have been published/);
 assert.match(page,/No phone number or SIM data is read/);
 assert.match(page,/writer must first approve|writer must first approve|writer must first accept|writer must first|writer must|writer will sign in/);
 assert.doesNotMatch(page,/navigator\.contacts|navigator\.telephony|PIXIE_BOOTSTRAP_SECRET|PIXIE_SESSION_SECRET|BLOB_READ_WRITE_TOKEN/);
 assert.doesNotMatch(catalog,/infinity-brain-111|PIXIE_LOCK/);
});
