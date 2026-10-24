const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class E{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.events={};this.value='';this.textContent='';this.hidden=false}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children}
 setAttribute(){}
 addEventListener(event,fn){this.events[event]=fn}
 focus(){}
 click(){return this.events.click?.()}
}
const walk=e=>[e,...e.children.flatMap(walk)];
function setup(config,options={}){
 const host=new E('section'),store=new Map(),events={},calls=[],published=new Map(),project=[];
 const packageApi={
  active:()=>project[0]||null,
  newToken:()=>{const p={assets:[]};project.push(p);return p},
  capture:(x)=>{const p=project[0];if(!p)return{ok:false};if(p.assets.some(y=>y.sourceUrl===x.sourceUrl))return{ok:true,duplicate:true};p.assets.push(x);return{ok:true}}
 };
 const ctx={
  URL,URLSearchParams,Blob,crypto:require('node:crypto').webcrypto,setTimeout,
  location:{href:'https://quantaphi.org/'},
  document:{getElementById:()=>host,createElement:t=>new E(t)},
  localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
  navigator:{clipboard:{writeText:async()=>{}}},
  window:{ShopAdPhiConfig:config,PhiProjectPackage:packageApi,addEventListener:(k,fn)=>events[k]=fn,ControlPhi:{requestSponsoredCard:async()=>null}},
  fetch:async(path,opts)=>{
   calls.push({path,opts});
   if(path.endsWith('/shop/config'))return Response.json({ok:true});
   if(path.endsWith('/shop/items')&&opts.method==='POST'){
    const item=JSON.parse(opts.body);published.set(item.itemId,{item_id:item.itemId,state:'draft',...item});
    return Response.json({ok:true,itemId:item.itemId,status:'draft'},{status:201});
   }
   if(path.includes('/shop/items/')&&path.endsWith('/publish')){
    if(options.publishError)return Response.json({error:'owner_session_expired'},{status:401});
    const itemId=path.split('/').at(-2),item=published.get(itemId);if(item)item.state='published';
    return Response.json({ok:true,published:true,itemId});
   }
   if(path.endsWith('/shop/items')&&opts.method==='GET')return Response.json({items:[...published.values()]});
   if(path.includes('/public/sites/')){
    if(options.publicEnabled===false)return Response.json({error:'shop_phi_not_published'},{status:404});
    return Response.json({items:[...published.values()].filter(x=>x.state==='published')});
   }
   return Response.json({ok:true});
  }
 };
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../shop-ad-phi.js'),'utf8'),ctx);
 return{host,store,events,calls,project,
  button:t=>walk(host).find(x=>x.tag==='button'&&x.textContent===t),
  fields:Object.fromEntries(walk(host).filter(x=>x.name).map(x=>[x.name,x])),
  form:walk(host).find(x=>x.tag==='form'),
  text:()=>walk(host).map(x=>x.textContent).join(' ')
 };
}
const fill=s=>Object.entries({title:'My antique radio',url:'https://www.ebay.com/itm/123',merchant:'My store',description:'Working radio',imageUrl:'https://example.org/radio.jpg'}).forEach(([k,v])=>s.fields[k].value=v);

test('Create post remains readable and explicitly saves locally when owner publish is not connected',async()=>{
 const s=setup();fill(s);
 assert.ok(s.button('Create post'));
 await s.form.events.submit({preventDefault(){}});
 assert.match(s.text(),/PRIVATE POST DRAFT/);
 assert.match(s.text(),/not connected to an authenticated Shop Phi owner session/i);
 assert.equal(s.calls.length,0);
 s.button('Collect').click();s.button('Collect').click();
 assert.equal(JSON.parse(s.store.get('quantaPhiCollected')).length,1);
 assert.equal(s.button('Retry public posting'),undefined);
 await s.button('Ad Phi offer').click();
 s.events['quantaphi:search-start']({detail:{query:'Mercury dime'}});
 assert.match(s.text(),/Shop Mercury dime/);
 assert.ok(walk(s.host).some(x=>x.href?.includes('_nkw=Mercury+dime')));
});
test('unsafe source URL is not saved or posted',async()=>{
 const s=setup();fill(s);s.fields.url.value='javascript:alert(1)';
 await s.form.events.submit({preventDefault(){}});
 assert.equal(s.store.size,0);assert.match(s.text(),/Use an https/);
});
test('Create post uses owner session, verifies catalog and confirms public readback',async()=>{
 const s=setup({apiBase:'/widgetphi',siteId:'my-site',instanceId:'shop-1'});fill(s);
 await s.form.events.submit({preventDefault(){}});
 assert.equal(s.calls.length,5);
 assert.deepEqual(s.calls.map(x=>x.opts.method),['POST','POST','POST','GET','GET']);
 assert.ok(s.calls.every(x=>x.path.startsWith('/widgetphi/')));
 assert.ok(s.calls.every(x=>x.opts.credentials==='same-origin'));
 assert.match(s.text(),/PUBLIC SHOP PHI POST · VERIFIED/);
 assert.match(s.text(),/Post published and confirmed in the public Shop Phi card/);
 assert.equal(JSON.parse(s.store.get('quantaphi:shop-ad-phi:drafts:v1'))[0].publishState,'public');
});
test('catalog publication is not falsely called public when parent site is hidden',async()=>{
 const s=setup({apiBase:'/widgetphi',siteId:'my-site',instanceId:'shop-1'},{publicEnabled:false});fill(s);
 await s.form.events.submit({preventDefault(){}});
 assert.match(s.text(),/OWNER CATALOG · PUBLIC VISIBILITY NOT CONFIRMED/);
 assert.match(s.text(),/NOT yet confirmed visible publicly/);
});
test('failed owner post preserves local draft and reports server error',async()=>{
 const s=setup({apiBase:'/widgetphi',siteId:'my-site',instanceId:'shop-1'},{publishError:true});fill(s);
 await s.form.events.submit({preventDefault(){}});
 assert.match(s.text(),/Post not verified as published: owner_session_expired/);
 assert.equal(JSON.parse(s.store.get('quantaphi:shop-ad-phi:drafts:v1')).length,1);
 assert.ok(s.button('Retry public posting'));
});
test('product-specific +1 Build stores the exact source in a project instead of a fake link',async()=>{
 const s=setup();fill(s);await s.form.events.submit({preventDefault(){}});
 s.button('+1 Build').click();
 assert.equal(s.project[0].assets.length,1);
 assert.equal(s.project[0].assets[0].sourceUrl,'https://www.ebay.com/itm/123');
 s.button('+1 Build').click();
 assert.equal(s.project[0].assets.length,1);
 assert.match(s.text(),/Already in your Code Phi project/);
});
test('product card retains real source image and primary controls',async()=>{
 const s=setup();fill(s);await s.form.events.submit({preventDefault(){}});
 assert.ok(walk(s.host).some(x=>x.tag==='img'&&x.src==='https://example.org/radio.jpg'));
 for(const label of ['☆ Star','Collect','Share','+1 Build','Search similar'])assert.ok(s.button(label),label);
 const css=fs.readFileSync(require('node:path').join(__dirname,'../shop-ad-phi.css'),'utf8');
 assert.match(css,/#shopAdPhi \.sap-shell \.sap-form>button\[type=submit\]/);
 assert.match(css,/color:#fff!important/);
});
