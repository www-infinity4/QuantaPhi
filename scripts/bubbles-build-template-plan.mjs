#!/usr/bin/env node
// Offline no-npm plan lookup. Does not run jobs or call any LLM/API.
import {makeBuildPacket} from '../bubbles-build-templates.mjs';
const prompt=process.argv.slice(2).join(' ').trim();
if(!prompt){
 console.error('Usage: node scripts/bubbles-build-template-plan.mjs "Build a database of baseball teams"');
 process.exitCode=2;
}else{
 const packet=makeBuildPacket(prompt);
 if(!packet){
  console.error('No supported build template matched. Inspect source manually; no actions executed.');
  process.exitCode=1;
 }else console.log(JSON.stringify(packet,null,2));
}
