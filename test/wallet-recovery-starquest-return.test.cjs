'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('wallet-recovery.html','utf8');
test('StarQuest's cloud wallet recovery has one tightly allowlisted same-origin return',()=>{
 assert.match(html,/const RETURN_TO_STARQUEST=RECOVERY_PARAMS\.get\('returnTo'\)==='\/TV-Database\/'/);
 assert.match(html,/link\.href='\/TV-Database\/'/);
 assert.match(html,/RETURN_TO_BRAIN\?'\/#robotDirections':RETURN_TO_STARQUEST\?'\/TV-Database\/'/);
 assert.doesNotMatch(html,/location\.assign\(RECOVERY_PARAMS\.get\('returnTo'\)\)/);
});
