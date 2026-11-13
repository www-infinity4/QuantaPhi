import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const root='#zeusSessionHistory';
const first=(page,selector)=>page.locator(root+' '+selector);

// Diagnostic-only regression probe: capture actual DOM replacement and native
// input events without touching account state or relying on synthetic fixtures.
async function installHistoryInputTrace(page){
 await page.addInitScript(()=>{
  const trace=[];window.__zeusHistoryInputTrace=trace;
  const relevant=el=>el?.closest?.('#zeusSessionHistory')&&(el.matches?.('input,textarea,select')||el.closest?.('.zeus-history-new,.zeus-history-form'));
  const record=(type,el,details='')=>{
   if(trace.length>=120)return;
   trace.push({type,value:el?.value??null,connected:el?.isConnected??null,
    field:el?.getAttribute?.('aria-label')||el?.tagName,details,
    at:Math.round(performance.now())});
  };
  for(const type of ['input','change','focusin','focusout','click'])
   document.addEventListener(type,event=>{if(relevant(event.target))record(type,event.target)},true);
  const observer=new MutationObserver(records=>{
   for(const item of records){
    if(item.type!=='childList')continue;
    const target=item.target;
    if(!target.closest?.('#zeusSessionHistory')&&!Array.from(item.addedNodes).some(n=>n.nodeType===1&&n.id==='zeusSessionHistory'))continue;
    const changed=Array.from(item.addedNodes).concat(Array.from(item.removedNodes))
      .some(n=>n.nodeType===1&&(n.matches?.('input,textarea,form,.zeus-history-side,.zeus-history-detail')||n.querySelector?.('input,textarea,form')));
    if(changed)record('dom-replace',target,'added:'+item.addedNodes.length+' removed:'+item.removedNodes.length);
   }
  });
  observer.observe(document,{subtree:true,childList:true});
 });
}
async function historyInputSnapshot(page){
 return page.evaluate(()=>({
  location:location.href,
  formValues:[...document.querySelectorAll('#zeusSessionHistory input,#zeusSessionHistory textarea')]
    .map(e=>({label:e.getAttribute('aria-label'),value:e.value})),
  trace:window.__zeusHistoryInputTrace?.slice(-45)||[],
  rootCount:document.querySelectorAll('#zeusSessionHistory').length
 }));
}

