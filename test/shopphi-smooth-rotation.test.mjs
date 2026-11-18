import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {companionRotationAllowed,adTransitionDuration,contextFor,nextCompanionPage} from '../shop-phi-switchboard.mjs';

test('automatic ad rotation uses a legible dissolve and skips it for reduced motion',()=>{
  assert.equal(adTransitionDuration(false),520);
  assert.equal(adTransitionDuration(true),0);
});
test('no automatic rotation when controls are focused or page is hidden',()=>{
  assert.equal(companionRotationAllowed({total:6,visible:true,focused:true}),false);
  assert.equal(companionRotationAllowed({total:6,visible:true,pageHidden:true}),false);
  assert.equal(companionRotationAllowed({total:6,visible:true,reducedMotion:true}),false);
});
test('rotate sequential pages without skipping or repeating a fixed first page',()=>{
  assert.equal(nextCompanionPage(0,6),1);
  assert.equal(nextCompanionPage(1,6),2);
  assert.equal(nextCompanionPage(2,6),0);
});
test('sensitive medicine and health topic do not produce a targeted-ad lane',()=>{
  assert.equal(contextFor({title:'Blue Star medical skin care'}).sensitive,true);
});
test('arrival motion is gentle and respects reduced-motion settings',()=>{
  const css=readFileSync(new URL('../shop-phi-switchboard.css',import.meta.url),'utf8');
  assert.match(css,/shopphi-offer-arrive \.62s/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation:none/);
});
