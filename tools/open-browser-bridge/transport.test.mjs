import test from 'node:test';
import assert from 'node:assert/strict';
import { torTransport, assertNoDefaultRoute } from './transport.mjs';
import { isAllowedUrl, parseAllowedHosts } from './policy.mjs';

const ipv4 = 'Iface Destination Gateway Flags RefCnt Use Metric Mask MTU Window IRTT\neth0 00D31EAC 00000000 0001 0 0 0 00FFFFFF 0 0 0\n';
const ipv6 = 'fe800000000000000000000000000000 40 00000000000000000000000000000000 00 00000000000000000000000000000000 00000000 00000000 00000000 00000001 eth0\n';
const env = {BROWSER_TRANSPORT:'tor',BROWSER_NETWORK_ISOLATED:'true',BROWSER_TOR_PROXY:'socks5://172.30.211.2:9050'};

test('Tor transport fails closed if Linux has an IPv4 default route', () => {
  assert.throws(()=>assertNoDefaultRoute(ipv4+'eth0 00000000 0101A8C0 0003 0 0 0 00000000 0 0 0\n',ipv6),/default route/i);
});

test('Tor transport fails closed if Linux has an IPv6 default route', () => {
  const route='00000000000000000000000000000000 00 00000000000000000000000000000000 00 00000000000000000000000000000000 00000000 00000000 00000000 00000001 eth0\n';
  assert.throws(()=>assertNoDefaultRoute(ipv4,ipv6+route),/default route/i);
});

test('Tor transport never trusts a missing isolation assertion or arbitrary proxy endpoint', () => {
  assert.throws(()=>torTransport({...env,BROWSER_NETWORK_ISOLATED:'false'},{ipv4,ipv6}),/isolation/i);
  assert.throws(()=>torTransport({...env,BROWSER_TOR_PROXY:'socks5://evil.example:9050'},{ipv4,ipv6}),/proxy/i);
});

test('Tor transport only accepts its pinned internal SOCKS endpoint after route verification', () => {
  assert.deepEqual(torTransport(env,{ipv4,ipv6}),{mode:'tor',proxy:'socks5://172.30.211.2:9050'});
  assert.throws(()=>assertNoDefaultRoute('',ipv6),/route/i);
  assert.throws(()=>assertNoDefaultRoute(ipv4,''),/route/i);
});

test('HTTP .onion v3 is opt-in only for isolated Tor; public/gateway HTTP remains denied', () => {
  const onion='a'.repeat(56)+'.onion';
  const hosts=parseAllowedHosts(onion+',example.com,a'.concat('.onion.ly'));
  assert.equal(isAllowedUrl('http://'+onion+'/',hosts),false);
  assert.equal(isAllowedUrl('http://'+onion+'/',hosts,{torIsolated:true}),true);
  assert.equal(isAllowedUrl('http://example.com/',hosts,{torIsolated:true}),false);
  assert.equal(isAllowedUrl('http://a.onion.ly/',hosts,{torIsolated:true}),false);
});
