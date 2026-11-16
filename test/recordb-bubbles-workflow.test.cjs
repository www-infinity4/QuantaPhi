const test = require('node:test');
const assert = require('node:assert/strict');
const {classify,repositoryFor,makeJobs,recordBWorkBrief} = require('../bubbles-brain-actions.js');

test('owner RecordB hookup requests route as engineering jobs', () => {
 const message='RecordB Hook into bubbles make bubbles perform the work';
 assert.equal(classify(message),'queue');
 assert.equal(repositoryFor(message),'www-infinity4/RecordB');
 assert.equal(classify('Do not hook RecordB into Bubbles'),'chat');
 assert.equal(classify('What is RecordB?'),'chat');
});

test('RecordB builder is given explicit private storage, indexing and native verification contract', () => {
 const message='Build RecordB searchable screen recording library and hook it into Bubbles';
 const jobs=makeJobs(message,'www-infinity4/RecordB');
 assert.equal(jobs.length,2);
 assert.equal(jobs[0].repository,'www-infinity4/RecordB');
 assert.match(jobs[0].instructions,/RECORDB — Bubbles recording library implementation contract/);
 assert.match(jobs[0].instructions,/PUBLIC source repo/);
 assert.match(jobs[0].instructions,/timestamp-linked search playback/);
 assert.match(jobs[0].instructions,/Movies\/Bubbles/);
 assert.match(jobs[0].instructions,/MediaProjection approval/);
 assert.match(jobs[0].instructions,/TWO REPOS/);
 assert.match(jobs[0].acceptance.join(' '),/Never put private recordings/);
 assert.deepEqual(jobs[1].dependencies,['TASK-1']);
});

test('unrelated Bubbles jobs never inherit owner media-processing instructions', () => {
 assert.equal(recordBWorkBrief('Repair Bubbles site','www-infinity4/QuantaPhi'),'');
 assert.doesNotMatch(makeJobs('Repair Bubbles site','www-infinity4/QuantaPhi')[0].instructions,/RECORDB —/);
});
