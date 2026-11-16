// Read-only, receipt-grounded Integra draft formatter. Never posts to X or changes wallets.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const MAX_AGE_MS = 36 * 60 * 60 * 1000;
const ACTIONS = ['click', 'play', 'share', 'collect'];
const HANDLES = new Set(['YahooPingcwlz', 'GoogleWaveTech']);
const isCount = n => Number.isSafeInteger(n) && n >= 0;
const timestamp = s => typeof s === 'string' && Number.isFinite(Date.parse(s)) ? Date.parse(s) : NaN;
const fresh = (stamp, at) => Number.isFinite(stamp) && stamp <= at + 300000 && at - stamp <= MAX_AGE_MS;
const num = n => n.toLocaleString('en-US');
const isoMinute = s => new Date(s).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
function shortMessage(message) {
  if ([...message].length > 280) throw Error('draft_exceeds_280_characters');
  return message;
}
function validateXPost(p) {
  if (!p || !HANDLES.has(p.author) || !/^\d{15,22}$/.test(String(p.id)) ||
      p.url !== `https://x.com/${p.author}/status/${p.id}` ||
      typeof p.text !== 'string' || !/#bubbles\b/i.test(p.text)) return false;
  return true;
}

export function buildDailyBrief(input) {
  const at = timestamp(input?.observedAt);
  if (!Number.isFinite(at)) throw Error('observed_at_required');
  const generatedAt = new Date(at).toISOString();
  const messages = [], missing = [];
  const traffic = input.traffic;
  if (traffic && traffic.site === 'quantaphi.org' && traffic.scope === 'recorded_since' &&
      traffic.includesBots === true && traffic.uniqueVisitors === false &&
      isCount(traffic.requests) && isCount(traffic.pageViews) &&
      Number.isFinite(timestamp(traffic.fetchedAt)) && /^20\d{2}-\d{2}-\d{2}$/.test(traffic.since || '')) {
    const checked = timestamp(traffic.fetchedAt);
    const freshness = fresh(checked, at) ? 'Verified' : 'Last verified (stale)';
    messages.push(shortMessage(`Integra traffic • ${freshness} ${isoMinute(checked)}: ${num(traffic.pageViews)} page views / ${num(traffic.requests)} requests since ${traffic.since}. Includes bots; not unique people or proven lifetime. https://quantaphi.org/api/site-traffic`));
    missing.push('Daily page-view total needs a separately verified UTC-day record; cumulative totals are not daily visitors.');
  } else {
    missing.push('Traffic unavailable: missing or invalid Cloudflare ledger receipt; do not invent a count.');
    messages.push(shortMessage('Integra traffic • No valid Cloudflare ledger receipt supplied. Daily visitors and page views are unverified; no estimate published.'));
  }

  const summary = input.cardSummary;
  const cardsValid = summary?.source === 'QuantaPhi public card tracking' &&
    summary.windowHours === 24 && Array.isArray(summary.cards) &&
    fresh(timestamp(summary.updatedAt), at) && summary.cards.every(c =>
      typeof c.id === 'string' && /^[a-z0-9-]{1,40}$/.test(c.id) &&
      ['view', ...ACTIONS].every(a => isCount(c[a])));
  if (cardsValid) {
    const ranking = summary.cards.map(c => ({id:c.id, interactions:ACTIONS.reduce((n,a)=>n+c[a],0), views:c.view})).sort((a,b)=>b.interactions-a.interactions || b.views-a.views || a.id.localeCompare(b.id));
    const leader = ranking[0];
    if (leader?.interactions > 0) {
      messages.push(shortMessage(`Integra cards • 24h recorded actions: ${leader.id} leads with ${num(leader.interactions)} clicks/plays/shares/collects; ${num(leader.views)} recorded views. Events ≠ people. Snapshot ${isoMinute(timestamp(summary.updatedAt))}.`));
    } else {
      messages.push(shortMessage(`Integra cards • No non-view interactions recorded in the supplied 24h card snapshot (${isoMinute(timestamp(summary.updatedAt))}). Not proof of no visitors.`));
    }
  } else {
    missing.push('No fresh, schema-valid 24-hour card interaction snapshot.');
    messages.push(shortMessage('Integra cards • Most-interacted card not verified from a fresh event snapshot. Instrumentation exists, but a valid current read is required.'));
  }
  missing.push('New/returning visitor counts are not available from card events or Cloudflare page views.');

  const brain = input.brain;
  if (brain?.source === 'verified Brain execution receipts' && fresh(timestamp(brain.observedAt), at) &&
      ['queued','claimed','sourceTested','ciPassed','deployed','failed'].every(k=>isCount(brain.counts?.[k])) &&
      typeof brain.receiptUrl === 'string' && /^https:\/\/github\.com\/www-infinity4\/(?:QuantaPhi|Moltnook)\/(?:issues|pull)\/\d+/.test(brain.receiptUrl)) {
    const c = brain.counts;
    messages.push(shortMessage(`Integra Brain • Queued ${c.queued}, claimed ${c.claimed}, source-tested ${c.sourceTested}, CI ${c.ciPassed}, deployed ${c.deployed}, failed ${c.failed}. Separate states; receipt: ${brain.receiptUrl}`));
  } else {
    missing.push('Brain progress needs fresh execution receipts; accepted/queued does not mean built.');
    messages.push(shortMessage('Integra Brain • No fresh verified execution-count receipt supplied. Queued work is not a finished build. Track commits, CI, review, deployment and real acceptance separately.'));
  }

  const posts = [...new Map((Array.isArray(input.xPosts) ? input.xPosts : [])
    .filter(validateXPost).filter(p=>fresh(timestamp(p.observedAt),at))
    .map(p=>[p.author+':'+p.id,p])).values()];
  if (posts.length) {
    const ids = posts.slice(0,2).map(p=>p.url);
    messages.push(shortMessage(`Integra #bubbles • ${posts.length} recent tagged post${posts.length===1?'':'s'} observed from followed owner/G-Ware accounts; dedupe and route to numbered work tickets. Intake ≠ completed build. ${ids[0]}`));
  } else missing.push('No fresh signed-in #bubbles post receipts supplied; do not infer the inbox is empty.');
  return {schemaVersion:1,generatedAt,kind:'read_only_x_drafts_not_posted',messages,missing};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw Error('usage: node scripts/integra-daily-brief.mjs <local-receipts.json>');
    const input = JSON.parse(await readFile(process.argv[2],'utf8'));
    process.stdout.write(JSON.stringify(buildDailyBrief(input),null,2)+'\n');
  } catch (error) {
    process.stderr.write(`integra_daily_brief: ${error.message}\n`);
    process.exitCode = 2;
  }
}
