const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const report=read('robot-work-report.js');
const card=read('index.html');
const style=read('robot-directions.css');
const chat=read('bubbles-ai.js');

test('owner report parses and keeps all ticket ages available for blocked review',()=>{
 assert.doesNotThrow(()=>new Function(report));
 assert.match(report,/function allJobs\(tickets\)/);
 assert.match(report,/function reasonGroup\(row\)/);
 assert.match(report,/function summarize\(rows\)/);
 assert.match(report,/requested==='blocked'/);
 assert.match(report,/Review blocked jobs/);
 assert.doesNotMatch(report,/const freshRequest=/);
 assert.doesNotMatch(report,/Exclude jobs older than 7 days/);
});
test('blocked job cards explain fixes in plain English and retain original evidence',()=>{
 assert.match(report,/Why it stopped:/);
 assert.match(report,/Show the recorded technical problem/);
 assert.match(report,/Source details to investigate/);
 assert.match(report,/Repair attempt failed/);
 assert.match(report,/Task is too large/);
 assert.match(report,/Verification missing/);
 assert.match(report,/View GitHub runner evidence/);
 assert.match(style,/robot-work-ticket h4/);
 assert.match(card,/Bubbles plans the work, assigns the bots/);
 assert.doesNotMatch(card,/Tell Bubbles what needs fixing/);
});
test('new requests start automatically without a Run All control',()=>{
 assert.doesNotMatch(chat,/runAllButton/);
 assert.match(chat,/start_immediately:true/);
 assert.match(report,/function writeRequests/);
 assert.match(report,/Bot steps and recorded progress/);
 assert.match(card,/bubbles-ai\.js\?v=20261019-chat-repair1/);
});

test('blocked job history can be paged without losing older upgrades',()=>{
 assert.match(report,/previousBlocked=make\('button'/);
 assert.match(report,/nextBlocked=make\('button'/);
 assert.match(report,/blockedOffset\+=10/);
 assert.match(report,/blockedOffset-10/);
 assert.match(report,/candidates\.slice\(offset,offset\+10\)/);
 assert.match(report,/Blocked jobs /);
 assert.match(card,/robot-work-report\.js\?v=20261019-chat-repair1/);
});
