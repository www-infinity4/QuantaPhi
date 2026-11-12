import test from 'node:test';
import assert from 'node:assert/strict';
import {issueLineGrant, exportPermittedLine} from '../quantai/line-transfer.mjs';

const secret='a-server-only-test-secret-with-at-least-32-chars';
const repository='www-infinity4/Moltnook';
const commit='a'.repeat(40);
const path='guestbook/index.html';
const recipient='user-456';
const now=1793833000000;
const lines=Array.from({length:15},(_,i)=>`private-neighbor-${i+1}`);
lines[12]='    <a class="nav-brand" href="../index.html" aria-label="Moltnook home">';
lines[14]='    </a>';
const source=lines.join('\n');
const grantFor=line=>issueLineGrant({repository,commit,path,line,recipient,expiresAt:now+60_000,secret});
const read=(line,grant,overrides={})=>exportPermittedLine({source,repository,commit,path,line,recipient,grant,secret,now,...overrides});

test('a grant for line 13 exports only that single source line',()=>{
 const result=read(13,grantFor(13));
 assert.equal(result,lines[12]);
 assert.ok(!result.includes('private-neighbor-12'));
 assert.ok(!result.includes('private-neighbor-14'));
});
test('a separate grant for line 15 exports only its closing tag',()=>{
 assert.equal(read(15,grantFor(15)),'    </a>');
});
test('line 13 grant does not authorize a request for line 14 or 15',()=>{
 const grant=grantFor(13);
 assert.throws(()=>read(14,grant),/not authorized/);
 assert.throws(()=>read(15,grant),/not authorized/);
});
test('altered grant and mismatched recipient/commit are rejected',()=>{
 const grant=grantFor(13);
 assert.throws(()=>read(13,grant.slice(0,-2)+'zz'),/not authorized/);
 assert.throws(()=>read(13,grant,{recipient:'another-user'}),/not authorized/);
 assert.throws(()=>read(13,grant,{commit:'b'.repeat(40)}),/not authorized/);
});
test('an expired grant or unavailable line is rejected',()=>{
 assert.throws(()=>read(13,grantFor(13),{now:now+120_000}),/not authorized/);
 assert.throws(()=>read(99,grantFor(99)),/not available/);
});
test('non-integer and invalid line numbers are rejected',()=>{
 assert.throws(()=>grantFor(0),/invalid/);
 assert.throws(()=>grantFor(2.5),/invalid/);
});
