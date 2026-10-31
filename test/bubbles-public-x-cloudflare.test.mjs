import test from 'node:test';
import assert from 'node:assert/strict';
import reader,{parsePublicProfile,classifyPost,scanPublicX} from '../workers/bubbles-public-x/worker.mjs';
const x=(id,body,author='YahooPingcwlz')=>
 '<div role="link" data-href="/'+author+'/status/'+id+'"><a href="/'+author+'/status/'+id+'">Link</a>'+
 '<article><a href="/'+author+'">'+author+'</a><div class="max-w-full text-body whitespace-pre-wrap wrap-break-word" dir="auto"><span>'+body+'</span></div></article></div>';
test('parses exact owner public profile article and decodes entities',()=>{
 const html=x('2113352129427730641','Build a VAMWorld card &amp; add coins. #bubbles');
 const p=parsePublicProfile(html);
 assert.equal(p.length,1);
 assert.equal(p[0].id,'2113352129427730641');
 assert.equal(p[0].text,'Build a VAMWorld card & add coins. #bubbles');
 assert.equal(p[0].url,'https://x.com/YahooPingcwlz/status/2113352129427730641');
});
test('skips other-account quote and duplicates',()=>{
 const owner=x('2113352129427730641','Fix QuantaPhi');
 const outsider=x('2113352129427730642','Build on others account #bubbles','OtherUser');
 assert.deepEqual(parsePublicProfile(owner+owner+outsider).map(x=>x.id),['2113352129427730641']);
});
test('discovers untagged work ideas and tagged posts without treating everything as commands',()=>{
 assert.equal(classifyPost('We should add a Heritage coin card to QuantaPhi'),'possible');
 assert.equal(classifyPost('Please add this #bubbles'),'tagged');
 assert.equal(classifyPost('Bubbles sounds interesting'),'context');
 assert.equal(classifyPost('Had lunch today'),'other');
});
test('cannot obtain posts from static login wall',()=>{
 assert.equal(parsePublicProfile('<p>Log in to X</p>').length,0);
});

test('current X profile attributes before role do not hide owner requests',()=>{
 const body=x('2115247012413100176','#bubbles quick ad');
 const actual=body.replace('<div role="link" data-href=',
  '<div aria-labelledby="post-title" id="post-title" role="link" data-href=');
 assert.equal(parsePublicProfile(actual)[0]?.text,'#bubbles quick ad');
 const reordered=actual.replace('role="link" data-href="/YahooPingcwlz/status/2115247012413100176"',
  "data-href='/YahooPingcwlz/status/2115247012413100176' tabindex='0' role='link'");
 assert.equal(parsePublicProfile(reordered)[0]?.id,'2115247012413100176');
 assert.equal(parsePublicProfile(reordered.replace("role='link'","role='button'")).length,0);
});

test('retries a late public timeline and records real owner posts',async()=>{
 const html=x('2113352129427730641','Repair Bubbles #bubbles'),calls=[],writes=[];
 const responses=['<p>Loading...</p>',html];
 const env={BROWSER:{async quickAction(name,opts){calls.push(opts.waitForTimeout);
  return new Response(responses.shift());}},
  DB:{prepare(sql){return{bind(...args){writes.push({sql,args});return{
   async run(){return {meta:{changes:1}}}
  }}}}}};
 const result=await scanPublicX(env);
 assert.equal(result.ok,true);assert.deepEqual(calls,[4800,8000]);
 assert.equal(result.newPosts,1);
 assert.ok(writes.some(w=>w.sql.includes('owner_x_posts')));
 assert.ok(writes.some(w=>w.args.includes('public_posts_observed')));
});
test('rendered login wall stays blocked after bounded retry',async()=>{
 const calls=[],writes=[];
 const env={BROWSER:{async quickAction(name,opts){calls.push(opts.waitForTimeout);
  return new Response('<p>Log in to X</p>');}},
  DB:{prepare(sql){return{bind(...args){writes.push({sql,args});return{
   async run(){return {meta:{changes:1}}}
  }}}}}};
 await assert.rejects(scanPublicX(env),/no_visible_public_owner_posts_after_retry/);
 assert.deepEqual(calls,[4800,8000]);
 assert.ok(writes.some(w=>w.args.includes('blocked')));
});

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
  await reader.scheduled({},env,{waitUntil(p){pending=p}});
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
