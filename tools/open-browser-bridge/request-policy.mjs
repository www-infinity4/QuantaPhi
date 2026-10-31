import { isAllowedUrl } from './policy.mjs';
import { resolvesOnlyPublicAddresses } from './dns-policy.mjs';

// Install at browser-context scope before opening any page. page.route() misses
// the first navigation of popup/new-window pages, which could bypass the policy.
// This is defense in depth; Node DNS checks do not pin Chromium's connections.
export async function installRequestPolicy(context, allowedHosts, resolvePublic = resolvesOnlyPublicAddresses) {
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
