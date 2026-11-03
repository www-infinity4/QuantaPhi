import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

const source=readFileSync(new URL('../published-quick-cards-feed.js',import.meta.url),'utf8')
  .replace(/^import \{paintCard\} from .*;\s*/m,'');
const card=(slug,status='approved')=>({slug,status,title:slug,website:'https://example.com'});
function render(cards,existing=[]){
 const nodes=[...existing.map(id=>({dataset:{sourceId:id}}))];
 let appends=0,painted=0;
 const events=[];
 const bank={
  querySelector(selector){const id=selector.match(/\[data-source-id="([^"]+)"\]/)?.[1];return nodes.find(n=>n.dataset.sourceId===id)||null},
  append(arg){appends++; if(arg.children){nodes.push(...arg.children);arg.children=[]}else nodes.push(arg)}
 };
 const document={readyState:'loading',addEventListener(){},getElementById(id){return id==='siteQuickCards'?bank:null},
  createElement(){return {className:'',dataset:{},classList:{add(){}}}},
  createDocumentFragment(){return {children:[],append(node){this.children.push(node)}}}
 };
 const context={document,window:{dispatchEvent(e){events.push(e)}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},
  paintCard(_holder,card){painted++;if(card.fail)throw Error("invalid creator card");return {dataset:{},classList:{add(){}}}}};
 runInNewContext(source+'\nattachCards(__cards)',{...context,__cards:cards});
 return {nodes,appends,painted,events};
}

test('mounts all approved cards with one live DOM insertion and one readiness event',()=>{
 const {nodes,appends,events}=render([card('first-item'),card('second-item'),card('third-item')]);
 assert.equal(nodes.length,3);
 assert.equal(appends,1,'off-screen document fragment should be appended once');
 assert.equal(events.length,1);
 assert.equal(events[0].detail.count,3);
});

test('ignores duplicate slugs inside one API batch and already mounted cards',()=>{
 const r=render([card('first-item'),card('first-item'),card('second-item'),card('third-item','draft')],['published-second-item']);
 assert.equal(r.nodes.length,2);
 assert.equal(r.painted,1);
 assert.equal(r.events[0].detail.count,1);
});

test('does not dispatch ready or mutate DOM when nothing qualifies',()=>{
 const r=render([card('draft-item','draft'),card('BAD_SLUG')]);
 assert.equal(r.appends,0);
 assert.equal(r.events.length,0);
});

test('a malformed approved card does not prevent the rest of the batch from appearing',()=>{
 const r=render([card('one-card'),{...card('broken-card'),fail:true},card('three-card')]);
 assert.equal(r.nodes.length,2);
 assert.equal(r.appends,1);
 assert.equal(r.events[0].detail.count,2);
});

test('homepage pins the current creator feed revision so old cached modules are not served',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('<script type="module" src="/published-quick-cards-feed.js?v=20261103-creator-batch1"></script>'), 'expected fresh creator-feed script URL in homepage');
});