for(const width of [320,360,393,720]){
 test('Zeus history layout is readable and stays within '+width+'px viewport',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Session history & work dots'})).toBeVisible();
  await expect(page.locator(root+' .zeus-legend-pair')).toHaveCount(5);
  const layout=await page.evaluate(()=>({
   width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   withoutTracker:(()=>{const a=document.querySelector('#zeusSessionHistory');if(!a)return null;const value=a.style.display;a.style.display='none';const w=document.documentElement.scrollWidth;a.style.display=value;return w})(),
   scrollChildren:[...document.querySelectorAll('body *')].filter(e=>e.scrollWidth>e.clientWidth+2&&e.clientWidth>0).map(e=>({name:e.id||e.className?.toString().slice(0,70)||e.tagName,scroll:e.scrollWidth,client:e.clientWidth,css:getComputedStyle(e).overflowX,text:e.textContent?.slice(0,45)})).slice(0,12),
   overflow:[...document.querySelectorAll('body *')].map(e=>({
    name:e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.split(/\\s+/).join('.'):''),
    right:Math.ceil(e.getBoundingClientRect().right),
    left:Math.floor(e.getBoundingClientRect().left)
   })).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,15)
  }));
  expect(layout.scrollWidth,JSON.stringify(layout)).toBeLessThanOrEqual(layout.width+1);
 });
}
test('red work, green completion, browsable old session and orange continuation keep receipts',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await first(page,'input[aria-label="New project or topic title"]').fill('Radio repairs');
 await page.getByRole('button',{name:'Create project thread'}).click();
 await expect(first(page,'.zeus-current-head')).toContainText('Radio repairs');
 await expect(first(page,'.zeus-status')).toContainText('Unfinished');
 await first(page,'textarea[aria-label="Write a task or paste the exact extract"]').fill('Check the microphone repair workflow');
 await page.getByRole('button',{name:'Add work to this session'}).click();
 await first(page,'input[aria-label^="Result, URL"]').fill('Issue #17 repaired with passing local tests');
 await page.getByRole('button',{name:'Record outcome'}).click();
 await page.getByRole('button',{name:'Finish session · green'}).click();
 await expect(first(page,'.zeus-status')).toContainText('Completed with recorded evidence');
 await page.getByRole('button',{name:'Start next session'}).click();
 await expect(first(page,'.zeus-status')).toContainText('Unfinished');
 await expect(first(page,'.zeus-session-entry')).toHaveCount(2);
 await first(page,'.zeus-session-entry').first().click();
 await expect(first(page,'.zeus-history-detail')).toContainText('Check the microphone repair workflow');
 await expect(page.getByRole('button',{name:'Return to active session'})).toBeVisible();
 await page.getByRole('button',{name:'Return to active session'}).click();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Thread full · orange handoff'}).click();
 await expect(first(page,'.zeus-status')).toContainText('Unfinished');
 await expect(first(page,'.zeus-history-threads')).toContainText('Radio repairs · continuation');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(first(page,'.zeus-history-threads')).toContainText('Radio repairs · continuation');
 await first(page,'.zeus-history-threads .zeus-thread').last().click();
 await expect(first(page,'.zeus-status')).toContainText('Thread full / continuation');
});
test('yellow extraction exactly routes to blue pending import without inventing a completed import',async({page})=>{
 await installHistoryInputTrace(page);
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await first(page,'input[aria-label="New project or topic title"]').fill('Source extraction');
 console.log('Zeus extraction DOM/input lifecycle:',JSON.stringify(await historyInputSnapshot(page)));
 console.log('Zeus extraction before create:',JSON.stringify(await page.locator('#zeusSessionHistory').evaluate(root=>({
  value:root.querySelector('input[aria-label="New project or topic title"]')?.value,
  draft:sessionStorage.getItem('infinity:zeus-project-title-draft:v1')
 }))));
 await page.getByRole('button',{name:'Create project thread'}).click();
 const createdState=await page.evaluate(()=>({
  url:location.href,
  root:!!document.querySelector('#zeusSessionHistory'),
  title:document.querySelector('#zeusSessionHistory .zeus-current-head')?.textContent,
  notice:document.querySelector('#zeusSessionHistory .zeus-history-notice')?.textContent,
  threadCount:document.querySelectorAll('#zeusSessionHistory .zeus-thread').length,
  inputValue:document.querySelector('#zeusSessionHistory input[aria-label="New project or topic title"]')?.value
 }));
 console.log('Zeus synthetic extraction thread-create diagnostics:',JSON.stringify(createdState));
 // Assert the observed active session before touching its classification form;
 // a delayed/failed thread creation must not look like a random select timeout.
 await expect(first(page,'.zeus-current-head')).toContainText('Source extraction');
 await expect(first(page,'select[aria-label="Work classification"]')).toBeVisible();
 await first(page,'select[aria-label="Work classification"]').selectOption('extraction');
 const raw='  Verbatim original wording.\nLine two has extra spacing.  ';
 await first(page,'textarea[aria-label="Write a task or paste the exact extract"]').fill(raw);
 await first(page,'input[aria-label="Source reference (required for yellow extraction)"]').fill('Original owner note #22');
 console.log('Zeus extraction detail lifecycle:',JSON.stringify(await historyInputSnapshot(page)));
 const formBefore=await page.locator('#zeusSessionHistory .zeus-history-form').evaluate(form=>({
  valid:form.checkValidity(),
  selected:form.querySelector('select')?.value,
  text:form.querySelector('textarea')?.value,
  source:form.querySelector('input')?.value,
  submitType:form.querySelector('button')?.type,
  submitDisabled:form.querySelector('button')?.disabled
 }));
 console.log('Zeus extraction before add:',JSON.stringify(formBefore));
 await page.getByRole('button',{name:'Add work to this session'}).click();
 const observed=await page.locator('#zeusSessionHistory').evaluate(root=>({
  notice:root.querySelector('.zeus-history-notice')?.textContent,
  form:root.querySelector('select[aria-label="Work classification"]')?.value,
  items:root.querySelectorAll('.zeus-work-item').length,
  state:root.querySelector('.zeus-status')?.textContent
 }));
 console.log('Zeus extraction state after user submit:',JSON.stringify(observed));
 await expect(first(page,'.zeus-status'),JSON.stringify(observed)).toContainText('Extraction point');
 await page.getByRole('button',{name:'Open focused thread'}).click();
 await expect(first(page,'.zeus-status')).toContainText('Import or AI answer needed');
 await expect(first(page,'.zeus-work-text')).toHaveText(raw);
 await expect(first(page,'.zeus-source')).toContainText('Local extraction');
 await page.getByRole('button',{name:'Show handoff for copying'}).click();
 await expect(first(page,'#zeusHandoffText')).toHaveValue(/Verbatim original wording/);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(first(page,'.zeus-status')).toContainText('Import or AI answer needed');
});

