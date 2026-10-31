import { isAllowedUrl } from './policy.mjs';
import { resolvesOnlyPublicAddresses } from './dns-policy.mjs';

// Install at browser-context scope before opening any page. page.route() misses
// the first navigation of popup/new-window pages, which could bypass the policy.
// HTTP routing does not intercept WebSockets. Close every ws/wss channel;
// this screenshot-only scaffold needs no sockets. This remains defense in
// depth: Node DNS checks do not pin Chromium's connections or replace egress isolation.
export async function installRequestPolicy(context, allowedHosts, resolvePublic = resolvesOnlyPublicAddresses) {
  if (typeof context.routeWebSocket !== 'function') {
    throw new Error('WebSocket routing unavailable; refuse browser context');
  }
  // Install both policies before opening any page or popup.
  await context.routeWebSocket('**/*', ws => ws.close());
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (!isAllowedUrl(url, allowedHosts)) return route.abort();
    try {
      if (!(await resolvePublic(new URL(url).hostname))) return route.abort();
    } catch {
      return route.abort();
    }
    return route.continue();
  });
}
