import { isIP } from 'node:net';
const TOR_V3=/^[a-z2-7]{56}\.onion$/;
export function parseAllowedHosts(value) {
  return new Set(value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}
export function isAllowedUrl(raw, hosts, options={}) {
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase().replace(/\.$/, '');
    const torOnion=Boolean(options.torIsolated && TOR_V3.test(h));
    // HTTP is accepted only for a valid v3 onion through the isolated Tor transport.
    if(u.protocol!=='https:' && !(torOnion&&u.protocol==='http:'))return false;
    if(u.port||u.username||u.password||!hosts.has(h))return false;
    if(h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||h.includes('.onion.')||isIP(h))return false;
    // Never silently turn a gateway host into an onion service.
    if(h.endsWith('.onion')&&!TOR_V3.test(h))return false;
    return true;
  } catch { return false; }
}
