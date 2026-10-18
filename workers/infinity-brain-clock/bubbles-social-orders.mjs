/* Bubbles owner hashtag discovery. This is an untrusted source reader, not a
 * command executor or an identity/phone-data collector.
 * X's numeric author ID, not a handle or hashtag, identifies the configured
 * publishing account. An authenticated owner must request a scan; all newly
 * imported Robot Brain tickets remain drafts until separately approved.
 */
const POST_ID = /^[0-9]{1,24}$/;
const TAG = /(^|[\s([{])#bubbles(?=$|[\s\])}:,.!?;])/iu;
const MAX_TEXT = 4000;

export function parseBubblesXPost(post, ownerUserId) {
  if (!post || typeof post !== 'object' ||
      !POST_ID.test(String(ownerUserId || '')) ||
      !POST_ID.test(String(post.id || '')) ||
      String(post.author_id || '') !== String(ownerUserId)) return null;
  if (Array.isArray(post.referenced_tweets) &&
      post.referenced_tweets.some(ref => ref?.type === 'retweeted')) return null;
  if (typeof post.text !== 'string' ||
      post.text.length > MAX_TEXT || !TAG.test(post.text)) return null;
  const command = post.text.replace(TAG, (_, prefix) => prefix).trim();
  if (command.length < 8 || command.length > MAX_TEXT) return null;
  const timestamp = Date.parse(post.created_at || '');
  return {
    source: 'x',
    sourceId: 'x:' + post.id,
    sourceUrl: 'https://x.com/i/status/' + post.id,
    authorId: String(ownerUserId),
    publishedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
    command,
    approvalRequired: true,
    executionStarted: false
  };
}

export async function discoverBubblesXOrders({bearerToken, ownerUserId, fetchImpl = fetch, maxPages = 2}) {
  if (!POST_ID.test(String(ownerUserId || '')) ||
      typeof bearerToken !== 'string' || bearerToken.length < 12 ||
      /[\r\n]/.test(bearerToken))
    return {ok: false, error: 'x_owner_account_or_api_token_not_configured', orders: []};
  const pages = Math.max(1, Math.min(3, Number(maxPages) || 2));
  const orders = [], seen = new Set();
  let nextToken = '';
  for (let page = 0; page < pages; page++) {
    const url = new URL('https://api.x.com/2/users/' + ownerUserId + '/tweets');
    url.searchParams.set('max_results', '100');
    url.searchParams.set('exclude', 'retweets');
    url.searchParams.set('tweet.fields', 'author_id,created_at,referenced_tweets');
    if (nextToken) url.searchParams.set('pagination_token', nextToken);
    let response;
    try {
      response = await fetchImpl(url.toString(), {
        method: 'GET', redirect: 'error',
        headers: {Authorization: 'Bearer ' + bearerToken, Accept: 'application/json'},
        signal: AbortSignal.timeout(12000)
      });
    } catch {
      return {ok: false, error: 'x_api_unreachable', orders: []};
    }
    if (!response.ok) return {ok: false, error: 'x_api_http_' + response.status, orders: []};
    let data;
    try { data = await response.json(); }
    catch { return {ok: false, error: 'x_api_invalid_response', orders: []}; }
    if (!data || (data.data != null && !Array.isArray(data.data)))
      return {ok: false, error: 'x_api_invalid_response', orders: []};
    for (const item of data.data || []) {
      const order = parseBubblesXPost(item, ownerUserId);
      if (order && !seen.has(order.sourceId)) {
        seen.add(order.sourceId);
        orders.push(order);
      }
    }
    nextToken = data.meta?.next_token || '';
    if (typeof nextToken !== 'string' || !/^[\w-]{1,512}$/.test(nextToken)) break;
  }
  return {ok: true, source: 'x_owner_timeline', orders: orders.slice(0, 30),
    pagesScanned: pages, searchExhaustive: !nextToken,
    note: 'Owner account posts only. No public web crawl or automatic execution.'};
}
