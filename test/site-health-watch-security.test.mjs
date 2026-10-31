import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from '../scripts/site-health-watch.mjs';

test('rejects untrusted network targets before attempting a crawl',async()=>{
 for(const url of ['http://127.0.0.1:1/','http://169.254.169.254/latest/meta-data/','https://example.com/','https://quantaphi.org.evil.example/']){
  await assert.rejects(run([url],{writeReport:false}),/approved https origin/i,url);
 }
});
