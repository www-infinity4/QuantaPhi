const test=require('node:test'),assert=require('node:assert/strict');
const {topBrainTasks,brainReportText}=require('../robot-directions.js');
const now=Date.parse('2026-10-14T03:00:00Z');
const ticket=(id,jobs)=>({id,status:'working',updated_at:now-1000,context:{kind:'robot-directions',color_jobs:jobs}});
test('top ten bot jobs are backed by owner tickets, not fabricated bot conversation',()=>{
 const jobs=[{id:'1',agent:'pink-panther',title:'Investigate repository adaptations into cards',repository:'www-infinity4/WidgetPhi',status:'working',queue_priority:80,progress:{summary:'Read source for an existing radio widget',updatedAt:now-10000}},
 {id:'2',agent:'greenbeans',title:'Rebuild Image Generator controls',repository:'www-infinity4/QuantaPhi',status:'queued'},
 {id:'3',agent:'blueberry',title:'D1 ledger trigger repair',repository:'www-infinity4/QuantaPhi',status:'blocked',progress:{blocker:'Live worker not yet deployed'}}];
 const t=ticket('IW-real',jobs);const list=topBrainTasks([t,{id:'unverified',context:{kind:'untrusted',color_jobs:[{title:'fake'}]}}],now);
 assert.equal(list.length,3);
 assert.equal(list[0].phase,'working');assert.match(list[0].statement,/Pink Panther.*Read source/);
 assert.equal(list[1].phase,'queued');assert.match(list[1].statement,/No active execution receipt/);
 assert.equal(list[2].phase,'blocked');assert.match(list[2].statement,/Live worker not yet deployed/);
 const summary=brainReportText(list,now);
 assert.match(summary,/1 have recent execution evidence/);assert.match(summary,/3 highest-ranked recorded tasks/);
});
test('stale or ticket-wide working status does not invent individual running bots',()=>{
 const j={id:'TASK-1',agent:'pink-panther',status:'working',title:'Investigate repository widgets',repository:'www-infinity4/Moltnook',progress:{updatedAt:now-86400000,summary:'Old verification'}};
 const rows=topBrainTasks([ticket('IW-2',[j,{...j,id:'TASK-2',status:'queued'}])],now);
 assert.ok(rows.every(x=>x.phase==='queued'));
 assert.ok(rows.every(x=>x.statement.includes('No active execution receipt')||x.statement.includes('Most recent note')));
 assert.doesNotMatch(rows[0].statement,/currently assigned/);
});
test('top ten sorted by real job state and priority, bounded to ten',()=>{
 const jobs=Array.from({length:17},(_,i)=>({id:'TASK-'+i,agent:'greenbeans',repository:'www-infinity4/QuantaPhi',title:'Task '+i,status:'queued',queue_priority:i}));
 const rows=topBrainTasks([ticket('IW-3',jobs)],now);
 assert.equal(rows.length,10);assert.equal(rows[0].priority,16);assert.equal(rows.at(-1).priority,7);
 assert.match(brainReportText([],now),/not evidence that workers are running/);
});
test('Brain controls favor a real report and automatic payments over check buttons',()=>{
 const fs=require('node:fs'),js=fs.readFileSync('robot-directions.js','utf8');
 assert.match(js,/Top 10 · GPT report/);
 assert.match(js,/120000/);
 assert.match(js,/connectBotEarnings\(\)/);
 assert.match(js,/auditButton\.hidden=true/);
 assert.match(js,/earningsButton\.hidden=true/);
 assert.match(js,/\[data-clear\]/);
});
