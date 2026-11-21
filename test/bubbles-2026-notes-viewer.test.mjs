import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('one existing wallet-only Email setup link, not a second signup surface',()=>{
 const js=src('bubbles-ai.js');
 assert.equal((js.match(/const ownerSecurityLink=create/g)||[]).length,1);
 assert.match(js,/const ownerSecurityLink=create\('a','ba-control ba-owner-security','Email setup'\)/);
 assert.match(js,/if\(embedded\|\|ownerSecurityChecking\)return/);
 assert.match(js,/gate\.walletIdentity\(\)/);
 assert.match(js,/ownerSecurityLink\.hidden=result\?\.state!=='verified'\|\|!tools\.open/);
 assert.doesNotMatch(src('bubbles.html'),/href="\/quant-mail\.html"|administrator@quantaphi\.org|kris@quantaphi\.org/);
});
test('all previously functional Notes controls keep their event handlers and move into one viewer',()=>{
 const js=src('bubbles-ai.js');
 const start=js.indexOf('const toolsViewer=create');
 const move=js.indexOf('for(const child of [...tools.children])',start);
 const append=js.indexOf('viewerContent.append(child)',move);
 assert.ok(start>0&&move>start&&append>move);
 assert.match(js,/if\(child===summary\|\|child===ownerSecurityLink\)continue/);
 assert.match(js,/viewerHeader\.append\(viewerTitle,viewerClose\)/);
 assert.match(js,/toolsViewer\.setAttribute\('role','dialog'\)/);
 assert.match(js,/toolsViewerButton\.setAttribute\('aria-haspopup','dialog'\)/);
 assert.match(js,/viewerClose\.addEventListener\('click',closeNotesViewer\)/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/if\(event\.key!=='Tab'\)return/);
 assert.match(js,/toolsViewer\.hidden=true/);
 assert.match(js,/\['Quant Search','\/'\]/);
 assert.match(js,/\['Infinity','\/infinity-phi\/'\]/);
 assert.match(js,/\['Omni','\/omni-phi\/'\]/);
});
test('2026 viewer has green checked state, clear X, browser-focus support and phone sizing',()=>{
 const js=src('bubbles-ai.js'),css=src('bubbles-ai.css');
 assert.match(js,/const clear=create\('button','ba-setting-clear','×'\)/);
 assert.match(js,/check\.checked=false/);
 assert.match(js,/check\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
 assert.match(css,/input\[type=checkbox\]:checked\{background:#13844e/);
 assert.match(css,/content:"✓"/);
 assert.match(css,/\.ba-tools-viewer\{/);
 assert.match(css,/position:fixed;inset:0/);
 assert.match(css,/overscroll-behavior:contain/);
 assert.match(css,/\.ba-tools-viewer-close/);
 for(const page of ['bubbles.html','bubbles/index.html','bubbles-chrome.html','index.html']){
  assert.match(src(page),/bubbles-ai\.css\?v=20261101-activity-contrast2/);
 }
});
test('private email setup never pre-populates aliases and remains server gated',()=>{
 const js=src('robot-brain-passkeys.mjs');
 const html=src('robot-brain-account-security.html');
 assert.match(js,/field\.type='email'/);
 assert.match(js,/field\.placeholder='Type your email address'/);
 assert.match(js,/One passkey is allowed per address|Exactly one passkey is allowed per address/);
 assert.doesNotMatch(html,/kris@quantaphi\.org|administrator@quantaphi\.org/i);
 assert.doesNotMatch(js,/const option=element\('option'/);
 assert.match(js,/const verified=await gate\.walletIdentity\(\)/);
 assert.match(js,/if\(verified\?\.state!=='verified'\)/);
 assert.match(js,/state\.enabled!==true/);
 assert.match(js,/state\.registrationReady!==true/);
 assert.match(js,/register\.disabled=true/);
});
