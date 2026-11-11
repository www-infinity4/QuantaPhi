import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suggestFeedSearch, safeSearchSource} from '../quanta-feed-search-assist.mjs';

const cards=[
 {id:'radio-one',name:'Classic Rock Radio',category:'Music',feature:'Rock songs',url:'https://example.org/rock'},
 {id:'science',name:'Rock Science',category:'Science',feature:'Geology',official:'https://science.nasa.gov/'},
 {id:'sneaky',name:'Rock Surprise',category:'Music',url:'javascript:alert(1)'},
 {id:'radio-one',name:'Duplicate Rock',category:'Music',url:'https://example.org/duplicate'},
 {id:'privacy',name:'Sensitive Account',category:'Account',url:'http://insecure.example/'}
];
test('suggestions require a deliberate two-character query and use only catalog items',()=>{
 assert.deepEqual(suggestFeedSearch(cards,''),[]);
 assert.deepEqual(suggestFeedSearch(cards,'r'),[]);
 const matches=suggestFeedSearch(cards,'rock');
 assert.deepEqual(matches.map(x=>x.id),['science','radio-one']);
 assert.equal(matches[0].sourceUrl,'https://science.nasa.gov/');
 assert.ok(matches.every(x=>x.label&&x.category&&x.sourceUrl));
});
test('source URL policy blocks active, insecure and protocol-relative links',()=>{
 assert.equal(safeSearchSource('javascript:alert(1)'),null);
 assert.equal(safeSearchSource('http://example.com'),null);
 assert.equal(safeSearchSource('//example.com'),null);
 assert.equal(safeSearchSource('https://example.com/a'),'https://example.com/a');
 assert.equal(safeSearchSource('/source-quick-card.html?card=x'),'/source-quick-card.html?card=x');
 assert.equal(safeSearchSource('/\\evil'),null);
});
test('matches stay bounded, case insensitive, deduplicated, without query persistence',()=>{
 const long=[...cards,...Array.from({length:50},(_,i)=>({id:'card'+i,name:'Rock '+i,url:'https://example.org/'+i}))];
 const matches=suggestFeedSearch(long,'  ROCK  ',{limit:1000});
 assert.equal(matches.length,8);
 assert.equal(new Set(matches.map(x=>x.id)).size,matches.length);
 assert.ok(matches.every(x=>!('query' in x)&&!('score' in x)));
});
test('the existing Oracle feed uses opt-in filling without automatic form submission',()=>{
 const ui=readFileSync(new URL('../quanta-feed.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../quanta-feed.css',import.meta.url),'utf8');
 assert.match(ui,/suggestFeedSearch/);
 assert.match(ui,/aria-expanded/);
 assert.match(ui,/qf-search-suggestions/);
 assert.match(ui,/addEventListener\('click'/);
 assert.doesNotMatch(ui,/search\.form\.submit\(/);
 assert.match(css,/\.qf-search-suggestions/);
});
