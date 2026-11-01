import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('national 21+ directory card is registered once and loaded from homepage',()=>{
 const html=read('index.html'),deck=read('oracle-card-deck.js');
 assert.equal((html.match(/id="cannabisDirectoryCard"/g)||[]).length,1);
 assert.equal((deck.match(/\['cannabisDirectoryCard'/g)||[]).length,1);
 assert.match(html,/cannabis-directory-card\.mjs\?v=20261101-national1/);
 assert.match(html,/cannabis-directory-card\.css\?v=20261101-national1/);
});
test('store source requests happen only after a per-visit display acknowledgment',()=>{
 const js=read('cannabis-directory-card.mjs');
 assert.match(js,/let acknowledged=false/);
 assert.match(js,/if\(!acknowledged\|\|loading\)return/);
 assert.match(js,/enter\.addEventListener\('click',\(\)=>\{acknowledged=true/);
 assert.match(js,/X-Visitor-21-Acknowledged':'true'/);
 assert.match(js,/credentials:'omit',cache:'no-store'/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|walletBalance|SSN|birthdate/);
 assert.doesNotMatch(js,/oracle:activate/);
});
test('unrated, organic medical-only source UI contains no paid product creative',()=>{
 const js=read('cannabis-directory-card.mjs');
 assert.match(js,/row\.medical_only\?'MEDICAL PROGRAM ONLY/);
 assert.match(js,/Unrated · no independent customer-experience evidence reviewed/);
 assert.match(js,/x\.sponsored===false/);
 assert.match(js,/safeUrl\(row\.source_url\)/);
 assert.doesNotMatch(js,/image\.src|product_image|price\s*=|checkout|THC potency/);
});
test('mobile controls and reduced-motion handling are present',()=>{
 const css=read('cannabis-directory-card.css');
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});
