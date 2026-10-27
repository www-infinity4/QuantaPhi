import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Synthetic browser only: no wallet, owner account, provider login or live API.
async function mountUpdateControls({message = '', imagePending = false, fileSelected = false, confirm = true, canPrepare = true, fetchResults = []} = {}) {
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
  const photoFile = {files: fileSelected ? [{name: 'pending-photo.png'}] : []};
  const form = {querySelector(selector) {
    if (selector === 'textarea[aria-label="Message Bubbles"]') return text;
    if (selector === '.ba-photo-preview') return image;
    if (selector === '.ba-photo-file') return photoFile;
    return null;
  }};
  const navigations = [];
  let confirmations = 0, preparations = 0, fetchCalls = 0, scheduledCheck;
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
    addEventListener() {}, setInterval(handler) { scheduledCheck = handler; },
    confirm() { confirmations++; return confirm; },
    QuantaBubbles: {prepareSiteUpdateReload() { preparations++; return canPrepare; }}
  };
  const source = fs.readFileSync('bubbles-pwa.js', 'utf8');
  vm.runInNewContext(source, {
    document, navigator: {userAgent: 'Chrome'}, window, location,
    URL, URLSearchParams, Date,
    fetch: async () => {
      if (fetchResults[fetchCalls++] === 'error') throw new Error('temporary_manifest_failure');
      return {ok: true, json: async () => ({version: '20261026-ui-settings2'})};
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const button = nodes.find(node => node.tag === 'button' && node.textContent === 'Update Bubbles');
  assert.ok(button, 'new first-party release must be offered');
  const updateMessage = nodes.find(node => node.tag === 'p' && node !== status);
  assert.ok(updateMessage);
  return {button, updateMessage, navigations,
    async runScheduledCheck() {
      assert.ok(scheduledCheck, 'hourly update check must be registered');
      scheduledCheck();
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
    },
    get confirmations() {return confirmations;}, get preparations() {return preparations;}};
}

test('Bubbles PWA update refuses to reload an unsent chat draft', async () => {
  const app = await mountUpdateControls({message: 'Important unfinished owner instructions'});
  app.button.events.click();
  assert.equal(app.navigations.length, 0);
  assert.equal(app.confirmations, 0);
  assert.equal(app.preparations, 0);
  assert.match(app.updateMessage.textContent, /unsent Bubbles message or image/);
});

test('Bubbles PWA update refuses to reload an unsent photo', async () => {
  const app = await mountUpdateControls({imagePending: true});
  app.button.events.click();
  assert.equal(app.navigations.length, 0);
  assert.equal(app.confirmations, 0);
});

test('Bubbles PWA update refuses reload while a selected image is still preparing', async () => {
  const app = await mountUpdateControls({fileSelected: true});
  app.button.events.click();
  assert.equal(app.navigations.length, 0);
  assert.equal(app.confirmations, 0);
  assert.match(app.updateMessage.textContent, /unsent Bubbles message or image/);
});

test('Bubbles PWA update permits confirmed reload when composer is empty', async () => {
  const app = await mountUpdateControls();
  app.button.events.click();
  assert.equal(app.confirmations, 1);
  assert.equal(app.preparations, 1);
  assert.equal(app.navigations.length, 1);
  assert.equal(new URL(app.navigations[0]).searchParams.get('appVersion'), '20261026-ui-settings2');
});

test('Bubbles PWA update never reloads when confirmation is declined', async () => {
  const app = await mountUpdateControls({confirm: false});
  app.button.events.click();
  assert.equal(app.confirmations, 1);
  assert.equal(app.preparations, 0);
  assert.equal(app.navigations.length, 0);
});


test('Bubbles PWA update fails closed when active chat cannot be checkpointed', async () => {
  const app = await mountUpdateControls({canPrepare: false});
  app.button.events.click();
  assert.equal(app.confirmations, 1);
  assert.equal(app.preparations, 1);
  assert.equal(app.navigations.length, 0);
  assert.match(app.updateMessage.textContent, /could not be safely saved/);
});


test('Bubbles PWA clears a previously offered update if a later release verification fails', async () => {
  const app = await mountUpdateControls({fetchResults: ['ok', 'error', 'error']});
  assert.equal(app.button.textContent, 'Update Bubbles');
  await app.runScheduledCheck();
  assert.equal(app.button.textContent, 'Check for updates');
  assert.equal(app.button.dataset.update, 'unverified');
  assert.match(app.updateMessage.textContent, /Update paused/);
  app.button.events.click();
  assert.equal(app.navigations.length, 0, 'stale release must never navigate');
  assert.equal(app.confirmations, 0, 'stale release must never prompt for reload');
});

test('Bubbles PWA release manifest and cache-busted entry points match the update script', () => {
  const release = JSON.parse(fs.readFileSync('bubbles-app-version.json', 'utf8')).version;
  assert.match(release, /^[a-zA-Z0-9_-]{5,64}$/);
  const updater = fs.readFileSync('bubbles-pwa.js', 'utf8');
  assert.ok(updater.includes("const CURRENT_RELEASE = '" + release + "';"), 'current release must match the first-party manifest');
  for (const page of ['bubbles-chrome.html', 'bubbles.html', 'bubbles/index.html', 'index.html']) {
    const html = fs.readFileSync(page, 'utf8');
    assert.ok(html.includes('/bubbles-ai.js?v=' + release), page + ' must refresh the conversation-preservation script');
    assert.ok(html.includes('/bubbles-ui-clean-20261026.css?v=' + release), page + ' must refresh the Settings UI stylesheet');
    if (page === 'bubbles-chrome.html' || page === 'bubbles.html') {
      assert.ok(html.includes('/bubbles-pwa.js?v=' + release), page + ' must refresh the PWA update guard');
    }
  }
});
