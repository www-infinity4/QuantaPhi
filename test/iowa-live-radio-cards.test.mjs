import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = () => readFileSync(new URL('../iowa-live-radio-cards.js', import.meta.url), 'utf8');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.className = '';
    this.dataset = {};
    this.listeners = {};
    this.attributes = {};
    this.style = {};
    this.hidden = false;
    this.textContent = '';
    this.src = '';
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  insertAdjacentElement(_position, child) { this.append(child); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  click() { return Promise.all((this.listeners.click || []).map(fn => fn())); }
  scrollBy(_options) {}
  pause() { this.paused = true; this.pauses = (this.pauses || 0) + 1; }
  play() { this.paused = false; this.plays = (this.plays || 0) + 1; return Promise.resolve(); }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  load() {}
}
const descendants = (root) => [root, ...root.children.flatMap(descendants)];
const byClass = (root, name) => descendants(root).filter(n => n.className.split(' ').includes(name));

function boot() {
  const anchor = new Element('div');
  const existingAudio = new Element('audio');
  const windowListeners = {};
  const window = {
    addEventListener: (event, fn) => { (windowListeners[event] ||= []).push(fn); },
    dispatchEvent: () => {}
  };
  const document = {
    head: new Element('head'),
    getElementById: id => id === 'infinityRadioQuick' ? anchor : null,
    createElement: tag => new Element(tag),
    querySelectorAll: selector => selector === 'audio' ? [existingAudio] : []
  };
  vm.runInNewContext(source(), { window, document, console, URL, Promise, CustomEvent: class {
    constructor(type, init) { this.type = type; this.detail = init?.detail; }
  } });
  return { anchor, existingAudio, windowListeners };
}

test('radio carousel has sourced Iowa stations and user-initiated playback', async () => {
  const { anchor, existingAudio } = boot();
  const cards = byClass(anchor, 'ilr-card');
  assert.ok(cards.length >= 7, 'WHO, KXNO, Bus, Kiss and three IPR channels');
  assert.ok(descendants(cards[0]).some(n => /WHO/.test(n.textContent)), 'WHO is the first featured station');
  assert.equal(existingAudio.pauses || 0, 0, 'mounting never interrupts current music');
  const news = cards.find(c => c.dataset.station === 'ipr-news');
  assert.ok(news, 'IPR News card exists');
  await byClass(news, 'ilr-play')[0].click();
  await Promise.resolve();
  const audio = descendants(anchor).find(n => n.tagName === 'AUDIO');
  assert.equal(audio.src, 'https://news-stream.iowapublicradio.org/News.mp3');
  assert.equal(audio.plays, 1);
  assert.ok(existingAudio.pauses > 0, 'choosing a station silences another audio player');
  await byClass(news, 'ilr-play')[0].click();
  assert.ok(audio.paused, 'second tap pauses current MP3 channel');
});

test('official iHeart embed loads on demand without an unsolicited external redirect', async () => {
  const { anchor } = boot();
  const who = byClass(anchor, 'ilr-card')[0];
  const embeddedBefore = descendants(anchor).filter(n => n.tagName === 'IFRAME');
  assert.equal(embeddedBefore.length, 0, 'no third-party player auto-loads');
  await byClass(who, 'ilr-play')[0].click();
  const frames = descendants(anchor).filter(n => n.tagName === 'IFRAME');
  assert.equal(frames.length, 1);
  assert.match(frames[0].src, /^https:\/\/www\.iheart\.com\/live\/1040-who-925\/\?embed=true$/);
  assert.ok(!frames[0].attributes.autoplay);
  assert.equal(byClass(anchor, 'ilr-status').length, 1);
});

test('station carousel documents verified published direct streams and official fallback pages', () => {
  const text = source();
  for (const suffix of ['News.mp3', 'Classical.mp3', 'StudioOne.mp3']) {
    assert.ok(text.includes(suffix), 'missing source-confirmed IPR stream ' + suffix);
  }
  assert.ok(text.includes('https://www.iheart.com/live/1460-and-1063-kxno-921/'));
  assert.ok(text.includes('https://www.iheart.com/live/1003-the-bus-2744/'));
  assert.ok(text.includes('https://www.iheart.com/live/1075-kiss-fm-2740/'));
  assert.ok(!text.includes('autoplay=true'));
});
