const {test}=require('node:test');
const assert=require('node:assert/strict');

test('site health watcher detects missing internal links with isolated, approved-origin fetches',async()=>{
 const {run}=await import('../scripts/site-health-watch.mjs');
 const origin='https://quantaphi.org';
 const called=[];
 const fetchImpl=async(url,options)=>{
  called.push({url,options});
  if(url===origin+'/')return new Response('<a href="/page1.html">One</a><a href="/page2.html">Two</a><a href="/missing.html">Missing</a>',{status:200,headers:{'Content-Type':'text/html'}});
  if(url===origin+'/missing.html')return new Response('Not Found',{status:404});
  return new Response('ok',{status:200,headers:{'Content-Type':'text/html'}});
 };
 const report=await run([origin+'/'],{fetchImpl,writeReport:false});
 assert.equal(report.pages.length,1);
 assert.equal(report.pages[0].status,200);
 assert.deepEqual(report.links.map(x=>x.href).sort(),
  [origin+'/page1.html',origin+'/page2.html',origin+'/missing.html'].sort());
 assert.equal(report.links.find(x=>x.href===origin+'/missing.html').status,404);
 assert.match(report.links.find(x=>x.href===origin+'/missing.html').error,/HTTP 404/);
 assert.ok(called.every(x=>x.options.redirect==='manual'&&x.options.signal));
 assert.equal(called.length,4);
});
