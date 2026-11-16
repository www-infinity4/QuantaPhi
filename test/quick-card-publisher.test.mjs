import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{safeUrl,youtubeId,normalizeCard,cardHtml} from '../workers/quick-card-publisher/worker.mjs';
const valid={title:'Google Search Widget',website:'https://www.google.com/',description:'Search for real results from the original Google website.',interactionRequest:'Let the visitor enter a query and open the real search results.',kind:'search',searchTemplate:'https://www.google.com/search?q={query}'};
test('safe HTTPS source only; never local or credential URLs',()=>{
 assert.equal(safeUrl('http://google.com/'),'');
 assert.equal(safeUrl('https://127.0.0.1/test'),'');
 assert.equal(safeUrl('https://user:pass@example.com/'),'');
 assert.equal(safeUrl('https://example.com/path#fragment'),'https://example.com/path');
});
test('real-site search template is required',()=>{
 assert.equal(normalizeCard(valid).card.kind,'search');
 assert.match(normalizeCard({...valid,searchTemplate:'https://evil.com?q={query}'}).error,/same website/i);
 assert.match(normalizeCard({...valid,searchTemplate:'https://www.google.com/search'}).error,/real search/i);
});
test('video requires real YouTube ID, not arbitrary iframe',()=>{
 assert.equal(youtubeId('https://www.youtube.com/watch?v=jfKfPfyJRdk'),'jfKfPfyJRdk');
 assert.equal(youtubeId('https://evil.com/watch?v=jfKfPfyJRdk'),'');
 assert.match(normalizeCard({...valid,kind:'video',video:'https://evil.com/video'}).error,/valid public YouTube/i);
});
test('safe OG rendering escapes creator text and unlisted pages refuse indexing',()=>{
 const row={slug:'example-12345',title:'<img onerror=alert(1)>',description:'A "description" & more',interaction_request:'Test',website:'https://example.com',image:'',kind:'visit',search_template:'',video_id:'',status:'unlisted',created_at:'2026-10-24T00:00:00Z'};
 const html=cardHtml(row);
 assert.doesNotMatch(html,/<img onerror/);
 assert.match(html,/&lt;img/);assert.match(html,/noindex,follow/);
 assert.match(html,/https:\/\/quantaphi.org\/cards\/example-12345/);
});
test('anonymous browsing never reads unlisted cards into Public rotation',async()=>{
 const queries=[];
 const db={prepare(q){queries.push(q);return {bind(){return this},async all(){return {results:[]}}}}};
 const response=await worker.fetch(new Request('https://quantaphi.org/api/quick-cards'),{CARDS_DB:db});
 assert.equal(response.status,200);
 assert.equal((await response.json()).cards.length,0);
 assert.match(queries[0],/status='approved'/);
});
test('untrusted origin cannot publish',async()=>{
 const response=await worker.fetch(new Request('https://quantaphi.org/api/quick-cards',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(valid)}),{CARDS_DB:{}});
 assert.equal(response.status,403);
});
