'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const css=fs.readFileSync('bubbles-responsive-site.css','utf8');

for(const page of ['bubbles.html','bubbles-chrome.html']){
  test(page+' uses compact website navigation and puts chat before secondary panels',()=>{
    const html=fs.readFileSync(page,'utf8');
    assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
    assert.match(html,/class="bubbles-nav-brand"/);
    assert.match(html,/class="bubbles-nav-chat" href="#bubblesAICard"/);
    assert.match(html,/<details class="bubbles-nav-more">/);
    assert.match(html,/href="\/bubbles-accounts\.html">Accounts<\/a>/);
    assert.match(html,/href="\/bubbles-responsive-site\.css\?v=20261026-mobile-layout1"/);
    assert.equal((html.match(/id="bubblesAICard"/g)||[]).length,1,'one chat mount point');
    assert.ok(html.indexOf('id="bubblesAICard"') < html.indexOf('id="robotBrainOwner"'), 'chat before owner diagnostics');
    assert.doesNotMatch(html,/Connect GitHub and other accounts<\/a>/);
    assert.match(html,/href="#bubblesAICard">Open Bubbles chat<\/a>/);
  });
}

test('Bubbles sign-in still has functioning hooks, with recovery links tucked into a disclosure',()=>{
  const html=fs.readFileSync('bubbles.html','utf8');
  for(const id of ['bubblesSigninGate','bubblesSigninStatus','bubblesGithubSignIn','bubblesCloudflareSignIn','bubblesRetrySignInCheck','bubblesCancelSignIn','bubblesOpenExistingChat'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/<details class="bubbles-signin-help">/);
  assert.match(html,/href="\/wallet-recovery\.html\?verify=1">Restore wallet<\/a>/);
  assert.ok(html.indexOf('bubbles-responsive-site.css') > html.indexOf('bubbles-auth.css'),'mobile styles load after provider styles');
});

test('Android widths use compact navigation with no forced full-width stack of hero actions',()=>{
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/\.bubbles-actions\{[\s\S]*?display:flex!important/);
  assert.match(css,/\.bubbles-actions a,[\s\S]*?width:auto!important/);
  assert.match(css,/\.bubbles-art\{display:none!important\}/);
  assert.match(css,/min-height:42px/);
  assert.match(css,/safe-area-inset-top/);
  assert.match(css,/overflow-x:clip/);
  assert.match(css,/\.bubbles-page\{[\s\S]*?box-sizing:border-box!important;/,'container includes padding within viewport width');
  assert.match(css,/\.bubbles-nav-menu/);
  assert.match(css,/\.bubbles-signin-help/);
});

test('native floating-overlay and embedded orb isolation take priority over website layout',()=>{
  assert.match(css,/body\.oracle-octaves-page\.bubbles-embedded\{/);
  assert.match(css,/html\.bubbles-native-overlay body\.oracle-octaves-page/);
  assert.match(css,/html\.bubbles-native-overlay body\.oracle-octaves-page \.bubbles-page\{/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
