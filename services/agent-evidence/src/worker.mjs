const RESPONSE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=60',
  'access-control-allow-origin': '*',
  'x-content-type-options': 'nosniff',
};
const GITHUB_RELEASE_SOURCES = [
  { repository: 'All-Hands-AI/OpenHands', category: 'agents/coding' },
  { repository: 'langchain-ai/langgraph', category: 'agents/context' },
  { repository: 'SWE-agent/SWE-agent', category: 'agents/verification' },
];
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });
const error = (message, status = 400) => json({ error: message }, status);

function boundedNumber(text, fallback, max) {
  if (text == null) return fallback;
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) && n >= 0 && n <= max ? n : null;
}

export async function readEvidence(request, db) {
  if (request.method !== 'GET') return error('read_only', 405);
  const u = new URL(request.url);
  const path = u.pathname.replace(/\/$/, '') || '/';
  if (path === '/health') {
    const count = await db.prepare('SELECT COUNT(*) AS total FROM evidence').first();
    return json({ service: 'quantaphi-agent-evidence', status: 'ok', evidence_count: count.total, read_only: true });
  }
  if (path === '/v1/categories') {
    const { results } = await db.prepare('SELECT slug,parent_slug,label,description FROM categories ORDER BY slug').all();
    return json({ categories: results });
  }
  if (path === '/v1/evidence' || path === '/v1/agent-context') {
    const limit = boundedNumber(u.searchParams.get('limit'), path === '/v1/agent-context' ? 8 : 20, 100);
    const offset = boundedNumber(u.searchParams.get('offset'), 0, 10000);
    if (limit === null || offset === null || limit === 0) return error('invalid_pagination');
    const category = u.searchParams.get('category') || '';
    const q = u.searchParams.get('q') || '';
    if (category.length > 100 || q.length > 120) return error('filter_too_long');
    const evidence = u.searchParams.get('evidence') || '';
    if (evidence && !['independent_study','author_reported','experimental','verified_execution'].includes(evidence)) return error('invalid_evidence_level');
    const review = path === '/v1/agent-context' ? 'curated' : (u.searchParams.get('review') || '');
    if (review && !['curated', 'unreviewed'].includes(review)) return error('invalid_review_status');
    const where = []; const args = [];
    if (category) { where.push('(category_slug = ? OR category_slug LIKE ?)'); args.push(category, `${category}/%`); }
    if (q) { where.push('(title LIKE ? OR result LIKE ? OR action LIKE ?)'); const needle = `%${q.replace(/[\\%_]/g, '\\$&')}%`; args.push(needle, needle, needle); }
    if (evidence) { where.push('evidence_level = ?'); args.push(evidence); }
    if (review) { where.push('review_status = ?'); args.push(review); }
    const sql = 'SELECT id,category_slug,title,url,published_at,kind,evidence_level,review_status,result,limitations,action,ingested_at FROM evidence' +
      (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?';
    const { results } = await db.prepare(sql).bind(...args, limit, offset).all();
    return json({ records: results, returned: results.length, limit, offset, next_offset: results.length === limit ? offset + limit : null,
      note: 'Published claims do not establish QuantaPhi deployment or independent validation. Unreviewed feeds are never verified.' });
  }
  if (path.startsWith('/v1/evidence/')) {
    const id = decodeURIComponent(path.slice('/v1/evidence/'.length));
    if (id.length > 128) return error('invalid_id');
    const item = await db.prepare('SELECT * FROM evidence WHERE id = ?').bind(id).first();
    return item ? json({ record: item }) : error('not_found', 404);
  }
  return error('not_found', 404);
}

// Public GitHub API calls can return 403 from shared Worker egress. Use the
// repository's own Atom release feed as a bounded, untrusted fallback.
function atomText(xml, tag) {
  const match = xml.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>'));
  return match ? match[1].replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|apos|#(\\d+));/g,
    (entity, decimal) => decimal ? String.fromCodePoint(Math.min(Number(decimal), 0x10ffff)) :
      ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[entity] || '').trim() : '';
}
function atomReleases(xml, repository) {
  if (xml.length > 512000 || !xml.includes('<feed')) throw new Error('invalid_atom_feed');
  const entries = [...xml.matchAll(/<entry(?:\\s[^>]*)?>([\\s\\S]*?)<\\/entry>/g)].slice(0, 3);
  return entries.map(([, entry]) => {
    const href = entry.match(/<link\\b[^>]*\\brel="alternate"[^>]*\\bhref="([^"]+)"/)?.[1] ||
      entry.match(/<link\\b[^>]*\\bhref="([^"]+)"[^>]*\\brel="alternate"/)?.[1] || '';
    const expected = `https://github.com/${repository}/releases/tag/`;
    if (!href.startsWith(expected) || !href.slice(expected.length)) return null;
    return { id: 'atom:' + href.slice(expected.length), html_url: href,
      name: atomText(entry, 'title'), body: 'Official upstream release feed; inspect the linked release notes.',
      published_at: atomText(entry, 'published') || atomText(entry, 'updated') };
  }).filter(Boolean);
}
async function fetchReleases(item) {
  const response = await fetch(`https://api.github.com/repos/${item.repository}/releases?per_page=3`, {
    headers: { 'User-Agent': 'QuantaPhi-AgentEvidence-Collector', Accept: 'application/vnd.github+json' },
  });
  if (response.ok) {
    const releases = await response.json();
    if (!Array.isArray(releases)) throw new Error('invalid_feed');
    return releases;
  }
  if (response.status !== 403 && response.status !== 429) throw new Error(`http_${response.status}`);
  const fallback = await fetch(`https://github.com/${item.repository}/releases.atom`, {
    headers: { 'User-Agent': 'QuantaPhi-AgentEvidence-Collector', Accept: 'application/atom+xml' },
  });
  if (!fallback.ok) throw new Error(`github_api_${response.status}_atom_${fallback.status}`);
  return atomReleases(await fallback.text(), item.repository);
}
async function collectReleases(db, item) {
  let imported = 0;
  try {
    const releases = await fetchReleases(item);
    for (const release of releases.slice(0, 3)) {
      if (!/^https:\/\/github\.com\//.test(release.html_url || '')) continue;
      const id = `release:${item.repository}:${release.id}`;
      const title = `${item.repository} ${String(release.name || release.tag_name || 'release').slice(0, 160)}`;
      const summary = String(release.body || 'Upstream release notice; assess changes before adoption.').slice(0, 1200);
      const result = await db.prepare(`INSERT OR IGNORE INTO evidence
        (id,category_slug,title,url,published_at,kind,evidence_level,review_status,result,limitations,action)
        VALUES (?,?,?,?,?,'upstream_release','author_reported','unreviewed',?, ?, ?)`)
        .bind(id, item.category, title, release.html_url, release.published_at || release.created_at || null,
          summary, 'Upstream release claim; not independently tested in QuantaPhi or Robot Brain.',
          'Review source diff, dependencies and license; reproduce in a canary with tests before rollout.').run();
      imported += result.meta?.changes || 0;
    }
    await db.prepare("INSERT INTO ingest_runs(source,imported,outcome,detail) VALUES(?,?,'success','')")
      .bind(item.repository, imported).run();
  } catch (cause) {
    await db.prepare("INSERT INTO ingest_runs(source,imported,outcome,detail) VALUES(?,0,'failure',?)")
      .bind(item.repository, String(cause.message || cause).slice(0,120)).run();
  }
}

export default {
  fetch(request, env) { return readEvidence(request, env.EVIDENCE_DB); },
  async scheduled(_event, env, ctx) {
    await Promise.all(GITHUB_RELEASE_SOURCES.map(item => collectReleases(env.EVIDENCE_DB, item)));
  },
};
