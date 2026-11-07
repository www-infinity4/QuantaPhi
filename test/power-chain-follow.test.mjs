import test from 'node:test';
import {ESSENTIALS_SEED,prepareEssentialsBatch} from '../essentials-card-batch.mjs';
import assert from 'node:assert/strict';
import { BRAND_PRODUCT_CARDS } from '../brand-product-cards.mjs';
import { PREMIUM_CARDS } from '../premium-source-cards.mjs';
import { QUICK_CARD_SOURCES, isPublicSourceCard } from '../source-quick-cards.mjs';
import { balancePowerChainRotation, powerChainProfile, resolvePowerChainFollows } from '../power-chain-follow.mjs';
import {
 cleanFeedState, feedCandidates, nextDeckCycle, toggleFollowing, togglePowerChainFollowing, unfollowPowerChainCard
} from '../quanta-feed-rank.mjs';

const catalog = [
 ...BRAND_PRODUCT_CARDS.map(card => ({ ...card, name: card.brand, official: card.shop })),
 ...PREMIUM_CARDS,
 ...QUICK_CARD_SOURCES.filter(isPublicSourceCard).map(card => ({ ...card, category: card.kind })),
 { id: 'x-twitter', name: 'X · Twitter', category: 'Social', official: 'https://x.com/' }
].map(card => ({ ...card, ready: true }));
const levis = 'levis-501-dark';
const guess = 'guess-g11-light';

test('explicit Blue Star chain only adds reviewed skin relief from different publishers', () => {
 const {cards}=prepareEssentialsBatch(ESSENTIALS_SEED,{today:'2026-11-07'});
 const editorial=cards.map(c=>({id:c.id,name:c.brand,category:c.category,official:c.productUrl,ready:true}));
 const selected=togglePowerChainFollowing(cleanFeedState({}), 'blue-star-ointment');
 const matches=resolvePowerChainFollows(editorial,selected);
 assert.equal(matches.get('aveeno-anti-itch')?.topic,'skin');
 assert.equal(matches.get('sarna-original-lotion')?.topic,'skin');
 assert.equal(matches.has('campho-phenique-liquid'),false); // same source seller
 assert.equal(matches.has('blue-star-ointment'),false);
 assert.equal(resolvePowerChainFollows(editorial, cleanFeedState({})).size,0);
});

test('existing direct follows stay direct until the visitor enables Power Chain for one', () => {
 const saved = cleanFeedState({ following: [levis, 'coinworld'] });
 assert.equal(resolvePowerChainFollows(catalog, saved).size, 0);
 const enabled = togglePowerChainFollowing(saved, levis);
 const related = resolvePowerChainFollows(catalog, enabled);
 assert.equal(related.get(guess)?.seedId, levis);
 assert.equal(related.get('pepe-brooke')?.topic, 'denim');
 assert.equal(related.has('levis-501-medium'), false);
 assert.equal(related.has('coinage'), false);
 assert.deepEqual(togglePowerChainFollowing(enabled, levis).following, saved.following);
 assert.equal(resolvePowerChainFollows(catalog, togglePowerChainFollowing(enabled, levis)).size, 0);
});

test('coin and social chains match reviewed cards and leave broad adjacent categories out', () => {
 let state = togglePowerChainFollowing(cleanFeedState({}), 'coinworld');
 state = togglePowerChainFollowing(state, 'x-twitter');
 const related = resolvePowerChainFollows(catalog, state);
 for (const id of ['coinage', 'vamworld', 'pcgs', 'ngc', 'heritage']) assert.equal(related.get(id)?.topic, 'coins', id);
 for (const id of ['instagram', 'facebook', 'reddit', 'tiktok']) assert.equal(related.get(id)?.topic, 'social', id);
 for (const id of ['christies', 'topps', 'whatsapp', 'youtube', 'x', guess]) assert.equal(related.has(id), false, id);
});

test('a hidden seed, unavailable match or non-public source cannot form an automatic follow', () => {
 const state = togglePowerChainFollowing(cleanFeedState({}), levis);
 const seed = catalog.find(card => card.id === levis);
 const candidate = catalog.find(card => card.id === guess);
 assert.equal(resolvePowerChainFollows([{ ...seed, ready: false }, candidate], state).size, 0);
 for (const change of [
  { ready: false }, { restricted: true }, { category: 'Shopping' }, { category: 'Coins' },
  { official: 'http://guess.com/' }, { official: 'https://account:token@guess.com/' },
  { official: 'https://localhost/' }
 ]) assert.equal(resolvePowerChainFollows([seed, { ...candidate, ...change }], state).size, 0);
 assert.equal(resolvePowerChainFollows([seed, candidate], { following: [], powerChain: state.powerChain }).size, 0);
});

test('unfollow is durable across reload, other seeds and re-enabling a chain', () => {
 let state = togglePowerChainFollowing(cleanFeedState({}), levis);
 state = unfollowPowerChainCard(state, guess);
 state = cleanFeedState(JSON.parse(JSON.stringify(state)));
 state = togglePowerChainFollowing(state, 'pepe-brooke');
 assert.equal(resolvePowerChainFollows(catalog, state).has(guess), false);
 state = toggleFollowing(state, guess);
 assert.equal(state.following.includes(guess), true);
 assert.equal(state.powerChain.excluded.includes(guess), false);
 state = toggleFollowing(state, guess);
 assert.equal(resolvePowerChainFollows(catalog, state).has(guess), false);
 state = toggleFollowing(state, levis);
 assert.equal(state.powerChain.seeds.includes(levis), false);
 assert.equal(resolvePowerChainFollows(catalog, state).has(levis), false);
});

test('Next prefers another topic, then another publisher, within the existing no-repeat round', () => {
 const cards = catalog.filter(card => [levis, guess, 'guess-g11-dark', 'coinage', 'pepe-brooke'].includes(card.id))
  .map(card => ({ ...card, powerChain: powerChainProfile(card) }));
 const denim = cards.find(card => card.id === guess);
 const round = nextDeckCycle(cards, guess, new Set([guess, levis]));
 assert.deepEqual(balancePowerChainRotation(round.cards, denim).map(card => card.id), ['coinage']);
 const denimRound = nextDeckCycle(cards, guess, new Set([guess, levis, 'coinage']));
 assert.deepEqual(balancePowerChainRotation(denimRound.cards, denim).map(card => card.id), ['pepe-brooke']);
});

test('one explicit seed can add over 1,000 catalog matches without saving their IDs as direct follows', () => {
 const cards = Array.from({ length: 1250 }, (_, i) => ({
  id: 'coin-publication-'+i, name: 'Publication '+i, category: 'Coin news', ready: true,
  official: 'https://publication-'+i+'.example/'
 }));
 const seed = catalog.find(card => card.id === 'coinworld');
 const state = cleanFeedState(togglePowerChainFollowing(cleanFeedState({}), seed.id));
 const related = resolvePowerChainFollows([seed, ...cards], state);
 assert.equal(related.size, 1250);
 assert.deepEqual(state.following, [seed.id]);
 assert.deepEqual(state.powerChain, { seeds: [seed.id], excluded: [] });
 const effective = { ...state, following: [seed.id, ...related.keys()] };
 assert.equal(feedCandidates([seed, ...cards], 'following', effective).length, 1251);
});
