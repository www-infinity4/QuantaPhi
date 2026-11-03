import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import api,{allowsOrigin,communityLead,validatePublicPoll} from '../workers/stay-in-vote/worker.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const dbSql=()=>read('workers/stay-in-vote/migrations/0001_votes.sql');

test('public polls are explicitly community-only, not certified elections',()=>{
 assert.equal(validatePublicPoll({id:'community-research-2026',kind:'community',title:'Research first',status:'open'}),true);
 assert.equal(validatePublicPoll({id:'community-research-2026',kind:'official',title:'Research first',status:'open'}),false);
 assert.equal(communityLead([{id:'a',votes:3},{id:'b',votes:1}]),'a');
 assert.equal(communityLead([{id:'a',votes:3},{id:'b',votes:3}]),null);
 assert.equal(communityLead([{id:'a',votes:0},{id:'b',votes:0}]),null);
});

test('one server-side ballot per verified voter and community-only editorial layer',()=>{
 const sql=dbSql();
 assert.match(sql,/PRIMARY KEY\s*\(poll_id,\s*voter_hash\)/i);
 assert.match(sql,/CHECK\s*\(voice IN \('infinity','bubbles'\)\)/i);
 assert.match(sql,/CHECK\s*\(kind='community'\)/i);
 assert.match(sql,/CHECK\s*\(length\(voter_hash\)=64\)/i);
 const worker=read('workers/stay-in-vote/worker.mjs');
 assert.match(worker,/ON CONFLICT\(poll_id,voter_hash\)/);
 assert.match(worker,/crypto\.subtle\.sign\('HMAC'/);
 assert.doesNotMatch(worker,/winnerOfOfficialElection|autoCertify|mintToken|wallet_balance|new URL\(req.url\).searchParams.get\('winner'\)/);
});

test('missing database yields safe nonvoting response',async()=>{
 const res=await api.fetch(new Request('https://quantaphi.org/api/stay-in-vote'),{});
 assert.equal(res.status,503);
 assert.equal((await res.json()).ok,false);
});

test('reject cross-origin ballot post before trusting authorization',async()=>{
 const res=await api.fetch(new Request('https://quantaphi.org/api/stay-in-vote/ballot',{
  method:'POST',headers:{origin:'https://attacker.example',authorization:'Bearer sq_'+('a'.repeat(40)),'content-type':'application/json'},
  body:JSON.stringify({pollId:'community-research-2026',choiceId:'candidate-records'})
 }),{});
 assert.equal(res.status,403);
 assert.equal(res.headers.get('access-control-allow-origin'),null);
 assert.equal(allowsOrigin('https://quantaphi.org'),true);
 assert.equal(allowsOrigin('https://www.quantaphi.org'),true);
 assert.equal(allowsOrigin('https://attacker.example'),false);
});

test('missing identity binding never fabricates a posted ballot',async()=>{
 const res=await api.fetch(new Request('https://quantaphi.org/api/stay-in-vote/ballot',{
  method:'POST',headers:{origin:'https://quantaphi.org',authorization:'Bearer sq_'+('a'.repeat(40)),'content-type':'application/json'},
  body:JSON.stringify({pollId:'community-research-2026',choiceId:'candidate-records'})
 }),{VOTES_DB:{prepare(){throw Error('no access to D1')}}});
 assert.equal(res.status,503);
 assert.equal((await res.json()).ok,false);
});

test('new interactive card is registered without changing vote percentages or official outcomes',()=>{
 const home=read('index.html'),deck=read('oracle-card-deck.js');
 assert.match(home,/id="stayInVoteCard"/);
 assert.match(home,/stay-in-vote\.mjs/);
 assert.match(deck,/\['stayInVoteCard','Stay In & Vote/);
 const script=read('stay-in-vote.mjs');
 assert.match(script,/QuantaCloudConnection/);
 assert.match(script,/authenticatedFetch/);
 assert.match(script,/Official results are determined by election authorities/);
 assert.doesNotMatch(script,/localStorage\.setItem\([^)]*ballot/);
});
