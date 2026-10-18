// Bubbles post-merge source checks. QuantaPhi has no root package.json or
// package-lock.json: use its real dependency-free Node test files, not npm ci.
// These checks do NOT constitute physical Android/SIM or production verification.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';

const tests=[
 'test/bubbles-pr416-verification.test.cjs',
 'test/bubbles-oracle-site-build.test.cjs',
 'test/bubbles-brain-bridge.test.cjs',
 'test/bubbles-progress-updates.test.cjs',
 'test/bubbles-owner-approval.test.cjs',
 'test/bubbles-owner-immediate-dispatch.test.cjs',
 'test/bubbles-brain-inbox.test.cjs',
 'test/bubbles-runner-dispatch.test.mjs',
 'test/red-sectors.test.mjs'
];
console.log('Bubbles source verification: '+tests.length+' existing native Node suites.');
const run=spawnSync(process.execPath,['--test',...tests],{
 cwd:process.cwd(),stdio:'inherit',timeout:180000,
 env:{...process.env,CI:'true'}
});
const exitCode=Number.isInteger(run.status)?run.status:1;
const receipt={
 verifiedAt:new Date().toISOString(),
 status:exitCode===0?'source_tests_passed':'source_tests_failed',
 exitCode,sourceTests:tests,
 hardwareValidation:'unverified',
 carrierSimProvisioning:'not_tested',
 liveRobotBrainExecution:'not_verified_by_source_tests',
 infinityPlatinumApkSecurityHold:'unchanged'
};
mkdirSync('test-results',{recursive:true});
writeFileSync('test-results/bubbles-pr416-verification.json',JSON.stringify(receipt,null,2)+'\n');
if(run.error)console.error('Bubbles verifier could not finish the native test process: '+String(run.error.code||'process_error'));
if(exitCode!==0)console.error('Bubbles source verification failed. Review the failing tests; no APK or production acceptance is claimed.');
else console.log('Bubbles native source tests passed; Android/SIM and live Brain acceptance remain separate.');
process.exitCode=exitCode;
