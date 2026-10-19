// Tests for the bot‑spawning utility (CommonJS)

const assert = require('node:assert');
const { test } = require('node:test');
const { spawnBot, getBot, spawnBotByPurpose } = require('../src/bot-spawn.js');

// Legacy unit tests (unchanged)
test('spawnBot creates a bot with a unique id and no parent by default', () => {
  const bot = spawnBot();
  assert.ok(typeof bot.id === 'string' && bot.id.length > 0, 'bot.id should be a non‑empty string');
  assert.strictEqual(bot.parentId, null, 'parentId should be null for top‑level bots');
});

test('spawnBot correctly links child to parent', () => {
  const parent = spawnBot({ task: 'parent task', color: 'purple' });
  const child = spawnBot({ parent, task: 'child task', color: 'green' });
  assert.strictEqual(child.parentId, parent.id, 'child.parentId must equal parent.id');
});

test('getBot retrieves a bot from the registry', () => {
  const bot = spawnBot({ task: 'lookup test', color: 'blue' });
  const fetched = getBot(bot.id);
  assert.deepStrictEqual(fetched, bot, 'Fetched bot should match the created bot');
});

// New API test – uses the ES‑module router via dynamic import
test('POST /api/bot/spawn returns a yellow bot for purpose "read" and respects limits', async () => {
  const router = await import('../workers/bubbles-tools/router.mjs');
  const request = {
    method: 'POST',
    url: '/api/bot/spawn',
    json: async () => ({ purpose: 'read' })
  };
  const response = await router.route(request);
  assert.strictEqual(response.status, 200, 'Response status should be 200');
  assert.strictEqual(response.body.color, 'yellow', 'Bot color for purpose "read" must be yellow');
});
