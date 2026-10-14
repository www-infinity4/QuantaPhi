import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyWindowArbitration} from './arbitration-evidence.mjs';
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
const before='<button class="play">Play</button>';
const after='<button class="play" aria-label="Play">Play</button>';
const base='<main>'+before+'</main>';
const packet={edits:[{path:'index.html',before,after}],source:{'index.html':{kind:'existing',totalChars:base.length,sha256:digest(base),windows:[{start:0,end:base.length,text:base,sha256:digest(base)}]}},patchedHashes:{'index.html':digest('<main>'+after+'</main>')},patched:{}};
test('a full-file digest can be approved with verified bounded source windows',async()=>{assert.deepEqual(await verifyWindowArbitration(packet,digest),packet.patchedHashes)});
test('wrong hash, unshown patch and tampered snippet all fail closed',async()=>{
 const a=structuredClone(packet);a.patchedHashes['index.html']='a'.repeat(63);
 await assert.rejects(()=>verifyWindowArbitration(a,digest),/hashes_mismatch/);
 const b=structuredClone(packet);b.edits[0].before='unseen original text';
 await assert.rejects(()=>verifyWindowArbitration(b,digest),/outside_inspected/);
 const c=structuredClone(packet);c.source['index.html'].windows[0].sha256='0'.repeat(64);
 await assert.rejects(()=>verifyWindowArbitration(c,digest),/hash_mismatch/);
 const d=structuredClone(packet);d.patched['index.html']='unauthorized change';
 await assert.rejects(()=>verifyWindowArbitration(d,digest),/small_file_hash_mismatch/);
});
test('unsafe paths and unknown files never get through',async()=>{
 const bad=structuredClone(packet);bad.edits[0].path='../secret';
 await assert.rejects(()=>verifyWindowArbitration(bad,digest),/patch_invalid/);
 const extra=structuredClone(packet);extra.patchedHashes['wallet.js']='b'.repeat(64);
 await assert.rejects(()=>verifyWindowArbitration(extra,digest),/hashes_mismatch/);
});
