import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DEFAULT_PILOT,PILOT_FIELDS,normalizePilot,readiness,manifest} from '../cellular/network-plan.mjs';
import {MOTOROLA_VARIANTS,COMMON_CANDIDATES,evaluateBand} from '../cellular/lte-compatibility.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('default Infinity Cellular claims no active tower or Internet backhaul',()=>{
 const current=readiness(DEFAULT_PILOT);
 assert.equal(current.live,false);
 assert.equal(current.canAdvertiseService,false);
 assert.equal(current.readiness,'not_ready');
 assert.ok(current.remaining.some(t=>/upstream Internet/i.test(t)));
 assert.equal(current.total,8);
});
test('user checklist can never make an Internet connection or licensed service live',()=>{
 const input=Object.fromEntries(PILOT_FIELDS.map(f=>[f.key,true]));
 const noUplink=readiness(input);
 assert.equal(noUplink.live,false);
 assert.equal(noUplink.readiness,'not_ready');
 const cellularDependent=readiness({...input,permittedBackhaul:'existing-cellular'});
 assert.equal(cellularDependent.readiness,'not_ready');
 assert.ok(cellularDependent.remaining.some(t=>/depends on another carrier/i.test(t)));
 const done=readiness({...input,permittedBackhaul:'fiber-isp'});
 assert.equal(done.readiness,'operator_claims_complete_unverified');
 assert.equal(done.live,false);
 assert.equal(done.canAdvertiseService,false);
 const m=manifest({...input,permittedBackhaul:'fiber-isp'});
 assert.equal(m.statements.freeUplinkFromWebsite,false);
 assert.equal(m.statements.carrierReplacementReady,false);
 assert.equal(m.statements.emergencyCallingIncluded,false);
 assert.match(m.architecture.coreAndInternet,/ISP uplink/);
});
test('malformed and forged fields are normalized and personal data size constrained',()=>{
 const input=normalizePilot({coreInstalled:'true',upstreamConnected:'yes',radioAuthorized:true,
   permittedBackhaul:'magic-free-url',testSiteDescription:'a'.repeat(500),labNotes:'b'.repeat(9999)});
 assert.equal(input.radioAuthorized,true);
 assert.equal(input.coreInstalled,false);
 assert.equal(input.upstreamConnected,false);
 assert.equal(input.permittedBackhaul,'none');
 assert.equal(input.testSiteDescription.length,150);
 assert.equal(input.labNotes.length,1200);
});
test('QuantaPhi routes the cellular network page and JavaScript modules to first-party assets',()=>{
 const worker=read('workers/quantaphi-site/worker.js');
 const html=read('cellular/index.html');
 const js=read('cellular/cellular.js');
 const phone=read('phone/index.html');
 assert.match(worker,/path === '\/cellular\/'/);
 assert.match(worker,/sourcePath: '\/cellular\/index.html'/);
 assert.match(worker,/mjs: 'application\/javascript/);
 assert.ok(html.includes('/cellular/cellular.js'));
 assert.match(js,/network-plan.mjs/);
 assert.ok(js.includes('/health'));
 assert.match(js,/infinity-switchboard/);
 assert.match(phone,/href="\/cellular\/"/);
 assert.match(html,/not live cellular service/);
 assert.doesNotMatch(js,/getUserMedia\(|writeFile\(|navigator\.serial/);
});

test('Motorola Moto G Pure compatibility is flagged before buying CBRS radio gear',()=>{
 const html=read('cellular/index.html');
 const hardware=read('hardware/infinity-cellular/README.md');
 assert.match(html,/Moto G Pure/);
 assert.match(html,/Band 48/);
 assert.match(html,/LTE modem\/router/);
 assert.match(hardware,/list LTE Band 48/);
 assert.match(hardware,/SIM tray/);
});

test('Use a listed Motorola LTE band but never authorize transmission from band compatibility alone',()=>{
 assert.deepEqual(COMMON_CANDIDATES,[2,4,5,12,66]);
 assert.ok(MOTOROLA_VARIANTS['XT2163-4'].includes(2));
 assert.ok(MOTOROLA_VARIANTS['XT2163-6'].includes(2));
 assert.equal(evaluateBand({variant:'XT2163-4',band:48}).bandSupportedInPublishedSpecification,false);
 assert.equal(evaluateBand({variant:'XT2163-6',band:48}).proposalEligibleForLicensedPilot,false);
 const direct=evaluateBand({variant:'XT2163-6',band:2});
 assert.equal(direct.proposalEligibleForLicensedPilot,true);
 assert.equal(direct.serviceActive,false);
 assert.equal(direct.existingSimCanBeUsedWithoutReplacement,false);
 assert.ok(direct.blockers.some(x=>/SIM issuer/i.test(x)));
 const authorised=evaluateBand({variant:'XT2163-6',band:2,rightsGranted:true,simOperatorAgreement:true,coreAuthorized:true,backhaulVerified:true});
 assert.equal(authorised.operatorAssertionsCompleteUnverified,true);
 assert.equal(authorised.serviceActive,false);
 assert.equal(authorised.publicInternetValidated,false);
});
test('Android Moto G Pure diagnostic reads only non-identifying telephony status',()=>{
 const java=read('android/infinity-platinum/app/src/main/java/org/quantaphi/platinum/CellularInspector.java');
 const activity=read('android/infinity-platinum/app/src/main/java/org/quantaphi/platinum/PlatinumActivity.java');
 const manifest=read('android/infinity-platinum/app/src/main/AndroidManifest.xml');
 assert.match(java,/hasIccCard\\(\\)/);
 assert.match(java,/getSimOperatorName\\(\\)/);
 assert.match(java,/hasTransport\\(/);
 assert.match(java,/XT2163-4/);
 assert.match(java,/XT2163-6/);
 assert.match(activity,/CellularInspector\\.capture\\(this\\)/);
 assert.match(activity,/ACTION_NETWORK_OPERATOR_SETTINGS/);
 assert.match(manifest,/android.permission.ACCESS_NETWORK_STATE/);
 for(const file of [java,activity,manifest]){
  assert.doesNotMatch(file,/(getSubscriberId|getSimSerialNumber|getImei|getDeviceId|getLine1Number|getCellLocation|getAllCellInfo|READ_PRIVILEGED_PHONE_STATE|READ_PHONE_STATE|ACCESS_FINE_LOCATION)/);
 }

});
