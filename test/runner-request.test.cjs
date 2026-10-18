// runner-request.test.cjs
// Test that makeGitHubRequest includes the Authorization header when GITHUB_TOKEN is set.

// Set a test token in the environment
process.env.GITHUB_TOKEN = 'test-token-123';

// Capture the arguments passed to fetch
let capturedRequest = null;
global.fetch = (url, opts) => {
  capturedRequest = { url, opts };
  // Return a minimal mock response compatible with async/await
  return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
};

(async () => {
  const { makeGitHubRequest } = await import('../workers/infinity-brain-clock/runner-request.mjs');
  const testUrl = 'https://api.github.com/repos/example/repo';
  await makeGitHubRequest(testUrl, { method: 'GET' });

  if (!capturedRequest) {
    throw new Error('fetch was not called');
  }
  const authHeader = capturedRequest.opts.headers.Authorization;
  if (authHeader !== `Bearer ${process.env.GITHUB_TOKEN}`) {
    throw new Error(`Authorization header mismatch: expected 'Bearer ${process.env.GITHUB_TOKEN}', got '${authHeader}'`);
  }
  console.log('✅ Authorization header correctly set on GitHub request');
})();
