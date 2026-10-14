import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{chooseTool} from '../workers/bubbles-tools/worker.mjs';
import {ELEMENTS,calculateResonance,parseResonanceSpeech,CALCULATOR_UI} from '../workers/bubbles-tools/resonance.mjs';

const request=(data)=>new Request('https://tools/v1/assist',{
 method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
 body:JSON.stringify(data)
});
test('resonance tool is callable from Bubbles speech without the AI binding',async()=>{
 assert.equal(chooseTool('Bubbles calculate resonance at 10 microhenries and 22 picofarads'),'resonance.calculate');
 assert.equal(chooseTool('Open the Resonator calculator'),'resonance.open');
 assert.equal(chooseTool('Please inspect the resonance code repository'),'oracle.chat');
 const r=await worker.fetch(request({request:'Bubbles calculate resonance at 10 microhenries and 22 picofarads'}),{});
 assert.equal(r.status,200);
 const value=await r.json();
 assert.equal(value.receipt.tool,'resonance.calculate');
 assert.equal(value.receipt.status,'complete');
 assert.equal(value.receipt.minted,false);
 assert.equal(value.receipt.repositoryActionsVerified,false);
 assert.equal(value.url,CALCULATOR_UI);
 assert.ok(Math.abs(value.result.engineering.frequencyHz-10730224.07429)<1);
 assert.match(value.output,/10\.730 MHz/);
 assert.equal(value.result.result,undefined);
});
test('resonance module maps all 33 original elements but never asserts symbolic couplings are measurements',()=>{
 assert.equal(ELEMENTS.length,33);
 const x=calculateResonance({inductance:10,inductanceUnit:'uH',capacitance:22,capacitanceUnit:'pF',source:'Cu',load:'Ni',zp:23104,zs:1});
 assert.equal(x.engineering.transformer.idealTurnsRatio,152);
 assert.equal(x.materials.source.atomicNumber,29);
 assert.equal(x.materials.load.atomicNumber,28);
 assert.match(x.symbolic.classification,/not a measured coupling/);
 assert.equal(x.engineering.estimatedSkinDepthMeters>0,true);
 const magnetic=calculateResonance({l:10,c:22,source:'Ni'});
 assert.equal(magnetic.engineering.estimatedSkinDepthMeters,undefined);
 assert.match(magnetic.warnings.join(' '),/permeability/);
 assert.equal(x.warnings.some(t=>t.includes('Ideal LC')),true);
});
test('missing or invalid scientific parameters never default to invented results',async()=>{
 assert.equal(parseResonanceSpeech('calculate resonance at 10 microhenries'),null);
 assert.deepEqual(parseResonanceSpeech('Resonance at 2mH and 300nF'),{inductance:2,inductanceUnit:'mH',capacitance:300,capacitanceUnit:'nF'});
 assert.throws(()=>calculateResonance({l:-5,c:20}),/inductance_invalid/);
 assert.throws(()=>calculateResonance({l:10,c:'NaN'}),/capacitance_invalid/);
 assert.throws(()=>calculateResonance({l:10,c:20,source:'H'}),/element_unavailable/);
 assert.throws(()=>calculateResonance({l:10,c:20,zp:100}),/both_impedances_required/);
 const empty=await (await worker.fetch(request({request:'Calculate resonance'}),{})).json();
 assert.equal(empty.receipt.status,'needs_input');
 assert.match(empty.output,/both inductance and capacitance/);
 const bad=await (await worker.fetch(request({request:'Calculate resonance',tool:'resonance.calculate',args:{l:0,c:22}}),{})).json();
 assert.equal(bad.receipt.status,'invalid_input');
 assert.equal(bad.result,undefined);
});
test('Bubbles can launch source-backed interactive calculator via a link',async()=>{
 const value=await (await worker.fetch(request({request:'Bubbles, pull up the resonance calculator'}),{})).json();
 assert.equal(value.receipt.tool,'resonance.open');
 assert.equal(value.url,'https://quantaphi.org/resonance.html');
 assert.equal(value.receipt.calculatorOpened,false);
 const health=await (await worker.fetch(new Request('https://tools/health'),{})).json();
 assert.equal(health.tools.resonance,'connected');
});
test('foreign pages cannot call the public Bubbles tool endpoint',async()=>{
 const r=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}),{});
 assert.equal(r.status,403);
});
