import test from 'node:test';
import assert from 'node:assert/strict';
import {COLOR_CAVITY_STAGES, routeCavityFrame, reduceCavityFrames} from '../bubbles-color-cavity.mjs';

const packets=[
 {kind:'blue',bytes:8},
 {kind:'green',bytes:12},
 {kind:'purple',bytes:5},
 {kind:'blue',bytes:13},
 {kind:'red',bytes:3},
 {kind:'blue',bytes:7}
];
test('inactive black holds the white signal, yellow intake and all channels',()=>{
 const frame=routeCavityFrame(packets,{requested:'blue',lightOn:false,apertures:[true,true]});
 assert.equal(frame.visible,false);
 assert.equal(frame.accepted,0);
 assert.equal(frame.byteWeight,0);
 assert.equal(frame.stage,'black');
 assert.equal(frame.dataAccessGranted,false);
 assert.deepEqual(frame.visibleColors,[]);
});
test('white signal and yellow intake precede red inspect and orange routing decision',()=>{
 const frame=routeCavityFrame(packets,{requested:'blue',lightOn:true,apertures:[true,true]});
 assert.deepEqual(frame.guideOrder,['black','white','yellow','red','orange','blue']);
 assert.equal(frame.accepted,3);
 assert.equal(frame.byteWeight,28);
 assert.equal(frame.visible,true);
 assert.deepEqual(frame.visibleColors,['blue']);
 assert.equal(frame.guideColorsRendered,false,'control labels never masquerade as physical pixels');
 assert.equal(frame.dataAccessGranted,false);
 assert.equal(frame.authorizesWallet,false);
 assert.deepEqual(frame.whiteConduit,{
  carrier:'white',inside:'yellow',between:['red','yellow'],
  drawn:false,grantsAccess:false
 });
});
test('color passage cavity can be absent yet drive selective frame output',()=>{
 const frame=routeCavityFrame(packets,{requested:'green',lightOn:true,apertures:[false,true]});
 assert.equal(frame.accepted,1);
 assert.equal(frame.byteWeight,12);
 assert.deepEqual(frame.visibleColors,['green']);
 assert.equal(frame.aperturesOpen,1);
 assert.equal(frame.aperturesTotal,2);
 const shut=routeCavityFrame(packets,{requested:'green',lightOn:true,apertures:[false,false]});
 assert.equal(shut.accepted,0);
 assert.equal(shut.visible,false);
});
test('invalid stream metadata and arbitrary colors never become routing instructions',()=>{
 assert.throws(()=>routeCavityFrame(packets,{requested:'white',lightOn:true}),/requested channel/i);
 assert.throws(()=>routeCavityFrame([{kind:'admin',bytes:1}],{requested:'blue',lightOn:true}),/packet kind/i);
 assert.throws(()=>routeCavityFrame([{kind:'blue',bytes:-1}],{requested:'blue',lightOn:true}),/byte count/i);
 assert.throws(()=>routeCavityFrame([{kind:'blue',bytes:1,payload:'secret'}],{requested:'blue',lightOn:true}),/metadata only/i);
 assert.throws(()=>routeCavityFrame(packets,{requested:'blue',lightOn:true,apertures:[true,'yes']}),/aperture/i);
});
test('large notional bubble streams are processed as bounded batches, not trillion-item arrays',()=>{
 const many=Array.from({length:129},()=>({kind:'blue',bytes:1}));
 assert.throws(()=>routeCavityFrame(many,{requested:'blue',lightOn:true}),/128 packets/i);
 const first=routeCavityFrame(many.slice(0,128),{requested:'blue',lightOn:true});
 const second=routeCavityFrame(many.slice(128),{requested:'blue',lightOn:true});
 const totals=reduceCavityFrames([first,second]);
 assert.equal(totals.accepted,129);
 assert.equal(totals.byteWeight,129);
 assert.equal(totals.frames,2);
 assert.equal(totals.dataAccessGranted,false);
 assert.ok(!('packets' in totals),'raw streams are not retained in receipts');
});
test('stage palette keeps routing labels separate from display physics',()=>{
 assert.equal(COLOR_CAVITY_STAGES.black.role,'standby');
 assert.equal(COLOR_CAVITY_STAGES.white.role,'illumination');
 assert.equal(COLOR_CAVITY_STAGES.yellow.role,'incoming');
 assert.equal(COLOR_CAVITY_STAGES.red.role,'inspect');
 assert.equal(COLOR_CAVITY_STAGES.orange.role,'decision');
 assert.equal(COLOR_CAVITY_STAGES.blue.role,'research');
 assert.equal(COLOR_CAVITY_STAGES.green.role,'build');
 assert.equal(COLOR_CAVITY_STAGES.purple.role,'review');
 assert.equal(COLOR_CAVITY_STAGES.yellow.physicalPixelFilter,false);
});
