import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const script=readFileSync(resolve(root,'phi-assimilation.js'),'utf8');
const page=readFileSync(resolve(root,'index.html'),'utf8');

function element(tagName){
 return {tagName,children:[],dataset:{},className:'',textContent:'',
  append(...items){this.children.push(...items)},
  replaceChildren(...items){this.children=[...items]}};
}
function renderFixture(status='research comparison'){
 const from=script.indexOf('function showPackages(list,packages,q){');
 const to=script.indexOf('async function load(q,sections)',from);
 assert.ok(from>=0 && to>from,'showPackages must exist');
 const document={createElement:element};
 const showPackages=new Function('document','quantBuildUrl',script.slice(from,to)+';return showPackages;')(
  document,(q,topics)=>'/omni-phi/code/?q='+encodeURIComponent([q,...topics].join(' + ')));
 const list=element('ul');
 showPackages(list,[{title:'Materials comparison',connection:'Compare verified properties before drawing conclusions.',topics:['gadolinium oxide'],question:'What does the source evidence show?',status,sourceUrl:'https://example.org/source'}],'aluminum oxide');
 return list.children[0];
}
test('assimilation cards display independently legible sections and functional URLs',()=>{
 const card=renderFixture();
 const [header,summary,connections,question,actions]=card.children;
 assert.equal(card.className,'qassim-package');
 assert.equal(header.className,'qassim-head');
 assert.equal(header.children[0].textContent,'Materials comparison');
 assert.equal(header.children[1].textContent,'Research path');
 assert.equal(summary.className,'qassim-description');
 assert.match(summary.textContent,/verified properties/);
 assert.match(connections.textContent,/gadolinium oxide/);
 assert.match(question.textContent,/Next research question/);
 assert.equal(actions.children.length,3);
 assert.match(decodeURIComponent(actions.children[0].dataset.assimilate),/Compare aluminum oxide/);
 assert.match(actions.children[1].href,/^\/\?q=/);
 assert.match(actions.children[2].href,/^\/omni-phi\/code\/\?q=/);
 assert.equal(card.children.length,5,'conceptual paths cannot pretend to have supporting sources');
});
test('source-backed cards show source, and mobile actions remain tappable',()=>{
 const card=renderFixture('source-backed');
 assert.equal(card.children[0].children[1].textContent,'Source linked');
 const source=card.children.at(-1);
 assert.equal(source.href,'https://example.org/source');
 assert.equal(source.rel,'noopener noreferrer');
 assert.match(page,/#result \.qzonePurple \.qassim-package \.qassim-description\{[^}]*color:#46364f!important/);
 assert.match(page,/#result \.qzonePurple \.qassim-package \.qassim-actions > :is\(button,a\)\{[^}]*min-height:50px/);
 assert.match(page,/@media\(max-width:540px\)\{/);
 assert.match(page,/\/phi-assimilation\.js\?v=20261024-mobile-readable1/);
});
