import test from 'node:test';
import assert from 'node:assert/strict';
import {crackerJackCard,validateCrackerJackCard} from '../design-lab/cracker-jack-card.mjs';
test('official Cracker Jack card links are allowed and unsponsored',()=>{assert.equal(validateCrackerJackCard(),true);assert.equal(crackerJackCard.purchaseEnabled,false);assert.equal(crackerJackCard.sponsorApproved,false);});
test('reject unverified commerce or off-domain action',()=>{assert.equal(validateCrackerJackCard({...crackerJackCard,purchaseEnabled:true}),false);assert.equal(validateCrackerJackCard({...crackerJackCard,actions:[{label:'fake',url:'https://fakecrackerjack.example'}]}),false);});
