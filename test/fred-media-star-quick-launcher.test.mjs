import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('a top-level radio-style button opens the existing Fred Media Star in the Oracle player', () => {
  const page=read('index.html');
  const styles=read('quick-fred-spaces.css');
  const deck=read('oracle-card-deck.js');
  assert.match(page, /<aside id="fredSpacesQuick"[^>]*>/);
  assert.match(page, /<button id="fredSpacesQuickPlay"[^>]*data-oracle-spotlight="fredSpacesRadio"/);
  assert.match(page, /Media Star · Fred(?:&#39;|’|')s Spaces/);
  assert.match(page, /quick-fred-spaces\.css\?v=/);
  assert.match(styles, /#fredSpacesQuickPlay/);
  assert.match(styles, /min-height:\s*48px/);
  assert.match(styles, /width:\s*48px;height:\s*48px/);
  assert.match(deck, /document\.querySelectorAll\('\[data-oracle-spotlight\]'\)/);
  assert.match(deck, /show\(entry\);host\.scrollIntoView\?\./);
});

test('Fred launcher never spends StarCoins, simulates in-card audio or bypasses the original ledger', () => {
  const page=read('index.html');
  const player=read('fred-spaces-radio.js');
  const section=page.match(/<aside id="fredSpacesQuick"[\s\S]*?<\/aside>/)?.[0];
  assert.ok(section);
  assert.doesNotMatch(section, /on(?:click|touchstart)\s*=/i);
  assert.doesNotMatch(section, /\/v1\/spaces\/unlock|new Audio|<audio/i);
  assert.match(player, /const API = "https:\/\/fred-spaces-ledger\.marvaseater\.workers\.dev"/);
  assert.match(player, /if\(!paymentsReady\)/);
  assert.match(player, /window\.confirm\("Spend 1 full StarCoin/);
  assert.match(player, /play\.href=active\.source;play\.target="_blank"/);
  assert.match(page, /First episode free/);
  assert.match(page, /listen on X/);
});

test('existing Blue Star and Neosporin remain original single-click Oracle cards labeled as featured, not unverified trending', () => {
  const page=read('index.html');
  const essentials=read('essentials-quick-cards.css');
  assert.match(page, /QuantaPhi featured Quick Cards/);
  assert.match(page, /data-oracle-spotlight="source-blue-star-ointment"/);
  assert.match(page, /data-oracle-spotlight="source-neosporin-original-1oz"/);
  assert.match(essentials, /\.oracle-essentials-label/);
  assert.doesNotMatch(page, /Blue Star[^\n]*#1 trending|Neosporin[^\n]*#1 trending/i);
});
