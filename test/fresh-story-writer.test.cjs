const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('infinite-book-discovery.js','utf8');
const catalog=JSON.parse(fs.readFileSync('infinite-book-catalog.json','utf8'));
const roll={sector:10,angle:1,sourceClass:1,indexWord:'archaeology'};
function engine(){
 const requests=[],window={};
 const fetch=async(url,options={})=>{
  if(String(url).includes('orange-brook'))return {ok:true,json:async()=>({results:[]})};
  if(String(url).includes('w/api.php'))return {ok:true,json:async()=>({query:{pages:{7:{pageid:7,title:'Rediscovered ancient mechanism',extract:'An ancient mechanism was recovered from a shipwreck. Researchers examined its gears and discovered evidence of astronomical calculations. '.repeat(6)}}}})};
  const body=JSON.parse(options.body);requests.push(body);
  if(body.context.task==='infinite-book-scout')return {ok:true,json:async()=>({output:'{"queries":[]}'})};
  return {ok:true,json:async()=>({output:JSON.stringify({title:'The recovered gears that revealed ancient calculations',summary:'The recovered mechanism contained gears that researchers examined for evidence of ancient astronomical calculations. Their examination focused on the surviving object.',full:'Researchers examined the surviving ancient mechanism recovered from a shipwreck. The gears provided evidence about astronomical calculations and the way the mechanism worked.\n\nThe examination of the recovered object grounded the account in physical evidence, rather than an invented explanation.',detail:'Recovered gears provided evidence of ancient astronomical calculations.'})})};
 };
 vm.runInNewContext(source,{window,fetch,URL,URLSearchParams,localStorage:{getItem:()=>null},AbortController,setTimeout,clearTimeout,console,crypto:{getRandomValues:a=>{a[0]=0;return a}}});
 return {window,requests};
}
test('fresh writing requests have distinct AI-cache identities',async()=>{
 const {window,requests}=engine();
 for(let i=0;i<2;i++)assert.ok(await window.PhiInfiniteBookDiscover.find({roll,catalog,seen:new Set(),strictGPT:true}));
 const writes=requests.filter(x=>x.context.task==='infinite-book-deep-story');
 assert.equal(writes.length,2);assert.notEqual(writes[0].context.generationId,writes[1].context.generationId);
});
test('already displayed Wikipedia narratives are excluded before calling the writer',async()=>{
 for(const key of ['wiki-gpt-7','url:https://en.wikipedia.org/?curid=7']){
  const {window,requests}=engine();
  assert.equal(await window.PhiInfiniteBookDiscover.find({roll,catalog,seen:new Set([key]),strictGPT:true}),null);
  assert.equal(requests.filter(x=>x.context.task==='infinite-book-deep-story').length,0);
 }
});
