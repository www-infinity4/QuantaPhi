import { isAllowedUrl } from './policy.mjs';
import { resolvesOnlyPublicAddresses } from './dns-policy.mjs';

// Context-wide interception is a secondary boundary; container networking
// (or explicit direct-mode DNS/IP checks) must also be enforced.
export async function installRequestPolicy(context, allowedHosts, resolvePublic=resolvesOnlyPublicAddresses, options={}) {
  if(typeof context.routeWebSocket!=='function')
    throw new Error('WebSocket routing unavailable; refuse browser context');
  await context.routeWebSocket('**/*', ws => ws.close());
  await context.route('**/*', async route => {
    const url=route.request().url();
    if(!isAllowedUrl(url,allowedHosts,options))return route.abort();
    try{
      // A Tor-isolated browser has no direct DNS path. SOCKS5 delegates DNS
      // resolution to Tor, which rejects internal target IPs by policy.
      // Direct mode retains per-request DNS checking.
      if(!options.torIsolated && !(await resolvePublic(new URL(url).hostname)))return route.abort();
    }catch{return route.abort()}
    return route.continue();
  });
}
