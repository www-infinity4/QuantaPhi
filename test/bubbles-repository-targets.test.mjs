import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('workers/infinity-brain-clock/worker.js','utf8');
const ownerTickets=new Function('digest',source.slice(source.indexOf('export async function ownerTickets'),source.indexOf('async function ownerAuthorized')).replace('export async function','async function')+';return ownerTickets;')(async()=> 'b'.repeat(64));
function environment(){
 let row;
 const db={prepare(sql){return {bind(...values){return {
  async run(){
   if(sql.startsWith('INSERT INTO work_tickets'))row={id:values[0],repository:values[5],title:values[6],request:values[7],context_json:values[9],status:'draft'};
   if(sql.startsWith('UPDATE work_tickets SET context_json=?,storyboard='))Object.assign(row,{context_json:values[0],storyboard:values[1],status:values[2],repository:values[4]});
   return {meta:{changes:1}};
  },async first(){return row;},async all(){return {results:row?[row]:[]};}
 };}}}};
 return {WRITER_OWNER_HASH:'a'.repeat(64),WORK_DB:db};
}
test('ticket creation stores its repository before jobs are attached',async()=>{
 const env=environment();
 const result=await ownerTickets(env,'/work/tickets/create',{request:'Fix menu',repository:'www-infinity4/WidgetPhi',context:{kind:'robot-directions'}});
 assert.equal(result.result.ticket.repository,'www-infinity4/WidgetPhi');
 assert.deepEqual(result.result.ticket.context.repositories,['www-infinity4/WidgetPhi']);
 const bad=await ownerTickets(env,'/work/tickets/update',{id:result.result.ticket.id,status:'ready',context:{kind:'robot-directions',color_jobs:[{id:'TASK-1',repository:'www-infinity4/QuantaPhi',instructions:'Fix menu'}]}});
 assert.equal(bad.result.error,'ticket_repository_mismatch');
});
test('repository batches retain individual results and failures without retargeting',async()=>{
 const ui=readFileSync('bubbles-ai.js','utf8'),seen=[];
 const scope={activeCardEvidence:null,repositorySelectionExplicit:true,repositorySelection:new Set(['www-infinity4/WidgetPhi','www-infinity4/QuantaPhi']),repositoryPicker:{dataset:{}},workStatus:{},submitRepositoryWork:async(request,approval,repository)=>{seen.push(repository);if(repository.endsWith('WidgetPhi'))throw Error('fixture unavailable');return {id:'ticket-1',repository,status:'ready'};}};
 vm.createContext(scope);
 vm.runInContext(ui.slice(ui.indexOf('async function submitWork('),ui.indexOf('async function submitRepositoryWork(')),scope);
 const result=await scope.submitWork('Fix menu');
 assert.deepEqual(seen,['www-infinity4/QuantaPhi','www-infinity4/WidgetPhi']);
 assert.equal(result.tickets.length,1);assert.match(result.batchSummary,/Failed: www-infinity4\/WidgetPhi/);
 assert.equal(scope.repositoryPicker.dataset.submitting,undefined);
});

test('conversation-created ticket carries selected repository and active card evidence',async()=>{
 const ui=readFileSync('bubbles-ai.js','utf8');let payload;
 const scope={TICKETS:'https://brain.test',verifiedOwnerHeaders:async()=>({Authorization:'Bearer fixture'}),brainTools:{},workButton:{disabled:false},workStatus:{},workText:{},crypto,TextEncoder,
  activeCardEvidence:{cardId:'infinity-radio',repository:'www-infinity4/Alien-Radio',errors:['stream unavailable']},
  config:{role:'assistant'},location:{origin:'https://quantaphi.org',pathname:'/bubbles.html'},
  bubblesFetch:async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({ok:true,deduplicated:true,ticket:{id:'existing-ticket',status:'ready',context:{color_jobs:[{repository:payload.repository}]}}})};}};
 vm.createContext(scope);
 vm.runInContext(ui.slice(ui.indexOf('async function submitRepositoryWork('),ui.indexOf("workButton.addEventListener('click'")),scope);
 const result=await scope.submitRepositoryWork('Fix this card','explicit-user-command','www-infinity4/Alien-Radio');
 assert.equal(payload.repository,'www-infinity4/Alien-Radio');
 assert.deepEqual(payload.context.repositories,['www-infinity4/Alien-Radio']);
 assert.equal(payload.context.card_workspace.cardId,'infinity-radio');
 assert.equal(result.repository,'www-infinity4/Alien-Radio');
});
