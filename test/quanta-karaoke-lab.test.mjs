import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedKaraokeBacking,normalizeKaraokeEffect,karaokeRecorderMime,KARAOKE_EFFECTS} from '../quanta-karaoke-lab.mjs';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Karaoke effects cannot instantiate arbitrary controls',()=>{
 assert.deepEqual([...KARAOKE_EFFECTS],['clean','warm','room']);
 assert.equal(normalizeKaraokeEffect('room'),'room');
 assert.equal(normalizeKaraokeEffect('warm'),'warm');
 assert.equal(normalizeKaraokeEffect('evil'),'clean');
});
test('Only locally supplied audio files within the 80 MB allowance are accepted',()=>{
 assert.equal(allowedKaraokeBacking({type:'audio/mpeg',size:1000}),true);
 assert.equal(allowedKaraokeBacking({type:'audio/ogg',size:80*1024*1024}),true);
 assert.equal(allowedKaraokeBacking({type:'video/mp4',size:3}),false);
 assert.equal(allowedKaraokeBacking({type:'audio/mp3',size:80*1024*1024+1}),false);
 assert.equal(allowedKaraokeBacking({type:'audio/mp3',size:0}),false);
 assert.equal(allowedKaraokeBacking(null),false);
});
test('Recording MIME picks supported browser format or safely delegates to browser',()=>{
 const supported={isTypeSupported:type=>type==='audio/mp4'};
 assert.equal(karaokeRecorderMime(supported),'audio/mp4');
 assert.equal(karaokeRecorderMime({isTypeSupported:()=>false}),'');
 assert.equal(karaokeRecorderMime(null),'');
});
test('StarMaker card mounts self-developed karaoke controls without scraping vendor scripts',()=>{
 const card=read('quanta-card-experience.mjs'),lab=read('quanta-karaoke-lab.mjs');
 assert.match(card,/mountKaraokeLab\(recording\)/);
 assert.match(card,/details','qcx-recording-details/);
 assert.match(lab,/navigator\.mediaDevices\.getUserMedia/);
 assert.match(lab,/createMediaStreamDestination/);
 assert.match(lab,/createBiquadFilter/);
 assert.match(lab,/createDelay/);
 assert.match(lab,/takeURL=URL\.createObjectURL\(blob\)/);
 assert.doesNotMatch(lab,/starmakerstudios\.com|api\.starmaker|fetch\(|Authorization|\.cookie|document\.write\(/i);
});
