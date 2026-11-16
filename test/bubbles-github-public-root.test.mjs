import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublicGithubRoot,parsePublicGithubRoot,githubRootSummary} from '../workers/bubbles-tools/github-public-root.mjs';
import {readGithubRepository} from '../workers/bubbles-tools/worker.mjs';
const repository='www-infinity4/QuantaPhi',sha='a'.repeat(40);
function fixture({repo={},route={},tree={},items}={}){
 const entries=items||[{name:'.github',path:'.github',contentType:'directory'},
  ...Array.from({length:35},(_,i)=>({name:'bubbles-'+i+'.js',path:'bubbles-'+i+'.js',contentType:'file'})),
  {name:'README.md',path:'README.md',contentType:'file'}];
 const payload={codeViewLayoutRoute:{repo:{public:true,private:false,ownerLogin:'www-infinity4',name:'QuantaPhi',defaultBranch:'main',...repo}},
  codeViewRepoRoute:{path:'/',refInfo:{name:'main',currentOid:sha},tree:{items:entries,totalCount:entries.length,...tree},...route}};
 return '<html><script type="application/json" data-target="react-app.embeddedData">'+JSON.stringify({payload})+'</script></html>';
}
test('public root metadata and actual README path survive large summaries',()=>{
 const page=parsePublicGithubRoot(fixture(),repository);
 assert.equal(page.headSha,sha);assert.equal(page.contents.length,37);
 const shown=githubRootSummary(page.contents);
 assert.equal(shown.length,26);assert.equal(shown[0].name,'README.md');
 assert.equal(page.sourceUrl,'https://github.com/'+repository+'/tree/'+sha);
});
test('wrong, private, partial, nested or invalid commit metadata never verifies a root',()=>{
 for(const options of [{repo:{private:true}},{repo:{public:false}},{repo:{ownerLogin:'other'}},
  {repo:{name:'Other'}},{route:{path:'src'}},{tree:{totalCount:999}},
  {route:{refInfo:{name:'main',currentOid:'not-a-sha'}}},{tree:{totalCount:1001}}])
  assert.throws(()=>parsePublicGithubRoot(fixture(options),repository));
});
test('collapsed root directories are normalized; unsafe, duplicate and fabricated filenames are rejected',()=>{
 const item={name:'channels/HBO',path:'channels/HBO',contentType:'directory',hasSimplifiedPath:true};
 assert.deepEqual(parsePublicGithubRoot(fixture({items:[item]}),repository).contents,[{name:'channels',type:'dir'}]);
 for(const items of [[{...item,hasSimplifiedPath:false}],[{...item,path:'../secrets',name:'../secrets'}],
  [{name:'README.md',path:'other.md',contentType:'file'}],[item,item],
  [{name:'bad\npath',path:'bad\npath',contentType:'file'}]])
  assert.throws(()=>parsePublicGithubRoot(fixture({items}),repository));
});
test('network fallback uses fixed anonymous HTTPS with no redirects, and bounds HTML size',async()=>{
 const seen=[];
 const page=await readPublicGithubRoot(repository,async(url,options)=>{
  seen.push({url,options});return new Response(fixture(),{headers:{'Content-Type':'text/html'}});
 });
 assert.equal(page.headSha,sha);assert.equal(seen[0].url,'https://github.com/'+repository);
 assert.equal(seen[0].options.redirect,'manual');assert.equal(seen[0].options.headers.Authorization,undefined);
 for(const response of [new Response('redirect',{status:302}),new Response('not html'),
  new Response('x'.repeat(1000001),{headers:{'content-type':'text/html'}})])
  await assert.rejects(()=>readPublicGithubRoot(repository,async()=>response));
 await assert.rejects(()=>readPublicGithubRoot('owner/../../private',async()=>assert.fail('no network')));
});
test('REST 429 can produce a verified public root receipt with observed documentation',async()=>{
 const request=new Request('https://bubbles-tools.test/v1/assist',{headers:{Origin:'https://quantaphi.org'}});
 const result=await readGithubRepository(request,{request:'Inspect '+repository+' and read its main documentation',repository},
  {tool:'github.read_repository'},async url=>url.startsWith('https://api.github.com/')?
   new Response('limited',{status:429}):new Response(fixture(),{headers:{'content-type':'text/html'}}));
 const data=await result.json();
 assert.equal(data.receipt.status,'complete');assert.equal(data.receipt.provider,'github-html-public');
 assert.equal(data.receipt.rootListingVerified,true);assert.equal(data.receipt.repositoryActionsVerified,false);
 assert.equal(data.contents[0].name,'README.md');
});
