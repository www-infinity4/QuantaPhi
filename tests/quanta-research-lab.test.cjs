const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'quanta-research-lab.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'quanta-research-lab.js'), 'utf8');

test('research index preserves original site integration points', () => {
  for (const id of ['q', 'go', 'qinfinity', 'qtoken', 'qtrafficRequests', 'qtrafficViews', 'oracleCardDeck', 'oracleCardStage', 'walmartShoppingCard', 'shopAdPhi']) {
    assert.ok(html.includes('id="' + id + '"'), 'Missing original index element ' + id);
  }
  for (const script of ['/bubbles-ai.js', '/oracle-card-deck.js', '/site-traffic.js']) {
    assert.ok(html.includes(script), 'Missing original site script ' + script);
  }
  assert.match(html, /data-oracle-feed="public"/);
  assert.match(html, /data-oracle-feed="for-you"/);
  assert.match(html, /data-oracle-feed="following"/);
});

test('research lab provides accessible, non-fictional interaction', () => {
  for (const id of ['quantaResearchLab', 'qpLabConsoleForm', 'qpLabConsoleInput', 'qpLabConsoleLog']) {
    assert.ok(html.includes('id="' + id + '"'), 'Missing laboratory element ' + id);
  }
  assert.match(html, /role="log"/);
  assert.match(html, /ILLUSTRATIVE MODEL/);
  assert.match(html, /NO BACKEND CONNECTION CLAIMED/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(js, /innerHTML\s*=/);
  assert.doesNotMatch(js, /fetch\s*\(/);
  assert.doesNotMatch(html, /SYS_STATUS: RUNNING|Roaming synchronization established successfully/i);
  assert.doesNotThrow(() => new vm.Script(js));
});

test('console navigates and never executes arbitrary input', () => {
  class Element {
    constructor() { this.listeners = {}; this.children = []; this.value = ''; this.hidden = false; this.dataset = {}; }
    addEventListener(type, cb) { this.listeners[type] = cb; }
    appendChild(child) { this.children.push(child); return child; }
    replaceChildren() { this.children.length = 0; }
    get childElementCount() { return this.children.length; }
    get firstElementChild() { return this.children[0]; }
    scrollIntoView() { this.scrolled = true; }
    focus() { this.focused = true; }
  }
  const ids = {};
  for (const id of ['qpLabConsoleForm','qpLabConsoleInput','qpLabConsoleLog','q','oracleCardDeck','oracleCardStage']) ids[id] = new Element();
  const doc = { getElementById(id) { return ids[id] || null; }, createElement() { return new Element(); } };
  vm.runInNewContext(js, { document: doc });
  const submit = command => {
    ids.qpLabConsoleInput.value = command;
    ids.qpLabConsoleForm.listeners.submit({ preventDefault() {} });
    return ids.qpLabConsoleLog.children.map(x => x.textContent).join('\n');
  };
  assert.match(submit('help'), /Commands:/);
  assert.match(submit('status'), /Remote brain, deployment and TLS health were not checked/);
  assert.match(submit('cards'), /interactive Public/);
  assert.equal(ids.oracleCardDeck.scrolled, true);
  assert.match(submit('search'), /main QuantaPhi search field/);
  assert.equal(ids.q.focused, true);
  assert.match(submit('<img src=x onerror=alert(1)>'), /Unrecognized local command/);
  assert.ok(ids.qpLabConsoleLog.children.some(x => x.textContent.includes('<img src=x onerror=alert(1)>')));
});
