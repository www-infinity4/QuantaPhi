import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const s=readFileSync(
 new URL('../bubbles-ai.js',import.meta.url),'utf8'
);

test('chat does not install training wheels',()=>{
 assert.doesNotMatch(s,/ba-byte-assist/);
 assert.doesNotMatch(s,/Try training wheels/);
 assert.doesNotMatch(s,/updateByteAssist/);
});

test('normal composer and model remain intact',()=>{
 assert.match(s,/composer.append\(input,photoPreview,actions\)/);
 assert.match(s,/const modelChoice=\{value:'bubbles'\}/);
 assert.match(s,/send.type='submit'/);
});

test('OAuth return resumes account initialization',()=>{
 assert.match(s,/function resumeAccountConnection/);
 assert.match(s,/bubbles:oauth-pending:v1/);
 assert.match(s,/void loadAccountConnections\(\)/);
});

test('connector failures have a retry action',()=>{
 assert.match(s,/Retry account connections/);
 assert.match(s,/accountConnectionsLoading=false/);
});
