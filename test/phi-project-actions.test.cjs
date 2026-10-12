'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const load=path=>fs.readFileSync(path,'utf8');
const homepage=load('index.html'),page=load('project-workspace/index.html');
const pkg=load('phi-project-package.js'),files=load('phi-project-files.js'),cards=load('phi-project-cards.js'),ui=load('phi-project-page.js'),halloween=load('halloween-phi.js');
test('Code and Create cards really mount on QuantaPhi and run the existing Code Phi Oracle editor',()=>{
 assert.match(homepage,/id="phiProjectActions"/);
 for(const path of ['phi-project-files.js','phi-project-package.js','phi-project-cards.js','phi-project-cards.css'])assert.ok(homepage.includes('/'+path));
 assert.ok(cards.includes("pkg.seed(kind)"));
 assert.ok(pkg.includes("'/omni-phi/code/'"));
 assert.ok(pkg.includes("u.hash='mediaStudio'"));
 assert.ok(cards.includes('frame.src=url'));
 assert.ok(!cards.includes('iframe.srcdoc'));
 for(const source of [pkg,files,cards,ui,halloween])assert.doesNotThrow(()=>new Function(source));
});
test('project route loads collection and Oracle action controls',()=>{
 assert.match(page,/id="phiProjectPage"/);
 assert.match(page,/id="phiProjectActions"/);
 assert.match(page,/phi-project-page\.js/);
 assert.match(page,/phi-project-package\.js/);
 assert.match(page,/phi-project-cards\.js/);
 assert.match(ui,/Import wallet token/);
 assert.match(ui,/Export package JSON/);
 assert.match(ui,/Add source/);
});
function runtime(){
 const data=new Map(),listeners=new Map();
 const store={getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>{data.set(key,String(value))},removeItem:key=>data.delete(key)};
 const root={localStorage:store,URL,location:{origin:'https://quantaphi.org'},
  crypto:require('node:crypto').webcrypto,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
  addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},
  dispatchEvent:e=>{for(const fn of listeners.get(e.type)||[])fn(e)}};
 root.window=root;
 vm.runInNewContext(pkg,root,{filename:'phi-project-package.js'});
 return{api:root.PhiProjectPackage,root,data};
}
test('plus creates local draft, collects distinct assets, de-duplicates by source and exports handoff sources',()=>{
 const{api,data}=runtime();
 const draft=api.newToken('Monster studio');
 assert.match(draft.id,/^draft-/);assert.equal(draft.tokenId,'');
 const a={kind:'image',title:'Frankenstein original photo',sourceUrl:'https://commons.wikimedia.org/wiki/File:photo.jpg',imageUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/photo.jpg',license:'public domain',year:1931};
 assert.equal(api.capture(a).ok,true);
 assert.equal(api.capture(a).duplicate,true);
 assert.equal(api.active().assets.length,1);
 const url=api.seed('create');
 assert.ok(url.startsWith('/omni-phi/code/'));assert.ok(url.includes('#mediaStudio'));
 const seed=JSON.parse(data.get('omniPhi:codeSeed:v1'));
 assert.equal(seed.sources.length,1);
 assert.equal(seed.sources[0].title,a.title);
 assert.equal(api.active().tokenStatus,'local-draft');
});
test('collected card events automatically append to the active project without paying wallet tokens',()=>{
 const{api,root}=runtime();
 const a=api.newToken('Monsters');
 root.dispatchEvent(new root.CustomEvent('quantaphi:collected',{detail:{type:'card',title:'Monster movie',sourceUrl:'https://archive.org/details/monster'}}));
 assert.equal(api.active().assets.length,1);
 assert.equal(api.active().assets[0].sourceUrl,'https://archive.org/details/monster');
 assert.equal(api.active().draftTokenId,a.id);
 assert.ok(!pkg.includes('QuantaStarCredit'));
 assert.ok(!pkg.includes('InfinityCredit.commitNow'));
});
test('existing wallet token association requires server-confirmed record',async()=>{
 const{api,root}=runtime();
 api.newToken('Monsters');
 root.QuantaUnifiedTokenLedger={load:async()=>[
 {id:'pending',cloudTokenId:'p-cloud',cloudStatus:'pending',query:'bad'},
 {id:'confirmed',cloudTokenId:'live-31',cloudStatus:'saved',query:'Monster Research'}]};
 assert.equal(await api.attachToken('pending'),false);
 assert.equal(await api.attachToken('live-31'),true);
 assert.equal(api.active().tokenId,'confirmed');
});
test('import project cannot inject arbitrary token or non-http asset URLs',()=>{
 const{api}=runtime();
 const imported=api.importProject({schema:'phi-asset-project/v1',title:'My Art',tokenId:'injected-wallet',
  assets:[{title:'good',sourceUrl:'https://example.com/image'},{title:'bad',sourceUrl:'javascript:alert(1)'}]});
 assert.equal(imported.tokenId,'');assert.equal(imported.assets.length,1);
 assert.equal(api.active().assets.length,1);
});
test('TerriPhi and PetriPhi preserve original interactive studio while adding Oracle project collect actions',()=>{
 for(const path of ['terriphi/index.html','petriphi/index.html']){
  const content=load(path);
  assert.match(content,/phi-halloween-oracle\.css/);
  assert.match(content,/phi-project-new/);
  assert.match(content,/phi-project-package\.js/);
 }
 assert.match(halloween,/projectControls\(card,c\)/);
 assert.match(halloween,/＋ Collect image/);
 assert.match(halloween,/＋ Collect movie/);
 assert.match(halloween,/project\(\)\?\.capture/);
});

test('Oracle file-picker tiles replace typed image filenames in both action cards and project workspace',()=>{
 assert.match(cards,/pp-upload-tile/);
 assert.match(cards,/uploadInput\.type='file'/);
 assert.match(cards,/pkg\.captureFile\(file,kind\)/);
 assert.match(ui,/pwp-upload/);
 assert.match(ui,/imagePicker\.type='file'/);
 assert.match(ui,/pkg\.captureFile\(picked,'project-workspace'\)/);
 assert.match(page,/phi-project-files\.js/);
 assert.match(homepage,/phi-project-files\.js/);
 assert.match(files,/indexedDB\.open/);
 assert.match(files,/12\*1024\*1024/);
 assert.ok(!files.includes('localStorage.setItem'));
});
test('uploaded images get only a device-local asset reference; imported JSON cannot forge file IDs',async()=>{
 const{api,root,data}=runtime();
 api.newToken('Creature art');
 const fakeLocal='upload-12345678-1234-1234-1234-123456789abc';
 let saves=0;
 root.PhiProjectFiles={save:async()=>{saves++;return{id:fakeLocal,name:'Monster.png',mime:'image/png',size:1400}},remove:async()=>{}};
 const added=await api.captureFile({name:'Monster.png'},'petriphi');
 assert.equal(added.ok,true);assert.equal(saves,1);
 const asset=api.active().assets[0];
 assert.equal(asset.localAssetId,fakeLocal);
 assert.equal(asset.sourceUrl,'');
 assert.equal(asset.fileName,'Monster.png');
 assert.equal(JSON.parse(data.get('quantaphi:asset-projects:v1'))[0].assets[0].imageUrl,'');
 const imported=api.importProject({schema:'phi-asset-project/v1',title:'Remote copy',assets:[asset]});
 assert.equal(imported.assets.length,0,'JSON cannot supply a local image blob');
 assert.equal(api.active().assets.length,0);
 assert.equal(api.capture({kind:'image',title:'External',sourceUrl:'https://example.org/source',imageUrl:'https://example.org/img.png'}).ok,true);
 const route=api.seed('code');
 assert.ok(route.includes('/omni-phi/code/'));
});
