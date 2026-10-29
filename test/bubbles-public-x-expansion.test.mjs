import test from 'node:test';
import assert from 'node:assert/strict';
import {scanPublicX,parsePublicProfile,classifyPost} from '../workers/bubbles-public-x/worker.mjs';

const ID='2115528052818276498';
const article=(body)=>'<div role="link" data-href="/YahooPingcwlz/status/'+ID+'"><article><a href="/YahooPingcwlz">Owner</a><div class="whitespace-pre-wrap" dir="auto">'+body+'</div></article></div>';

function harness(){
 const posts=new Map(),scanWrites=[],renders=[];
 const env={
  BROWSER:{async quickAction(){return new Response(renders.shift())}},
  DB:{prepare(sql){return{bind(...args){return{
   async first(){
    if(!sql.startsWith('SELECT kind FROM owner_x_posts'))throw Error('unexpected first');
    const row=posts.get(args[0]);return row?{kind:row.kind}:null;
   },
   async run(){
    if(sql.startsWith('INSERT OR IGNORE INTO owner_x_posts')){
     const [id,url,body,kind,observed_at,pinned]=args;
     if(posts.has(id))return {meta:{changes:0}};
     posts.set(id,{id,url,body,kind,observed_at,pinned});return {meta:{changes:1}};
    }
    if(sql.startsWith('UPDATE owner_x_posts SET body=')){
     const [body,kind,id,extended1,extended2]=args,row=posts.get(id);
     if(!row||body!==extended1||body!==extended2||body.length<=row.body.length||!body.startsWith(row.body))return {meta:{changes:0}};
     posts.set(id,{...row,body,kind});return {meta:{changes:1}};
    }
    if(sql.startsWith('INSERT INTO owner_x_scans')){scanWrites.push(args);return {meta:{changes:1}}}
    throw Error('unexpected SQL: '+sql);
   }
  }}}}}
 };
 return {env,posts,scanWrites,renders};
}

test('strict public-text extension upgrades a clipped post and promotes its request without recounting a new ID',async()=>{
 const h=harness(),short='This is my plan',long=short+' #bubbles please build a card';
 h.renders.push(article(short),article(long));
 const first=await scanPublicX(h.env),firstSeen=h.posts.get(ID).observed_at;
 assert.equal(first.newPosts,1);assert.equal(first.expandedPosts,0);
 assert.equal(h.posts.get(ID).kind,'other');
 const second=await scanPublicX(h.env);
 assert.equal(second.newPosts,0);
 assert.equal(second.expandedPosts,1);
 assert.equal(second.newPossibleRequests,1);
 assert.equal(h.posts.get(ID).body,long);
 assert.equal(h.posts.get(ID).kind,'tagged');
 assert.equal(h.posts.get(ID).observed_at,firstSeen);
 assert.equal(h.scanWrites.at(-1)[4],0); // scan new_count remains zero
 assert.equal(h.scanWrites.at(-1)[5],1); // promoted candidate recorded
});

test('divergent or identical public wording never overwrites first-seen evidence',async()=>{
 const h=harness(),original='Build a QuantaPhi card #bubbles';
 h.renders.push(article(original),article('Different instructions #bubbles'),article(original));
 await scanPublicX(h.env);
 const firstSeen=h.posts.get(ID).observed_at;
 const changed=await scanPublicX(h.env),same=await scanPublicX(h.env);
 assert.equal(changed.newPosts,0);assert.equal(changed.expandedPosts,0);
 assert.equal(same.expandedPosts,0);
 assert.equal(h.posts.get(ID).body,original);
 assert.equal(h.posts.get(ID).observed_at,firstSeen);
});

test('a longer but untrusted divergent post cannot promote a noncandidate',async()=>{
 const h=harness();
 h.renders.push(article('A brief note'),article('A different note #bubbles build a card'));
 await scanPublicX(h.env);
 const r=await scanPublicX(h.env);
 assert.equal(r.expandedPosts,0);assert.equal(r.newPossibleRequests,0);
 assert.equal(h.posts.get(ID).kind,'other');
});


test('hexadecimal HTML entities retain #bubbles owner request tags',async()=>{
 for(const encoded of ['&#x23;bubbles','&#X23;bubbles','&#35;bubbles']){
  const posts=parsePublicProfile(article(encoded+' build an Infinity card'));
  assert.equal(posts.length,1);
  assert.equal(posts[0].text,'#bubbles build an Infinity card');
  assert.equal(classifyPost(posts[0].text),'tagged');
 }
 const h=harness();
 h.renders.push(article('&#x23;bubbles build an Infinity card'));
 const result=await scanPublicX(h.env);
 assert.equal(result.newPosts,1);
 assert.equal(result.newPossibleRequests,1);
 assert.equal(h.posts.get(ID).kind,'tagged');
});
