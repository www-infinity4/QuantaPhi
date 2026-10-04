const EDGE_VERSION = 'quantaphi-org-v6-learn';
const RAW_TYPES = {
 html: 'text/html; charset=utf-8', js: 'application/javascript; charset=utf-8',
 css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
 svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
 webp: 'image/webp', ico: 'image/x-icon', txt: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8'
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
export default {
 async fetch(request) {
  const incoming = new URL(request.url);
  if (/^(?:www\.)?quantaphi\.(?:net|org)$/.test(incoming.hostname) && incoming.hostname !== 'quantaphi.org') {
   incoming.hostname = 'quantaphi.org';
   incoming.protocol = 'https:';
   return Response.redirect(incoming.toString(), 308);
  }
  if (incoming.pathname === '/health') return Response.json({
   ok: true, service: 'quantaphi-site', canonicalOrigin: 'https://quantaphi.org',
   appPath: '/QuantaPhi/index.html', version: EDGE_VERSION
  }, { headers: { 'Cache-Control': 'no-store', 'x-quantaphi-edge': EDGE_VERSION } });
  let path = incoming.pathname;
  if (path === '/' || path === '/index.html') path = '/QuantaPhi/index.html';
  else if (path === '/learn') return Response.redirect(incoming.origin + '/learn/' + incoming.search, 308);
  else if (path.startsWith('/learn/')) { if(path.endsWith('/')) path += 'index.html'; path = '/QuantaPhi' + path; }
  else if (!path.slice(1).includes('/')) path = '/QuantaPhi' + path;
  const origin = new URL('https://www-infinity4.github.io' + path);
  origin.search = incoming.search;
  const fresh = /\.(?:html|js|css|json|xml|txt)$/i.test(path);
  if (fresh) origin.searchParams.set('__qpedge', EDGE_VERSION);
  const headers = new Headers(request.headers);
  for (const name of ['Host', 'Cookie', 'Authorization']) headers.delete(name);
  if (fresh) headers.set('Cache-Control', 'no-cache');
  let upstream;
  try { upstream = await getUpstream(origin, request, headers); } catch {}
  // GitHub's custom-domain redirect must never send this subrequest back into this Worker.
  // Fetch the same public repository file directly while GitHub's Pages change propagates.
  let raw = false;
  if ((!upstream || (upstream.status >= 300 && upstream.status < 400) || upstream.status >= 500)
      && path.startsWith('/QuantaPhi/') && ['GET', 'HEAD'].includes(request.method)) {
   if (upstream?.body) await upstream.body.cancel();
   const source = new URL('https://raw.githubusercontent.com/www-infinity4/QuantaPhi/main/' + path.slice('/QuantaPhi/'.length));
   source.searchParams.set('__qpedge', EDGE_VERSION);
   try { upstream = await getUpstream(source, request, headers); raw = true; } catch { upstream = null; }
  }
  if (!upstream) return new Response('QuantaPhi could not reach its page source. Please retry shortly.', {
   status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '10', 'x-quantaphi-edge': EDGE_VERSION }
  });
  const out = new Headers(upstream.headers);
  out.set('x-quantaphi-edge', EDGE_VERSION);
  if (raw) {
   const extension = path.split('.').pop().toLowerCase();
   if (upstream.ok && RAW_TYPES[extension]) out.set('Content-Type', RAW_TYPES[extension]);
   out.delete('Content-Security-Policy');
   out.delete('Content-Disposition');
  }
  if (fresh || !upstream.ok) out.set('Cache-Control', 'no-cache, max-age=0, must-revalidate');
  return new Response(upstream.body, { status: upstream.status, headers: out });
 }
};

