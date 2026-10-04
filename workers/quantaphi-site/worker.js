const EDGE_VERSION = 'quantaphi-org-v9-route-suite';
const CANONICAL_ORIGIN = 'https://quantaphi.org';
const APPS = [
 { slug: '/infinity-phi/', aliases: ['/infinity/'], repo: 'C13b0' },
 { slug: '/omni-phi/', aliases: ['/omni/'], repo: 'Omni-Phi' },
 { slug: '/news-phi/', aliases: ['/news/'], repo: 'News-Phi' },
 { slug: '/web-phi/', aliases: ['/web/'], repo: 'Web-Phi' },
 { slug: '/builder-reserve/', aliases: ['/builder/'], repo: 'Builder-Reserve' },
 { slug: '/infinity-radio/', aliases: ['/radio/'], repo: 'Alien-Radio' }
];
const RAW_TYPES = {
 html: 'text/html; charset=utf-8', js: 'application/javascript; charset=utf-8',
 css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
 svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
 webp: 'image/webp', ico: 'image/x-icon', txt: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8',
 woff: 'font/woff', woff2: 'font/woff2'
};
const appByIncomingPath = path => APPS.find(app => [app.slug, ...app.aliases].some(prefix => path === prefix.slice(0, -1) || path.startsWith(prefix)));
const OMNI_SUBROUTES=['build','overview','images','video','audio','structured','cards','code','create','ecosystem','share','share-card'];
const INFINITY_SUBROUTES=['wallet','profile','history','business','research','phi'];
const routeFor = incoming => {
 let path = incoming.pathname;
 const first=path.split('/').filter(Boolean)[0]||'';
 if(OMNI_SUBROUTES.includes(first)){
  if(path==='/' + first)return {redirect:path+'/'};
  return {repo:'Omni-Phi',sourcePath:path.endsWith('/')?path+'index.html':path,publicPath:path};
 }
 if(INFINITY_SUBROUTES.includes(first)){
  if(path==='/' + first)return {redirect:path+'/'};
  return {repo:'C13b0',sourcePath:path.endsWith('/')?path+'index.html':path,publicPath:path};
 }
 if (path === '/' || path === '/index.html') return { repo: 'QuantaPhi', sourcePath: '/index.html', publicPath: '/' };
 if (path === '/learn') return { redirect: '/learn/' };
 if (path.startsWith('/learn/')) return { repo: 'QuantaPhi', sourcePath: path.endsWith('/') ? path + 'index.html' : path, publicPath: path };
 const app = appByIncomingPath(path);
 if (app) {
  const matched = [app.slug, ...app.aliases].find(prefix => path === prefix.slice(0, -1) || path.startsWith(prefix));
  if (path === matched.slice(0, -1)) return { redirect: app.slug };
  let suffix = path.slice(matched.length);
  if (!suffix || suffix.endsWith('/')) suffix += 'index.html';
  return { repo: app.repo, sourcePath: '/' + suffix, publicPath: app.slug + suffix.replace(/index\.html$/, '') };
 }
 const legacy = APPS.find(item => path === '/' + item.repo || path.startsWith('/' + item.repo + '/'));
 if (legacy) {
  const suffix = path.slice(legacy.repo.length + 1).replace(/^\//, '');
  return { redirect: legacy.slug + suffix + incoming.search };
 }
 if (!path.slice(1).includes('/')) return { repo: 'QuantaPhi', sourcePath: path, publicPath: path };
 return { repo: 'QuantaPhi', sourcePath: path, publicPath: path };
};
async function getUpstream(url, request, headers) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 10000);
 try {
  return await fetch(new Request(url, {
   method: request.method, headers, redirect: 'manual', signal: controller.signal,
   body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body
  }));
 } finally { clearTimeout(timer); }
}
function rewriteSuiteText(text) {
 text=text.split('https://www-infinity4.github.io/Infinity-Phi/').join(CANONICAL_ORIGIN + '/infinity-phi/');
 text=text.split('https://www-infinity4.github.io/Infinity-Phi').join(CANONICAL_ORIGIN + '/infinity-phi');
 for (const app of APPS) {
  const github = 'https://www-infinity4.github.io/' + app.repo;
  text = text.split(github + '/').join(CANONICAL_ORIGIN + app.slug);
  text = text.split(github).join(CANONICAL_ORIGIN + app.slug.slice(0, -1));
  text = text.split('/' + app.repo + '/').join(app.slug);
 }
 text = text.split('https://www-infinity4.github.io/QuantaPhi/').join(CANONICAL_ORIGIN + '/');
 return text;
}
const LEGACY_HANDOFF_HTML="<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex\"><title>Moving QuantaPhi wallet</title></head><body><p>Recovering your existing wallet…</p><script>\n'use strict';\nconst target=(()=>{try{const u=new URL(new URLSearchParams(location.search).get('return')||'');return ['https://quantaphi.org','https://www.quantaphi.org'].includes(u.origin)?u:null}catch{return null}})();\nconst prefix='starquest_ledger_device_v1:',values={};\ntry{\n const sessionRaw=localStorage.getItem('starquest_session');if(sessionRaw)values.starquest_session=sessionRaw;\n let session=null;try{session=JSON.parse(sessionRaw||'null')}catch{}\n const username=String(session?.username||session?.key||'').toLowerCase(),keys=[];\n for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)||'',value=localStorage.getItem(key)||'';if(key.startsWith(prefix)&&(/^sq_[A-Za-z0-9_-]{32,}$/.test(value)||/\"deviceToken\"\\s*:\\s*\"sq_[A-Za-z0-9_-]{32,}\"/.test(value)))keys.push(key)}\n const chosen=username?keys.filter(key=>key===prefix+username):keys.length===1?keys:[];\n for(const key of chosen)values[key]=localStorage.getItem(key);\n}catch{}\nif(!target){document.body.textContent='Wallet return address rejected.'}\nelse if(Object.keys(values).some(key=>key.startsWith(prefix))){\n const bytes=new TextEncoder().encode(JSON.stringify({version:1,issuedAt:Date.now(),source:location.origin,values}));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);\n target.hash='quantaWalletLink='+btoa(binary).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');\n location.replace(target.href);\n}else{\n const fallback=new URL('https://www-infinity4.github.io/QuantaPhi/wallet-link.html');fallback.searchParams.set('mode','top');fallback.searchParams.set('v','20261004-wallet3');fallback.searchParams.set('return',target.href);location.replace(fallback.href);\n}\n</script></body></html>";
export default {
 async fetch(request) {
  const incoming = new URL(request.url);
  if (/^(?:www\.)?quantaphi\.net$/.test(incoming.hostname) && incoming.pathname === '/__wallet-handoff') return new Response(LEGACY_HANDOFF_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'x-quantaphi-edge': EDGE_VERSION } });
  if (/^(?:www\.)?quantaphi\.(?:net|org)$/.test(incoming.hostname) && incoming.hostname !== 'quantaphi.org') {
   incoming.hostname = 'quantaphi.org'; incoming.protocol = 'https:';
   return Response.redirect(incoming.toString(), 308);
  }
  if (incoming.pathname === '/health') return Response.json({
   ok: true, service: 'quantaphi-site', canonicalOrigin: CANONICAL_ORIGIN,
   version: EDGE_VERSION,
   routes: Object.fromEntries([['quantaPhi','/'], ...APPS.map(app => [app.repo, app.slug])])
  }, { headers: { 'Cache-Control': 'no-store', 'x-quantaphi-edge': EDGE_VERSION } });
  const route = routeFor(incoming);
  if (route.redirect) return Response.redirect(new URL(route.redirect, incoming.origin).toString(), 308);
  const repoPath = '/' + route.repo + route.sourcePath;
  const origin = new URL('https://www-infinity4.github.io' + repoPath);
  origin.search = incoming.search;
  const extension = route.sourcePath.split('.').pop().toLowerCase();
  const textual = ['html','js','css','json','xml','txt'].includes(extension);
  if (textual) origin.searchParams.set('__qpedge', EDGE_VERSION);
  const headers = new Headers(request.headers);
  for (const name of ['Host', 'Cookie', 'Authorization']) headers.delete(name);
  if (textual) headers.set('Cache-Control', 'no-cache');
  let upstream;
  try { upstream = await getUpstream(origin, request, headers); } catch {}
  let raw = false;
  if ((!upstream || (upstream.status >= 300 && upstream.status < 400) || upstream.status >= 500) && ['GET', 'HEAD'].includes(request.method)) {
   if (upstream?.body) await upstream.body.cancel();
   const source = new URL('https://raw.githubusercontent.com/www-infinity4/' + route.repo + '/main' + route.sourcePath);
   source.searchParams.set('__qpedge', EDGE_VERSION);
   try { upstream = await getUpstream(source, request, headers); raw = true; } catch { upstream = null; }
  }
  if (!upstream) return new Response('The Phi gateway could not reach this page source. Please retry shortly.', {
   status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '10', 'x-quantaphi-edge': EDGE_VERSION }
  });
  const out = new Headers(upstream.headers);
  out.set('x-quantaphi-edge', EDGE_VERSION);
  out.set('x-quantaphi-app', route.repo);
  if (raw && upstream.ok && RAW_TYPES[extension]) out.set('Content-Type', RAW_TYPES[extension]);
  if (raw) { out.delete('Content-Security-Policy'); out.delete('Content-Disposition'); }
  if (textual || !upstream.ok) out.set('Cache-Control', 'no-cache, max-age=0, must-revalidate');
  const contentType = out.get('Content-Type') || '';
  if (request.method === 'GET' && upstream.ok && /text\/html|javascript|text\/css|application\/json/.test(contentType)) {
   const rewritten = rewriteSuiteText(await upstream.text());
   out.delete('Content-Length'); out.delete('Content-Encoding'); out.delete('ETag');
   return new Response(rewritten, { status: upstream.status, headers: out });
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
 }
};