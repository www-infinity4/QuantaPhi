const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('same-origin Crusher frame is allowed even when its source denies framing',async()=>{
 const prior=global.fetch;global.fetch=async()=>new Response('<html>Crusher</html>',{headers:{'content-type':'text/html','x-frame-options':'deny'}});
 try{const module=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('workers/quantaphi-site/worker.js','utf8')).toString('base64'));
 const r=await module.default.fetch(new Request('https://quantaphi.org/bitcoin-crusher/?embed=quanta'),{});
 assert.equal(r.status,200);assert.equal(r.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(await r.text(),/Crusher/);
 }finally{global.fetch=prior}
});
