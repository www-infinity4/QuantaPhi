import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const compose=readFileSync(new URL('./compose.tor.yml',import.meta.url),'utf8');
const tor=readFileSync(new URL('./torrc',import.meta.url),'utf8');
const browser=readFileSync(new URL('./Dockerfile.browser',import.meta.url),'utf8');

test('browser service is exclusively on a Docker-internal link, while Tor owns the only outbound link',()=>{
  const service=compose.split(/\n  browser:\n/)[1].split(/\nnetworks:\n/)[0];
  assert.match(compose,/\n  isolated:\n    internal: true/);
  assert.match(service,/\n    networks:\n      isolated:/);
  assert.doesNotMatch(service,/tor_egress|network_mode:|privileged:|cap_add:|ports:/);
  assert.match(service,/cap_drop: \[ALL\]/);
  assert.match(service,/read_only: true/);
  assert.match(service,/no-new-privileges:true/);
  assert.ok(service.includes('seccomp=./seccomp_profile.json'));
  assert.match(service,/dns: \[127\.0\.0\.1\]/);
  const server=compose.split(/\n  tor:\n/)[1].split(/\n  browser:\n/)[0];
  assert.match(server,/tor_egress:/);
  assert.doesNotMatch(server,/ports:/);
});
test('Tor SOCKS bound only to private link, with a single allowed browser source',()=>{
  assert.match(tor,/SocksPort 172\.30\.211\.2:9050 IsolateSOCKSAuth/);
  assert.match(tor,/SocksPolicy accept 172\.30\.211\.3/);
  assert.match(tor,/SocksPolicy reject \*/);
  assert.match(tor,/ClientRejectInternalAddresses 1/);
});
test('browser runs as nonroot and never disables the Chromium sandbox',()=>{
  assert.match(browser,/USER pwuser/);
  const runner=readFileSync(new URL('./browser-bridge.mjs',import.meta.url),'utf8');
  assert.match(runner,/chromiumSandbox:true/);
  assert.doesNotMatch(runner,/--no-sandbox/);
});
