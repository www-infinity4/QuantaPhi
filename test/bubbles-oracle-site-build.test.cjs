const test=require('node:test');
const assert=require('node:assert/strict');
const {
 classify,needsSitePackage,sitePackageBrief,makeJobs
}=require('../bubbles-brain-actions.js');

test('ordinary build-and-publish website commands get a complete Oracle-first package plan',()=>{
 for(const input of [
  'Build a website about astronomy and post the finished package to my repository.',
  'Please create a responsive web page and publish it.',
  'Bubbles, package the website with its images, tests and links.'
 ]){
  assert.equal(classify(input),'queue');
  assert.equal(needsSitePackage(input),true);
  const [build,verify]=makeJobs(input,'www-infinity4/QuantaPhi');
  assert.equal(build.id,'TASK-1');
  assert.equal(verify.id,'TASK-2');
  assert.deepEqual(verify.dependencies,['TASK-1']);
  assert.match(build.instructions,/Oracle-Octaves/);
  assert.match(build.instructions,/Omni-Phi/);
  assert.match(build.instructions,/Builder-Reserve/);
  assert.match(build.instructions,/WidgetPhi/);
  assert.match(build.instructions,/Moltnook/);
  assert.match(build.instructions,/pin every read to verified commit SHA/);
  assert.match(build.instructions,/DO NOT request routine file paths/);
  assert.match(build.instructions,/runnable website\/package/);
  assert.match(verify.acceptance.join(' '),/Android screen widths/);
 }
});
test('a site build never turns read-only reference repositories into write authorization',()=>{
 const task=makeJobs('Build a website and publish the package','www-infinity4/Builder-Reserve')[0];
 assert.equal(task.repository,'www-infinity4/Builder-Reserve');
 assert.deepEqual(task.dependencies,[]);
 assert.match(task.instructions,/NOT authorization to edit all of them/);
 assert.match(task.instructions,/fork only if a verified public upstream and license allow it/);
 assert.match(task.instructions,/Never store or print API tokens/);
 assert.match(task.instructions,/do not claim published until live acceptance succeeds/);
});
test('unrelated repairs and research-only questions do not activate site packaging',()=>{
 assert.equal(needsSitePackage('What is the history of websites?'),false);
 assert.equal(needsSitePackage('Repair the Bubbles microphone'),false);
 assert.equal(sitePackageBrief('Check Robot Brain tickets','www-infinity4/QuantaPhi'),'');
 const task=makeJobs('Fix the Robot Brain runner','www-infinity4/Moltnook')[0];
 assert.doesNotMatch(task.instructions,/Bubbles autonomous website package/);
 assert.equal(task.repository,'www-infinity4/Moltnook');
});
test('source access and executable build roles stay owner-scoped, while receipt checks remain required',()=>{
 const jobs=makeJobs('Generate a web app and ship the package','www-infinity4/QuantaPhi');
 assert.ok(jobs.every(j=>j.repository==='www-infinity4/QuantaPhi'));
 assert.ok(jobs.every(j=>j.executor==='repository-engine'));
 assert.ok(jobs[0].acceptance.some(s=>/verifiable PR\/CI\/deployment/.test(s)));
 assert.match(jobs[0].instructions,/YELLOW:/);
 assert.match(jobs[0].instructions,/BLUE:/);
 assert.match(jobs[0].instructions,/GREEN:/);
 assert.match(jobs[0].instructions,/PINK:/);
 assert.match(jobs[0].instructions,/PURPLE:/);
});
