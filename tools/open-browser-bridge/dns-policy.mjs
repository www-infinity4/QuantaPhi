import { lookup as systemLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

// Conservative deny list: DNS names must not resolve to internal, reserved
// or documentation networks merely because their hostname was allowlisted.
const deniedV4 = new BlockList();
for (const [ip, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
  ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) deniedV4.addSubnet(ip, prefix, 'ipv4');
const deniedV6 = new BlockList();
for (const [ip, prefix] of [
  ['2001:db8::', 32], ['2001:10::', 28], ['2001:20::', 28],
]) deniedV6.addSubnet(ip, prefix, 'ipv6');

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) return !deniedV4.check(address, 'ipv4');
  if (family !== 6) return false;
  // Reject IPv4-mapped, ULA, link-local, loopback and multicast.
  // Only IPv6 global unicast 2000::/3 is eligible, with exceptions above.
  const first = Number.parseInt(address.split(':')[0], 16);
  return Number.isFinite(first) && first >= 0x2000 && first <= 0x3fff && !deniedV6.check(address, 'ipv6');
}

export async function resolvesOnlyPublicAddresses(hostname, resolver = systemLookup) {
  try {
    if (!hostname || isIP(hostname)) return false;
    const answers = await resolver(hostname, { all: true, verbatim: true });
    return Array.isArray(answers) && answers.length > 0 && answers.every(a =>
      typeof a.address === 'string' && isPublicAddress(a.address)
    );
  } catch {
    return false;
  }
}
