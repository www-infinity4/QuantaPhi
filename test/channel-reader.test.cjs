const assert = require('node:assert/strict');
const { handle, getSchedule, readChannel } = require('../channels/HBO/channel-reader.js');

(async () => {
  // Test handle stub
  const result = handle({ id: 'test' });
  assert.equal(result.status, 'ok');
  assert.equal(result.channel, 'HBO');
  assert.equal(result.jobId, 'test');

  // Test getSchedule returns array
  const schedule = await getSchedule();
  assert(Array.isArray(schedule));
  assert.deepEqual(schedule, []);

  // Test readChannel returns object with items array
  const feed = await readChannel();
  assert.deepEqual(feed, { items: [] });
})();
