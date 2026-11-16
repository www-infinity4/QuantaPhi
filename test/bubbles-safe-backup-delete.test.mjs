import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Run the real deletion handler with a fake transcript store. Never touch
// an authenticated wallet, account or live Cloudflare database.
const code = fs.readFileSync(new URL('../bubbles-ai.js', import.meta.url), 'utf8');
const begin = code.indexOf("cloudDelete.addEventListener('click',async()=>{");
const end = code.indexOf('\n});', begin);
assert.ok(begin > 0 && end > begin, 'backup deletion handler must exist');
const handlerSource = code.slice(begin, end + 4);

async function attemptDeletion({phrase = '', cloudEnabled = true, clearFails = false} = {}) {
  const calls = [];
  const saves = [];
  const cloudDelete = {
    hidden: false, disabled: phrase !== 'ERASE BACKUP',
    addEventListener(_event, callback) { this.click = callback; }
  };
  const cloudToggle = {checked: true};
  const deletePhrase = {value: phrase};
  const advancedDeletion = {open: true};
  const memoryHint = {textContent: ''};
  const context = {
    cloudDelete, cloudToggle, deletePhrase, advancedDeletion, memoryHint,
    cloudChat: cloudEnabled, CLOUD_MEMORY_KEY: 'optional-memory',
    confirm: () => { throw Error('A simple OK dialog is not sufficient to erase a backup'); },
    save(key, value) { saves.push([key, value]); },
    longMemory: {
      async clear(options) {
        calls.push(options);
        if (clearFails) throw Error('simulated-transcript-failure');
      }
    }
  };
  vm.runInNewContext(handlerSource, context);
  await cloudDelete.click();
  return {calls, saves, cloudDelete, cloudToggle, deletePhrase, advancedDeletion, memoryHint, cloudChat: context.cloudChat};
}

test('refuses deletion when the exact ERASE BACKUP phrase has not been entered', async () => {
  for (const phrase of ['', 'erase backup', 'ERASE BACKUP ', 'ERASE']) {
    const result = await attemptDeletion({phrase});
    assert.equal(result.calls.length, 0, phrase || 'empty phrase');
    assert.equal(result.cloudChat, true);
    assert.equal(result.cloudToggle.checked, true);
  }
});

test('exact confirmation erases only the optional transcript and resets the control', async () => {
  const result = await attemptDeletion({phrase: 'ERASE BACKUP'});
  assert.equal(result.calls.length, 1);
  assert.equal(JSON.stringify(result.calls[0]), JSON.stringify({cloudToo: true}));
  assert.equal(result.cloudChat, false);
  assert.equal(result.cloudToggle.checked, false);
  assert.equal(result.cloudDelete.hidden, true);
  assert.equal(result.cloudDelete.disabled, true);
  assert.equal(result.deletePhrase.value, '');
  assert.equal(result.advancedDeletion.open, false);
  assert.equal(JSON.stringify(result.saves), JSON.stringify([['optional-memory', false]]));
});

test('disconnected transcript backup cannot be erased by the button', async () => {
  const result = await attemptDeletion({phrase: 'ERASE BACKUP', cloudEnabled: false});
  assert.equal(result.calls.length, 0);
  assert.equal(result.saves.length, 0);
});

test('failed transcript deletion never reports a successful erase or disables the backup', async () => {
  const result = await attemptDeletion({phrase: 'ERASE BACKUP', clearFails: true});
  assert.equal(result.calls.length, 1);
  assert.equal(result.cloudChat, true);
  assert.equal(result.cloudToggle.checked, true);
  assert.equal(result.saves.length, 0);
  assert.match(result.memoryHint.textContent, /Could not erase wallet archive/);
});

test('backup deletion is located in a collapsed Advanced settings section', () => {
  assert.match(code, /advancedDeletion=create\('details','ba-danger-zone'\)/);
  assert.match(code, /advancedDeletion\.append\(create\('summary','','Advanced · delete saved backup'\)/);
  assert.match(code, /privacy\.append\(privacyLabel,cloudLabel,clearChat,advancedDeletion,importLabel/);
  assert.match(code, /deletePhrase\.addEventListener\('input'/);
});
