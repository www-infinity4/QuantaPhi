import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const read=filename=>readFile(path.join(import.meta.dirname,'..',filename),'utf8');

test('Platinum sections have no visible escaped newlines and keep the Android security hold', async()=>{
 const html=await read('platinum/index.html');
 assert.doesNotMatch(html,/<\/section>\\[nr]\s*<section\b/i);
 assert.match(html,/Android APK security hold:/);
 assert.match(html,/Do not install the preview APK/);
});

test('Physics submission page loads its own local stylesheet and labels its local counts accurately', async()=>{
 const [html,js,css]=await Promise.all([read('physics-card.html'),read('physics-card.js'),read('physics-card.css')]);
 assert.match(html,/<link rel="stylesheet" href="\/physics-card\.css">/);
 assert.match(css,/min-height:\s*44px/);
 assert.match(html,/Designs saved on this device: 0/);
 assert.match(js,/Designs saved on this device:/);
 assert.doesNotMatch(html+js,/Verified buyers:/);
 assert.match(html,/<script src="physics-card\.js"><\/script>/);
});
