import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,existsSync,readFileSync as read,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {safeSourceUrl,identifyWiring} from '../quick-card-wiring.mjs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('wiring identifies only verified StarMaker official login and honest missing data slots',()=>{
 const w=identifyWiring('https://www.starmakerstudios.com/en/songs');
 assert.equal(w.provider,'starmaker');
 assert.equal(w.providerLogin,'https://www.starmakerstudios.com/en/web-login');
 assert.equal(w.accountStatus,'not-verified');
 assert.equal(w.accountData,'not-connected');
 assert.equal(w.apiAccess,'not-granted-by-card');
 assert.ok(w.keys.find(k=>k.mode==='iframe-if-permitted'));
 assert.ok(w.keys.find(k=>k.mode==='requires-approved-connector'));
 assert.ok(w.keys.some(k=>k.route==='https://quantaphi.org/starmaker-embed.html'));
});
test('hostile and misleading URLs do not become provider login or code execution',()=>{
 for(const x of ['javascript:alert(1)','http://www.starmakerstudios.com','https://u:p@starmakerstudios.com/','https://starmakerstudios.com:8080/','https://starmakerstudios.com.attacker.invalid/','https://localhost/']){
  if(x.includes('attacker.invalid'))assert.equal(identifyWiring(x)?.provider,null);
  else assert.equal(safeSourceUrl(x),null,x);
 }
 const generic=identifyWiring('https://example.org/demo');
 assert.equal(generic.provider,null);
 assert.equal(generic.providerLogin,null);
 assert.equal(generic.accountData,'not-connected');
 assert.equal(generic.keys.find(x=>x.name==='Real sign-in').route,null);
});
test('public wiring study is linked into existing builder and Bubbles card catalog',()=>{
 assert.match(get('quick-card-builder.html'),/quick-card-wiring\.html/);
 assert.match(get('bubbles-card-catalog.mjs'),/quick-card-wiring.*Quick Card Wiring Study/);
 assert.match(get('quick-card-builder.js'),/Explicit prefill from the wiring study/);
 const study=get('quick-card-wiring.html');
 for(const id of ['qwsForm','qwsSource','qwsRows','qwsFrame','qwsJSON','qwsCart'])assert.match(study,new RegExp('id="'+id+'"'));
 assert.match(study,/Sign in at StarMaker/);
});
test('Integra has owner-declared Gmail but no independently verified connector or send grant',()=>{
 const role=JSON.parse(get('data/integra-card-validation.json'));
 assert.equal(role.id,'integra');
 assert.equal(role.gmailAccount.address,'quantaphi.integra.ai@gmail.com');
 assert.equal(role.gmailAccount.status,'owner-declared');
 assert.equal(role.gmailAccount.connected,false);
 assert.equal(role.gmailAccount.verification,'not-verified-via-connector');
 assert.equal(role.permissions.sendEmail,false);
 assert.equal(role.permissions.approveDeploy,false);
});
test('C13B0 Termux script generates standalone study card and editable JSON without dependencies',()=>{
 const dir=mkdtempSync(join(tmpdir(),'c13b0-card-'));
 try{
  const sh=new URL('../scripts/c13b0-quick-card-wiring.sh',import.meta.url).pathname;
  const checked=spawnSync('bash',['-n',sh],{encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr);
  const run=spawnSync('bash',[sh],{encoding:'utf8',timeout:10000,env:{...process.env,HOME:dir}});
  assert.equal(run.status,0,run.stderr||run.stdout);
  const root=join(dir,'C13B0-Quick-Card-Wiring');
  const manifest=JSON.parse(read(join(root,'wiring.json'),'utf8'));
  assert.equal(manifest.providerId,'starmaker');
  assert.equal(manifest.apiAccess,'not-granted-by-card');
  assert.equal(manifest.accountData,'not-imported');
  assert.ok(existsSync(join(root,'card-input.json')));
  assert.ok(existsSync(join(root,'WIRING.md')));
  const page=read(join(root,'index.html'),'utf8');
  assert.match(page,/www\.starmakerstudios\.com\/en\/web-login/);
  assert.match(page,/Try permitted website view/);
  assert.doesNotMatch(page,/password.*input|secret.*token/i);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
