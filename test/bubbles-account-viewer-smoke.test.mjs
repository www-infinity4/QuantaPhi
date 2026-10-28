import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ai = fs.readFileSync('bubbles-ai.js','utf8');
const home = fs.readFileSync('bubbles.html','utf8');
const chrome = fs.readFileSync('bubbles-chrome.html','utf8');
const accounts = fs.readFileSync('bubbles-accounts.html','utf8');

test('Bubbles conversation never mounts the duplicate provider-checking gate',()=>{
  assert.match(ai,/const chatGate=null;/);
  assert.doesNotMatch(ai,/const chatGate=embedded\?null:create\('section','ba-inline-account-gate'\)/);
  assert.match(ai,/if\(chatGate\)void checkPanelGate\(\)/);
  assert.match(ai,/if\(chatGate\)chatScroll.insertBefore\(chatGate,ownerMode\)/);
});

test('Accounts remains accessible without replacing the existing wallet identity',()=>{
  assert.match(ai,/accountSettings\.href='\/bubbles-accounts\.html'/);
  assert.match(ai,/tools\.append\(accountSettings\)/);
  for(const page of [home,chrome]){
    assert.match(page,/<a href="\/bubbles-accounts\.html">Accounts<\/a>/);
  }
  assert.match(home,/id="bubblesStarquestSignIn"/);
  assert.match(home,/wallet-recovery\.html\?signin=starquest/);
  assert.match(accounts,/bubbles-connections/);
});

test('sign-in controls are a website/account task, not a blocking chat prerequisite',()=>{
  assert.match(ai,/const conversation=create\('div','ba-messages'\)/);
  assert.match(ai,/const composer=create\('form','ba-composer'\)/);
  assert.match(ai,/chatScroll\.append\(.*conversation,tools\)/);
});