test('unsent local project title survives a tracker redraw and creates exactly one new thread',async({page})=>{
 await installHistoryInputTrace(page);
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 const selector='input[aria-label="New project or topic title"]';
 await first(page,selector).fill('Initial science project');
 console.log('Zeus first project DOM/input lifecycle:',JSON.stringify(await historyInputSnapshot(page)));
 console.log('Zeus initial title before create:',JSON.stringify(await page.locator('#zeusSessionHistory').evaluate(root=>({
  value:root.querySelector('input[aria-label="New project or topic title"]')?.value,
  draft:sessionStorage.getItem('infinity:zeus-project-title-draft:v1')
 }))));
 await page.getByRole('button',{name:'Create project thread'}).click();
 console.log('Zeus initial title after create:',JSON.stringify(await page.locator('#zeusSessionHistory').evaluate(root=>({
  value:root.querySelector('input[aria-label="New project or topic title"]')?.value,
  notice:root.querySelector('.zeus-history-notice')?.textContent,
  count:root.querySelectorAll('.zeus-thread').length,
  draft:sessionStorage.getItem('infinity:zeus-project-title-draft:v1')
 }))));
 await expect(first(page,'.zeus-current-head')).toContainText('Initial science project');
 await first(page,selector).fill('Source extraction with exact whitespace');
 console.log('Zeus second-title DOM/input lifecycle:',JSON.stringify(await historyInputSnapshot(page)));
 console.log('Zeus unsent draft before reload:',JSON.stringify(await page.evaluate(()=>({
  title:document.querySelector('#zeusSessionHistory input[aria-label="New project or topic title"]')?.value,
  stored:sessionStorage.getItem('infinity:zeus-project-title-draft:v1'),
  url:location.href
 }))));
 // A page refresh and a local-history redraw must both preserve this unsent title.
 await page.reload({waitUntil:'domcontentloaded'});
 console.log('Zeus unsent draft after reload:',JSON.stringify(await page.evaluate(()=>({
  title:document.querySelector('#zeusSessionHistory input[aria-label="New project or topic title"]')?.value,
  stored:sessionStorage.getItem('infinity:zeus-project-title-draft:v1'),
  url:location.href
 }))));
 await expect(first(page,selector)).toHaveValue('Source extraction with exact whitespace');
 await first(page,'.zeus-history-threads .zeus-thread').last().click(); // forces renderSide()
 await expect(first(page,selector)).toHaveValue('Source extraction with exact whitespace');
 await page.getByRole('button',{name:'Create project thread'}).click();
 await expect(first(page,'.zeus-current-head')).toContainText('Source extraction with exact whitespace');
 await expect(first(page,'.zeus-history-threads .zeus-thread')).toHaveCount(2);
 await expect(first(page,selector)).toHaveValue('');
});

test('a ready embedded Bubbles open never steals focus from Zeus project-history typing',async({page})=>{
 await page.setViewportSize({width:1280,height:850});
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 // The public iframe is first-party and uses its actual ready/open handshake.
 await expect(page.locator('#zeusAssistantStatus')).toContainText('initialized',{timeout:15000});
 const historyTitle=first(page,'input[aria-label="New project or topic title"]');
 await historyTitle.focus();
 await expect(historyTitle).toBeFocused();
 const width=await page.locator('#zeusAssistantFrame').evaluate(frame=>frame.contentWindow.innerWidth);
 expect(width).toBeGreaterThan(600); // the prior child auto-focus branch
 await page.evaluate(()=>document.getElementById('zeusAssistantFrame').contentWindow.postMessage({
  type:'quantaphi:bubbles:open',id:'coliseum-zeus-assistant'
 },window.location.origin));
 // Allow the real child to handle the new open message, not just the postMessage enqueue.
 await expect(page.locator('#zeusAssistantStatus')).toContainText('initialized');
 await page.waitForTimeout(150);
 await expect(historyTitle).toBeFocused();
 await historyTitle.fill('History draft must stay with Zeus');
 await expect(historyTitle).toHaveValue('History draft must stay with Zeus');
});
