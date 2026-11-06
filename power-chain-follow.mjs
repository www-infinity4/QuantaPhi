/* Match only ready catalog entries with a narrow, editorially assigned topic.
 * A broad search label, click history or an inferred follow cannot seed a chain. */
const DENIM = new Set(['denim', 'denim & fashion']);
const COINS = new Set(['coin news', 'coin varieties', 'coin grading', 'coin auctions', 'numismatics']);
const SOCIAL = new Set(['social', 'social media', 'social networking']);
const COIN_CARDS = new Map([['pcgs', 'pcgs.com'], ['ngc', 'ngccoin.com'], ['heritage', 'coins.ha.com']]);
const SOCIAL_CARDS = new Map([['reddit', 'reddit.com'], ['tiktok', 'tiktok.com']]);
const PUBLISHER_ALIASES = new Map([['twitter.com', 'x.com'], ['pepejeans.in', 'pepejeans.com']]);

export const POWER_CHAIN_TOPICS = Object.freeze({ denim: 'Denim', coins: 'Coin collecting', social: 'Social media' });

export function powerChainProfile(card) {
 if (card?.ready !== true || card.restricted === true) return null;
 let source;
 try { source = new URL(card.official); } catch { return null; }
 if (source.protocol !== 'https:' || source.username || source.password || source.port) return null;
 const host = source.hostname.replace(/^www\./, '');
 if (!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return null;
 const publisher = PUBLISHER_ALIASES.get(host) || host;
 const category = String(card.category || '').trim().toLowerCase();
 if (DENIM.has(category)) return { topic: 'denim', publisher };
 if (COINS.has(category) || COIN_CARDS.get(card.id) === host) return { topic: 'coins', publisher };
 if (SOCIAL.has(category) || SOCIAL_CARDS.get(card.id) === host) return { topic: 'social', publisher };
 return null;
}

export function resolvePowerChainFollows(cards, state) {
 const matches = new Map();
 const seeds = new Set(state.powerChain?.seeds || []);
 if (!seeds.size) return matches;
 const direct = new Set(state.following);
 const excluded = new Set(state.powerChain?.excluded || []);
 const topics = new Map();
 const profiles = new Map();
 for (const card of cards) {
  const profile = powerChainProfile(card);
  if (!profile) continue;
  profiles.set(card.id, profile);
  if (!direct.has(card.id)) continue;
  const group = topics.get(profile.topic) || { publishers: new Set(), seed: null };
  group.publishers.add(profile.publisher);
  if (!group.seed && seeds.has(card.id)) group.seed = card;
  topics.set(profile.topic, group);
 }
 for (const [id, profile] of profiles) {
  const group = topics.get(profile.topic);
  if (!group?.seed || group.publishers.has(profile.publisher) || direct.has(id) || excluded.has(id)) continue;
  matches.set(id, { ...profile, seedId: group.seed.id, seedName: group.seed.name });
 }
 return matches;
}

export function balancePowerChainRotation(cards, current) {
 const options = cards.filter(card => card.id !== current?.id);
 if (!current || !options.length) return cards;
 const topic = card => card.powerChain?.topic || card.category;
 const otherTopics = options.filter(card => topic(card) !== topic(current));
 if (otherTopics.length) return otherTopics;
 const publisher = current.powerChain?.publisher;
 const otherPublishers = publisher ? options.filter(card => card.powerChain?.publisher !== publisher) : [];
 return otherPublishers.length ? otherPublishers : options;
}
