import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function launch(options={}){
  const code=source('bubbles-embed.js');
  const appended=[],elements=[];
  const createElement=tag=>{
    const e={tag,dataset:{},style:{setProperty(key,value){this[key]=value}},
      handlers:{},children:[],contentWindow:tag==='iframe'?{postMessage(){}}:undefined,
      setAttribute(key,value){this[key]=value},addEventListener(type,fn){this.handlers[type]=fn},
      appendChild(child){this.children.push(child)},fire(type,event={}){this.handlers[type]?.(event)}};
    elements.push(e);return e;
  };
  const document={currentScript:{dataset:{bubbleId:'gary-westerns-2026',bubbleRole:'assistant',bubbleName:'Bubbles for Gary',...options}},
    createElement,body:{append(...args){appended.push(...args)}},documentElement:{}};
  const window={innerWidth:393,innerHeight:770,addEventListener(){}};
  class CustomEvent{}
  vm.runInNewContext(code,{document,window,URLSearchParams,CustomEvent});
  const launcher=elements.find(x=>x.tag==='button');
  const iframe=elements.find(x=>x.tag==='iframe');
  return {launcher,iframe,appended};
}

test('family Bubbles opts into modern Octaves messenger without changing its identity',()=>{
  const family=source('gary/lounge.mjs');
  assert.match(family,/script\.dataset\.bubbleTheme='family-modern'/);
  assert.match(family,/script\.dataset\.bubbleId='gary-westerns-2026'/);
  assert.match(family,/script\.src='\/bubbles-embed\.js'/);
  const kit=launch({bubbleTheme:'family-modern'});
  assert.equal(kit.appended.length,1,'closed Bubbles must remain lazy to preserve fast page load');
  kit.launcher.fire('click');
  assert.match(kit.iframe.src,/\/bubbles\.html\?/);
  const url=new URL(kit.iframe.src);
  assert.equal(url.searchParams.get('theme'),'family-modern');
  assert.equal(url.searchParams.get('id'),'gary-westerns-2026');
  assert.equal(url.searchParams.get('role'),'assistant');
  assert.match(kit.iframe.title,/Bubbles for Gary/);
  assert.equal(kit.iframe.style.display,'block');
});

test('untrusted embed theme names do not trigger new layout on other websites',()=>{
  const ordinary=launch();
  ordinary.launcher.fire('click');
  assert.equal(new URL(ordinary.iframe.src).searchParams.get('theme'),null);
  const wrong=launch({bubbleTheme:'unsafe-overrides'});
  wrong.launcher.fire('click');
  assert.equal(new URL(wrong.iframe.src).searchParams.get('theme'),null);
});

test('modern theme only applies to the family embed and loads AFTER original styles',()=>{
  const html=source('bubbles.html');
  const original=html.indexOf('bubbles-octaves-chat.css');
  const modern=html.indexOf('bubbles-family-modern.css');
  assert.ok(original>0&&modern>original,'family skin must override recent base chat skin only when gated');
  assert.match(html,/params\.get\('theme'\)==='family-modern'/);
  assert.match(html,/classList\.add\('bubbles-family-modern'\)/);
  const css=source('bubbles-family-modern.css');
  assert.match(css,/html\.bubble-iframe\.bubbles-family-modern/);
  assert.match(css,/\.ba-panel/);
  assert.match(css,/\.ba-composer/);
  assert.match(css,/\.ba-header/);
  assert.match(css,/\.ba-thread/);
  assert.match(css,/\.ba-message/);
  assert.match(css,/\.ba-mic/);
  assert.match(css,/\.ba-send/);
  assert.match(css,/@media/);
  assert.match(css,/prefers-reduced-motion/);
  assert.doesNotMatch(css,/(?:display\s*:\s*none[^;]*;\s*}[^\n]*\.ba-composer)|(?:hidden\s*=\s*true)/);
});

test('family chat no longer gets the cramped old-sized iframe, but other embeds stay unchanged',()=>{
  const modern=launch({bubbleTheme:'family-modern'});
  const original=launch();
  assert.match(modern.iframe.style.cssText,/480px/);
  assert.match(modern.iframe.style.cssText,/min\(800px/);
  assert.match(original.iframe.style.cssText,/425px/);
  assert.match(original.iframe.style.cssText,/min\(690px/);
});

test('chat theme does not touch wallet, guest permissions, microphone consent, or fake backend',()=>{
  const css=source('bubbles-family-modern.css');
  const embed=source('bubbles-embed.js');
  assert.doesNotMatch(css,/localStorage|token|wallet|API_KEY|auto-play|speechRecognition/i);
  assert.match(embed,/allow-scripts allow-same-origin allow-forms allow-popups/);
  assert.match(embed,/if\(event\.origin!==ORIGIN\|\|event\.source!==iframe\.contentWindow\)/);
  assert.match(embed,/pendingOpen/);
  assert.match(source('gary/lounge.mjs'),/Guest chat is allowed/);
});
