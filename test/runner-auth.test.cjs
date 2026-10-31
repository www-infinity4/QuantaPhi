const test = require('node:test');
const assert = require('node:assert');

/** Helper to create a mock fetch response */
function createResponse(status, json){
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json)
  };
}

/** Queue based fetch mock */
function mockFetch(sequence){
  let call = 0;
  global.fetch = async (url, options) => {
    const resp = sequence[call++] || sequence[sequence.length - 1];
    return resp;
  };
}

test('getRunnerToken returns token on success', async (t) => {
  process.env.GITHUB_TOKEN = 'test-token';
  const expected = 'oidc-token';
  mockFetch([createResponse(200, { value: expected })]);
  const { getRunnerToken } = await import('../workers/infinity-brain-clock/runner-auth.mjs');
  const token = await getRunnerToken();
  assert.strictEqual(token, expected);
});

test('getRunnerToken retries on transient 5xx errors', async (t) => {
  process.env.GITHUB_TOKEN = 'test-token';
  const expected = 'oidc-token';
  mockFetch([
    createResponse(502, { message: 'Bad Gateway' }),
    createResponse(503, { message: 'Service Unavailable' }),
    createResponse(200, { value: expected })
  ]);
  const { getRunnerToken } = await import('../workers/infinity-brain-clock/runner-auth.mjs');
  const token = await getRunnerToken();
  assert.strictEqual(token, expected);
});

test('getRunnerToken throws when GITHUB_TOKEN missing', async (t) => {
  delete process.env.GITHUB_TOKEN;
  const { getRunnerToken } = await import('../workers/infinity-brain-clock/runner-auth.mjs');
  await assert.rejects(() => getRunnerToken(), {
    message: /GITHUB_TOKEN_missing/
  });
});

module.exports = {}; // Ensure CommonJS module exports
