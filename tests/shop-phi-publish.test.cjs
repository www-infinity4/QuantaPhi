const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function setup({publicVisible=true,photo=false}={}){
 const calls=[],saved=[];let updates=0;const id='a1234567-1234-4234-8234-123456789012';
 const item={itemId:id,title:'My own antique radio',description:'My working antique radio',
  priceLabel:'$80.00',condition:'Used',category:'Electronics',shipping:'Shipping offered',
  quantity:'1',ownItem:true,publishConsent:true,mediaIds:photo?['shopmedia-phone-1']:[]};
 const server={listingId:id,title:item.title,merchant:'Seller-example',link:'https://quantaphi.org/shopphi-item.html?id='+id,
  imageUrl:'/quant-ai/api/shopphi/media/a1234567-1234-4234-8234-123456789099',priceLabel:item.priceLabel};
 const root={QuantAIPersonal:{shopPhiRequest:async(p,body)=>{
  calls.push({path:p,body});
  if(p==='/listings')return {saved:'private-draft',published:false,listing:server};
  if(p.endsWith('/publish'))return {published:true,visibility:'unlisted',listing:server};
  if(p.endsWith('/edit'))return {edited:true,published:true,visibility:'unlisted',listing:server};
  throw Error('unsupported');
 }}};
 const fetch=async(url,opts)=>{calls.push({path:url,method:opts.method});
  return Response.json({ok:publicVisible,listing:{listingId:publicVisible?id:'else',title:item.title,priceLabel:item.priceLabel,status:publicVisible?'published':'draft'}},
   {status:publicVisible?200:404});
 };
 const ctx={window:root,fetch,location:{origin:'https://quantaphi.org'},URL,AbortSignal,Error};
 vm.runInNewContext(source('shop-phi-publish.js'),ctx);
 const studio={uploadPhotos:async ids=>{calls.push({upload:ids});return ['a1234567-1234-4234-8234-123456789099']}};
 const status={textContent:''};
 const publish=()=>root.ShopPhiPublish.publish(item,studio,status,()=>{updates++},x=>saved.push({...x}));
 return {calls,item,studio,status,publish,save:()=>saved,updates:()=>updates};
}
test('Create Post publishes wallet-owned item without external eBay link, only after actual public GET',async()=>{
 const s=setup(),done=await s.publish();
 assert.equal(done,true);
 assert.equal(s.item.publishState,'public');
 assert.match(s.item.imageUrl,/^https:\/\/quantaphi.org\/quant-ai\/api\/shopphi\/media\//);
 assert.match(s.item.publicUrl,/shopphi-item.html\?id=/);
 assert.equal(s.calls[0].path,'/listings');assert.equal(s.calls[0].body.url,'');
 assert.equal(s.calls[1].path,'/listings/'+s.item.itemId+'/publish');
 assert.equal(s.calls[1].body.ownItem,true);
 assert.equal(s.calls[2].path,'/quant-ai/api/shopphi/public/'+s.item.itemId);
 assert.match(s.status.textContent,/published at a verified shareable URL/);
 assert.equal(s.save().at(-1).publishState,'public');
});
test('a publish receipt without public readback cannot be labeled published on the phone',async()=>{
 const s=setup({publicVisible:false});
 await assert.rejects(s.publish(),/Public item readback is unavailable/);
 assert.notEqual(s.item.publishState,'public');
 assert.ok(!s.item.publicUrl);
 assert.equal(s.save().at(-1).publishState,'server-draft');
});
test('photo IDs are uploaded and saved before public listing, with original local media ID retained',async()=>{
 const s=setup({photo:true});await s.publish();
 assert.deepEqual(s.calls[0].upload,['shopmedia-phone-1']);
 assert.equal(s.calls[1].path,'/listings');
 assert.equal(s.calls[1].body.photoIds[0],'a1234567-1234-4234-8234-123456789099');
});
test('seller consent omitted creates a private cloud draft but no public request',async()=>{
 const s=setup();s.item.publishConsent=false;
 const done=await s.publish();assert.equal(done,false);
 assert.equal(s.calls.length,1);assert.equal(s.item.publishState,'server-draft');
 assert.match(s.status.textContent,/private cloud catalog/);
});
test('public page and entrypoint both load publisher from verified wallet and no fake payment',()=>{
 const index=source('index.html'),seller=source('shopphi-sell.html'),page=source('shopphi-item.html'),
  js=source('shopphi-item.js'),core=source('shop-ad-phi.js'),client=source('quant-ai-personal.js');
 for(const x of [index,seller])assert.ok(x.indexOf('shop-phi-publish.js')<x.indexOf('shop-ad-phi.js')&&x.includes('shop-phi-publish.js'));
 assert.ok(seller.indexOf('cloud-wallet-client.js')>0&&seller.indexOf('cloud-wallet-client.js')<seller.indexOf('quant-ai-personal.js'),
  'The standalone seller editor must load the original wallet bridge before protected seller API calls');
 assert.match(seller,/id="shopphiConnectWallet"/);
 assert.match(seller,/shopphi-wallet-status.js/);
 assert.match(core,/item\.ownItem=ownership\.checked/);
 assert.match(core,/item\.publishConsent=publicConsent\.checked/);
 assert.match(client,/resolveDeviceToken/);
 assert.match(client,/shopPhiUpload/);
 assert.match(page,/noindex,follow/);
 assert.match(js,/fetch\('\/quant-ai\/api\/shopphi\/public\//);
 assert.doesNotMatch(page,/Purchase now|PayPal checkout/);
 for(const f of ['shop-phi-publish.js','shopphi-item.js','quant-ai-personal.js','shop-ad-phi.js','shop-phi-seller.js','shopphi-wallet-status.js'])
  assert.doesNotThrow(()=>new Function(source(f)));
});

test('existing public ShopPhi listing is edited in place only after explicit confirmation and public readback',async()=>{
 const s=setup();s.item.publishState='public-edit-pending';s.item.confirmPublishedEdit=true;
 const done=await s.publish();
 assert.equal(done,true);
 assert.equal(s.item.publishState,'public');
 assert.equal(s.calls[0].path,'/listings/'+s.item.itemId+'/edit');
 assert.equal(s.calls[0].body.confirmPublishedEdit,true);
 assert.equal(s.calls[1].path,'/quant-ai/api/shopphi/public/'+s.item.itemId);
 assert.equal(s.calls.some(c=>c.path==='/listings'),false,'must not create a duplicate item');
 assert.equal(s.calls.some(c=>c.path.endsWith('/publish')),false,'must not republish');
 assert.match(s.status.textContent,/updated and verified/);
});
test('public listing edits cannot be sent without explicit owner approval',async()=>{
 const s=setup();s.item.publishState='public-edit-pending';s.item.confirmPublishedEdit=false;
 await assert.rejects(s.publish(),/confirm/i);
 assert.equal(s.calls.length,0);
});
test('seller editor exposes editing existing public items and prevents duplicate local IDs',()=>{
 const src=source('shop-ad-phi.js');
 assert.match(src,/Edit this saved listing/);
 assert.match(src,/confirmPublishedEdit/);
 assert.match(src,/read\(KEY\)\.filter\(x=>x\.itemId!==item\.itemId\)/);
 assert.match(source('quant-ai-personal.js'),/publish\|remove\|edit/);
});

test('published edit attaches only newly chosen photos and preserves previous seller photos',async()=>{
 const s=setup({photo:true});
 s.item.publishState='public-edit-pending';s.item.confirmPublishedEdit=true;
 const old='a1234567-1234-4234-8234-123456789098';
 s.item.photoIds=[old];s.item.uploadedMediaIds=[];
 await s.publish();
 assert.deepEqual(s.calls[0].upload,['shopmedia-phone-1']);
 assert.equal(s.calls[1].path,'/listings/'+s.item.itemId+'/edit');
 assert.equal(s.calls[1].body.photoIds[0],old);
 assert.equal(s.calls[1].body.photoIds[1],'a1234567-1234-4234-8234-123456789099');
 assert.deepEqual(Array.from(s.item.uploadedMediaIds),['shopmedia-phone-1']);
});

test('unapproved published edit cannot upload any private photographs before rejecting',async()=>{
 const s=setup({photo:true});
 s.item.publishState='public-edit-pending';
 s.item.confirmPublishedEdit=false;
 await assert.rejects(s.publish(),/confirm/i);
 assert.equal(s.calls.length,0,'denied edit must not upload or call seller API');
});
