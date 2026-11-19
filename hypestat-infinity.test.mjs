import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('./hypestat-infinity.html', import.meta.url), 'utf8');
const core = html.match(/<script id="infinity-core">([\s\S]*?)<\/script>/)[1];
const ctx = vm.createContext({ URL, TextEncoder });
vm.runInContext(core, ctx);
const C = ctx.HypeInfinity;
const plain = value => JSON.parse(JSON.stringify(value));
const row = (extra = {}) => ({ date: '2026-11-19', site: 'example.org', scope: 'public_site', basis: 'owner_aggregate', provider: 'GA4', referrer: 'google.com', page: '/index.html', destination: 'example.net', country: 'US', metric: 'outbound_clicks', value: 12, ...extra });
const evidence = (extra = {}) => ({ subject: 'Public report', kind: 'public_record', source: 'https://example.org/report', observedAt: '2026-11-19T12:00:00Z', claim: 'A source claim, not identity proof.', ...extra });
const empty = () => ({ version: 1, records: [], traffic: [] });
const label = 'pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd';

test('onion origin and public gateway retain different scopes without fetching', () => {
  assert.equal(C.classify(label + '.onion').scope, 'onion_service');
  assert.equal(C.classify(label + '.onion.ly').scope, 'gateway');
  assert.equal(C.classify('https://example.org/').scope, 'public_site');
  assert.match(C.classify(label + '.onion').checksum, /not checked/);
  for (const value of ['http://user:pass@example.org', 'example.org/private', 'http://example.org/?id=1', 'tiny.onion', 'javascript:alert(1)', 'http://127.0.0.1/']) assert.throws(() => C.classify(value));
});

test('evidence source links reject executable protocols, direct gateways, and local hosts', () => {
  for (const source of ['javascript:alert(1)', 'data:text/html,x', 'http://example.org', 'https://user:pass@example.org', 'https://'+label+'.onion.ly', 'https://localhost/x', 'https://192.168.1.5/', 'https://printer.local/']) assert.throws(() => C.record(evidence({ source })));
  assert.equal(C.record(evidence({ source: 'https://hypestat.com/about' })).source, 'https://hypestat.com/about');
});

test('evidence timestamps reject nonexistent calendar dates', () => {
  assert.throws(() => C.record(evidence({ observedAt: '2026-02-30T12:00:00Z' })));
  assert.throws(() => C.record(evidence({ observedAt: '2026-11-19T27:00:00Z' })));
  assert.throws(() => C.record(evidence({ observedAt: '2026-11-19T24:00:00Z' })));
});

test('normalized CSV round-trips aggregates and strict quoting', () => {
  const rows = C.parseCSV(C.csv([row(), row({ provider: 'Cloudflare', metric: 'requests', value: 0 })]));
  assert.deepEqual(plain(rows), [row(), row({ provider: 'Cloudflare', metric: 'requests', value: 0 })]);
  assert.equal(C.parseCSV('\uFEFF'+C.csv([row()])).length, 1);
  assert.equal(C.parseCSV(C.csv([])).length, 0);
  assert.throws(() => C.parseCSV(C.csv([row()]).replace('"GA4"', '"GA4"junk')));
  assert.throws(() => C.parseCSV(C.csv([row()]).replace('"GA4"', '"GA4')));
});

test('visitor identifier columns and invalid aggregate values fail before import', () => {
  assert.throws(() => C.parseCSV(C.csv([row()]).replace('date,site', 'ip,date,site')), /template columns/);
  for (const value of [-1, 1.5, Infinity, NaN, '1e3', '9007199254740992', true, null]) assert.throws(() => C.traffic(row({ value })));
  for (const page of ['/page?email=person@example.org', '/person#token', '/..', '/some%20name']) assert.throws(() => C.traffic(row({ page })));
  assert.throws(() => C.traffic(row({ date: '2026-02-30' })));
  assert.throws(() => C.traffic({ ...row(), user_id: 'private' }));
});

test('gateway and onion data cannot be mislabeled as owned-domain scope', () => {
  assert.throws(() => C.traffic(row({ site: label+'.onion.ly' })), /scope disagree/);
  assert.throws(() => C.traffic(row({ site: label+'.onion' })), /scope disagree/);
  assert.equal(C.traffic(row({ site: label+'.onion.ly', scope: 'gateway', basis: 'third_party_estimate' })).scope, 'gateway');
});

test('backup validation rejects hidden fields, unknown versions, and partial bad imports', () => {
  const valid = { version: 1, records: [evidence()], traffic: [row()] };
  assert.equal(C.backup(JSON.stringify(valid)).traffic.length, 1);
  assert.throws(() => C.backup(JSON.stringify({ ...valid, version: 2 })));
  assert.throws(() => C.backup(JSON.stringify({ ...valid, identities: ['private'] })));
  assert.throws(() => C.backup(JSON.stringify({ ...valid, traffic: [row(), row({ value: -3 })] })));
  assert.throws(() => C.backup('{"__proto__":{},"version":1,"records":[],"traffic":[]}'));
  assert.throws(() => C.backup('x'.repeat(C.MAX_BYTES + 1)));
});

