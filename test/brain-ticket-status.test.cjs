const assert = require('node:assert');
const { getRunningTickets } = require('../brain-ticket-status.js');

(async () => {
  const running = await getRunningTickets();
  assert.ok(Array.isArray(running), 'Result should be an array');
  for (const ticket of running) {
    assert.equal(ticket.status, 'run', 'Ticket status must be "run"');
  }
})();
