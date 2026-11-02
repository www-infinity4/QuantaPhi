import test from 'node:test';
import assert from 'node:assert/strict';
import reader,{parsePublicProfile,scanPublicX} from '../workers/bubbles-public-x/worker.mjs';
const x=(id,body,author='YahooPingcwlz')=>'<div role="link" data-href="/'+author+'/status/'+id+'"><a href="/'+author+'/status/'+id+'">Link</a><article><a href="/'+author+'">'+author+'</a><div class="max-w-full text-body whitespace-pre-wrap wrap-break-word" dir="auto"><span>'+body+'</span></div></article></div>';
test('Integra is a separate read-only public source with strict author identity',()=>{
 const id='2116317875573063833';
 const html=x(id,'#bubbles Bubble Yum from Hershey','IntegraAI');
 assert.equal(parsePublicProfile(html).length,0,'default owner reader must not absorb Integra posts');
 const posts=parsePublicProfile(html,'IntegraAI');
 assert.equal(posts.length,1);
 assert.equal(posts[0].url,'https://x.com/IntegraAI/status/'+id);
 assert.deepEqual(parsePublicProfile(x(id,'Forged quote','OtherUser'),'IntegraAI'),[]);
 assert.throws(()=>parsePublicProfile(html,'NotAuthorized'),/unapproved_public_x_source/);
 const spoof=x(id,'#bubbles quote','IntegraAI').replace('href="/IntegraAI"','href="/OtherUser"');
 assert.deepEqual(parsePublicProfile(spoof,'IntegraAI'),[]);
});

test('Integra scan uses its own profile, preserves source URL and scan key',async()=>{
 const id='2116317875573063833',calls=[],writes=[];
 const env={BROWSER:{async quickAction(op,opts){calls.push(opts.url);return new Response(x(id,'#bubbles Bubble Yum','IntegraAI'));}},
  DB:{prepare(sql){return{bind(...args){writes.push({sql,args});return{async run(){return{meta:{changes:1}}}}}}}}};
 const result=await scanPublicX(env,'IntegraAI');
 assert.equal(result.ok,true);
 assert.deepEqual(calls,['https://x.com/IntegraAI']);
 const post=writes.find(w=>w.sql.includes('owner_x_posts'));
 assert.equal(post.args[1],'https://x.com/IntegraAI/status/'+id);
 const scan=writes.find(w=>w.sql.includes('owner_x_scans'));
 assert.equal(scan.args[0],'IntegraAI');
});

test('owner inbox never promotes Integra context to an owner request',async()=>{
 const queries=[];
 const env={DB:{prepare(sql){queries.push(sql);return{
  bind(){return this},async all(){return{results:[]}},async first(){return null}
 }}}};
 const inbox=await (await reader.fetch(new Request('https://quantaphi.org/api/bubbles/public-x/inbox'),env)).json();
 assert.equal(inbox.author,'YahooPingcwlz');
 assert.match(queries.at(-1),/url LIKE 'https:\/\/x\.com\/YahooPingcwlz\/status\/%'/);
 const context=await (await reader.fetch(new Request('https://quantaphi.org/api/bubbles/public-x/context'),env)).json();
 assert.equal(context.author,'IntegraAI');
 assert.equal(context.authority,'reference_only');
 assert.match(queries.at(-1),/url LIKE 'https:\/\/x\.com\/IntegraAI\/status\/%'/);
});

test('owner and Integra public readers report independently when one profile fails',async()=>{
 const modes=[['IntegraAI','YahooPingcwlz'],['YahooPingcwlz','IntegraAI']];
 for(const [bad,good] of modes){
  const rows=[],queries=[];
  const env={
   BROWSER:{async quickAction(_,opts){
    const account=opts.url.split('/').pop();
    return new Response(account===bad?'<p>Log in to X</p>':x('2116350825656107422','Fix QuantaPhi #bubbles',account));
   }},
   DB:{prepare(sql){return{bind(...args){queries.push(sql);return{async run(){rows.push({sql,args});return{meta:{changes:1}}}}}}}}
  };
  let pending=null;
  await reader.scheduled({scheduledTime:Date.parse('2026-11-02T00:17:00Z')},env,{waitUntil(p){pending=p}});
  assert.ok(pending);
  const outcomes=await pending;
  assert.equal(outcomes.length,2);
  assert.equal(outcomes.filter(item=>item.status==='rejected').length,1);
  const success=rows.filter(item=>item.sql.includes('owner_x_scans')&&item.args.includes('public_posts_observed'));
  const blocked=rows.filter(item=>item.sql.includes('owner_x_scans')&&item.args.includes('blocked'));
  assert.equal(success.length,1);assert.equal(blocked.length,1);
  assert.equal(success[0].args[0],good==='YahooPingcwlz'?'main':'IntegraAI');
  assert.equal(blocked[0].args[0],bad==='YahooPingcwlz'?'main':'IntegraAI');
 }
});
test('X setup page distinguishes owner reader and secondary context',async()=>{
 const {readFile}=await import('node:fs/promises');
 const page=await readFile(new URL('../bubbles-x-connect.html',import.meta.url),'utf8');
 const script=await readFile(new URL('../bubbles-public-x-status.js',import.meta.url),'utf8');
 assert.match(page,/id="bubblesPublicXSecondaryStatus"/);
 assert.match(page,/Integra read-only context/);
 assert.match(script,/sources\.find\(item=>item\.account==='IntegraAI'/);
 assert.match(script,/sub\?\.status==='blocked'/);
 assert.doesNotMatch(script,/innerHTML/);
});

test('Integra runs four times daily while owner continues hourly',async()=>{
 const called=[],all=[];
 const env={BROWSER:{async quickAction(_action,opts){const account=opts.url.split('/').pop();called.push(account);return new Response(x('2116350825656107422','Source check',account));}},DB:{prepare(sql){return{bind(...args){return{async run(){return{meta:{changes:1}}}}}}}}};
 for(const hour of [0,1,6,7,12,13,18,19]){
  let pending;
  await reader.scheduled({scheduledTime:Date.parse('2026-11-02T'+String(hour).padStart(2,'0')+':17:00Z')},env,{waitUntil(p){pending=p}});
  await pending;
  all.push(called.splice(0));
 }
 assert.deepEqual(all.map(c=>c.includes('YahooPingcwlz')),[true,true,true,true,true,true,true,true]);
 assert.deepEqual(all.map(c=>c.includes('IntegraAI')),[true,false,true,false,true,false,true,false]);
});
