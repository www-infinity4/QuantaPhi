import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Synthetic browser only: no wallet, owner account, provider login or live API.
async function mountUpdateControls({message = '', imagePending = false, confirm = true} = {}) {
  const nodes = [];
  const makeNode = tag => {
    const node = {
      tag, hidden: false, disabled: false, dataset: {}, children: [], events: {},
      textContent: '', parentElement: null,
      append(...children) { this.children.push(...children); },
      addEventListener(type, handler) { this.events[type] = handler; },
      setAttribute() {}
    };
    nodes.push(node);
    return node;
  };
  const install = makeNode('button');
  const status = makeNode('p');
  status.parentElement = {append() {}};
  const text = {value: message};
  const image = {hidden: !imagePending};
  const form = {querySelector(selector) {
    if (selector === 'textarea[aria-label="Message Bubbles"]') return text;
    if (selector === '.ba-photo-preview') return image;
    return null;
  }};
  const navigations = [];
  let confirmations = 0;
  const document = {
    visibilityState: 'visible',
    querySelector: selector => selector === '#bubblesInstallChrome' ? install
      : selector === '#bubblesInstallStatus' ? status : null,
    querySelectorAll: selector => selector === '.ba-composer' ? [form] : [],
    createElement: makeNode,
    addEventListener() {}
  };
  const location = {
    search: '', href: 'https://quantaphi.org/bubbles-chrome.html',
    assign(url) { navigations.push(url); }
  };
  const window = {
    navigator: {standalone: false}, isSecureContext: false,
    matchMedia: () => ({matches: false}),
    addEventListener() {}, setInterval() {},
    confirm() { confirmations++; return confirm; }
  };
  const source = fs.readFileSync('bubbles-pwa.js', 'utf8');
  vm.runInNewContext(source, {
    document, navigator: {userAgent: 'Chrome'}, window, location,
    URL, URLSearchParams, Date,
    fetch: async () => ({ok: true, json: async () => ({version: '20261026-ui-settings2'})})
  });
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const button = nodes.find(node => node.tag === 'button' && node.textContent === 'Update Bubbles');
  assert.ok(button, 'new first-party release must be offered');
  const updateMessage = nodes.find(node => node.tag === 'p' && node !== status);
  assert.ok(updateMessage);
  return {button, updateMessage, navigations, get confirmations() {return confirmations;}};
}

test('Bubbles PWA update refuses to reload an unsent chat draft', async () => {
  const app = await mountUpdateControls({message: 'Important unfinished owner instructions'});
  app.button.events.click();
  assert.equal(app.navigations.length, 0);
  assert.equal(app.confirmations, 0);
  assert.match(app.updateMessage.textContent, /unsent Bubbles message or image/);
});

test('Bubbles PWA update refuses to reload an unsent photo', async () => {
  const app = await mountUpdateControls({imagePending: true});
  app.button.events.click();
  assert.equal(app.navigations.length, 0);
  assert.equal(app.confirmations, 0);
});

test('Bubbles PWA update permits confirmed reload when composer is empty', async () => {
  const app = await mountUpdateControls();
  app.button.events.click();
  assert.equal(app.confirmations, 1);
  assert.equal(app.navigations.length, 1);
  assert.equal(new URL(app.navigations[0]).searchParams.get('appVersion'), '20261026-ui-settings2');
});

test('Bubbles PWA update never reloads when confirmation is declined', async () => {
  const app = await mountUpdateControls({confirm: false});
  app.button.events.click();
  assert.equal(app.confirmations, 1);
  assert.equal(app.navigations.length, 0);
});
