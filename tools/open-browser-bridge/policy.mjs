import { isIP } from 'node:net';
export function parseAllowedHosts(value) {
  return new Set(value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}
export function isAllowedUrl(raw, hosts) {
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase().replace(/\\.$/, '');
    if (u.protocol !== 'https:' || u.username || u.password || !hosts.has(h)) return false;
    if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
    if (isIP(h)) return false;
    return true;
  } catch { return false; }
}