test('merge de-duplicates and preserves source, metric, date, and scope distinctions', () => {
  const a = C.backup(JSON.stringify({ version: 1, records: [evidence()], traffic: [row()] }));
  const b = C.backup(JSON.stringify({ version: 1, records: [evidence()], traffic: [row(), row({ metric: 'requests' }), row({ provider: 'Cloudflare' }), row({ date: '2026-11-18' }), row({ basis: 'third_party_estimate' })] }));
  const m = C.merge(a, b);
  assert.equal(m.records.length, 1);
  assert.equal(m.traffic.length, 5);
  assert.equal(a.traffic.length, 1);
  assert.equal(C.merge(empty(), empty()).traffic.length, 0);
});

test('app forbids automatic network requests and unsafe DOM HTML rendering', () => {
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.doesNotMatch(html, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|\.innerHTML\s*=|<iframe|<script[^>]+src=/);
  assert.match(html, /Site operator<\/small><strong>Not established/);
  assert.match(html, /Onion availability<\/small><strong>Not checked/);
  assert.match(html, /Dash \/ script claim<\/small><strong>Unverified/);
});

test('unified project has a safe discovery card and a full-surface Bubbles route', async () => {
  const { findCard, cards, cardIntent } = await import('./bubbles-card-catalog.mjs');
  const { findDiscovery, safeDiscovery } = await import('./quanta-feed-catalog.mjs');
  const card = findCard('hypestat');
  assert.equal(card?.id, 'hypestat-infinity');
  assert.equal(card.url, '/hypestat-infinity.html');
  assert.equal(card.surface, 'body', 'the navigation tabs must stay available in the full card');
  assert.equal(cards.filter(c => c.id === card.id).length, 1);
  for (const name of ['tor public records', 'google traffic', 'gemini traffic']) {
    assert.equal(cardIntent('open ' + name)?.card?.id, card.id, name);
  }
  const discovery = findDiscovery(card.id);
  assert.equal(discovery?.url, 'https://quantaphi.org/hypestat-infinity.html');
  assert.ok(safeDiscovery(discovery));
});

test('earlier Tor design retains all seven dated records and safe source references', () => {
  assert.match(html, /id="tab-tor"/);
  assert.match(html, /id="view-tor"/);
  assert.match(html, /id="tor-query"/);
  assert.match(html, /id="tor-type"/);
  const match = html.match(/<script type="application\/json" id="tor-record-data">([\s\S]*?)<\/script>/);
  assert.ok(match, 'the previous Tor records must be included in the unified page');
  const rows = JSON.parse(match[1]);
  assert.equal(rows.length, 7);
  assert.equal(rows.filter(r => r.type === 'enforcement').length, 3);
  assert.ok(rows.some(r => r.title === 'BBC report on Tor traffic'));
  assert.ok(rows.some(r => r.title === 'United States v. Levin'));
  assert.match(rows.find(r => r.title === 'Xplay').label, /unverified/i);
  for (const row of rows) assert.equal(C.safeSource(row.source), row.source);
  assert.match(html, /historical.*live status/i);
  const priorRoute = readFileSync(new URL('./tor-public-records.html', import.meta.url), 'utf8');
  assert.ok(priorRoute.includes('url=./hypestat-infinity.html?view=tor'));
  assert.ok(priorRoute.includes('href="./hypestat-infinity.html?view=tor"'));
});

test('homepage and full-size experiences mount the same project component', () => {
  const home = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const experience = readFileSync(new URL('./quanta-card-experience.mjs', import.meta.url), 'utf8');
  const deck = readFileSync(new URL('./oracle-card-deck.js', import.meta.url), 'utf8');
  assert.match(home, /id="hypestatInfinityQuickCard"/);
  assert.match(home, /href="\/hypestat-infinity\.html"/);
  assert.match(home, /src="\/hypestat-infinity-card\.mjs/);
  assert.match(experience, /mountHypeStatInfinityCard/);
  assert.match(experience, /id==='hypestat-infinity'/);
  assert.ok(deck.includes("['hypestatInfinityQuickCard','HypeStat Infinity · Tor & Google Research']"));
  assert.ok(deck.includes("hypestatInfinityQuickCard:['hypestat-infinity','Research'"));
});

test('embedded component only constructs known same-origin workspace paths', async () => {
  const { hypestatWorkspacePath, HYPESTAT_VIEWS } = await import('./hypestat-infinity-card.mjs');
  assert.equal(HYPESTAT_VIEWS.length, 4);
  assert.equal(hypestatWorkspacePath('tor', true), '/hypestat-infinity.html?view=tor&embed=1');
  assert.equal(hypestatWorkspacePath('google'), '/hypestat-infinity.html?view=google');
  assert.equal(hypestatWorkspacePath('https://unexpected.example/'), '/hypestat-infinity.html?view=records');
});
