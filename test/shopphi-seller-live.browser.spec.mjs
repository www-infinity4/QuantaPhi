import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800}});
test('ShopPhi owner lists own item with wallet and receives a verified shareable card',async({page})=>{
 const token='sq_'+('a'.repeat(40));
 await page.addInitScript(({token})=>{
  localStorage.setItem('starquest_session',JSON.stringify({key:'sellerqa',username:'sellerqa',signedInAt:Date.now()}));
  localStorage.setItem('starquest_users',JSON.stringify({sellerqa:{key:'sellerqa',username:'sellerqa'}}));
  localStorage.setItem('starquest_ledger_device_v1:sellerqa',token);
 },{token});
 const calls=[],rows=new Map();
 await page.route('**/quant-ai/api/shopphi/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  const auth=request.headers().authorization;
  const isPublic=/\/shopphi\/public\//.test(path);
  if(!isPublic&&auth!=='Bearer '+token)return route.fulfill({status:401,contentType:'application/json',body:'{"error":"authorization_required"}'});
  if(path.endsWith('/shopphi/listings')&&request.method()==='POST'){
   const item=JSON.parse(request.postData()||'{}');
   calls.push({action:'draft',item});
   const listing={listingId:item.itemId,title:item.title,description:item.description,priceLabel:item.priceLabel,
     merchant:'Seller-qa',condition:item.condition,category:item.category,shipping:item.shipping,quantity:item.quantity,
     link:base+'/shopphi-item.html?id='+item.itemId,status:'draft',imageUrl:''};
   rows.set(item.itemId,listing);
   return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,saved:'private-draft',published:false,listing})});
  }
  if(/\/publish$/.test(path)&&request.method()==='POST'){
   const id=path.split('/').at(-2),item=rows.get(id);
   if(!item)return route.fulfill({status:404,body:'{}'});
   item.status='published';calls.push({action:'publish',id,consent:JSON.parse(request.postData()||'{}')});
   return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,published:true,visibility:'unlisted',listing:item})});
  }
  const match=path.match(/\/shopphi\/public\/([0-9a-f-]+)$/);
  if(match){
   const item=rows.get(match[1]);
   if(!item||item.status!=='published')return route.fulfill({status:404,contentType:'application/json',body:'{"error":"not_found"}'});
   calls.push({action:'public-readback',id:match[1]});
   return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,listing:item})});
  }
  if(path.endsWith('/shopphi/listings')&&request.method()==='GET'){
   return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,listings:[...rows.values()]})});
  }
  return route.fulfill({status:404,body:'{}'});
 });
 await page.goto(base+'/shopphi-sell.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#shopphiWalletStatus')).toContainText('connected on this device');
 const form=page.locator('#shopAdPhi form.sap-form');
 await expect(form).toBeVisible();
 await form.locator('[name="title"]').fill('My 1881 Morgan silver dollar');
 await form.locator('[name="description"]').fill('Seller-described coin, condition unverified. Images to follow.');
 await form.locator('[name="priceLabel"]').fill('120.00');
 await form.locator('[name="category"]').selectOption('Coins & paper money');
 await form.locator('[name="condition"]').selectOption('Used');
 await form.locator('[name="shipping"]').selectOption('Shipping offered');
 await form.locator('[name="ownItem"]').check();
 await form.locator('[name="publishConsent"]').check();
 await form.getByRole('button',{name:'Save my item to ShopPhi'}).click();
 await expect(page.locator('#shopAdPhi .sap-status')).toContainText('published at a verified shareable URL',{timeout:15000});
 expect(calls.map(x=>x.action)).toEqual(['draft','publish','public-readback']);
 expect(calls[0].item.url).toBe('');
 expect(calls[1].consent).toEqual({ownItem:true,publishConsent:true});
 await expect(page.locator('#shopAdPhi .sap-feature')).toContainText('PUBLIC SHOP PHI POST');
 await expect(page.locator('#shopAdPhi .sap-feature')).toContainText('My 1881 Morgan silver dollar');
 for(const label of ['☆ Star','+1 Build','Browse similar at eBay','Collect','Share'])
  await expect(page.locator('#shopAdPhi .sap-feature button').filter({hasText:label}).first()).toBeVisible();
 await page.goto(base+'/shopphi-item.html?id='+calls[1].id,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#title')).toHaveText('My 1881 Morgan silver dollar');
 await expect(page.locator('#state')).toContainText('Published, shareable unlisted listing');
 await expect(page.locator('#disclosure')).toContainText('has not verified');
});
