// Oracle Synapse: owner-scoped concept memory. GitHub repositories are labels
// and provenance, never a destination for private transcript content.
export const synapseSchema=[
 'CREATE TABLE IF NOT EXISTS bubbles_synapse_nodes (owner TEXT NOT NULL,id TEXT NOT NULL,repository TEXT NOT NULL,category TEXT NOT NULL,title TEXT NOT NULL,summary TEXT NOT NULL,source TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(owner,id))',
 'CREATE INDEX IF NOT EXISTS bubbles_synapse_by_repo ON bubbles_synapse_nodes(owner,repository,updated DESC)',
 'CREATE INDEX IF NOT EXISTS bubbles_synapse_by_category ON bubbles_synapse_nodes(owner,category,updated DESC)',
 'CREATE TABLE IF NOT EXISTS bubbles_synapse_edges (owner TEXT NOT NULL,from_id TEXT NOT NULL,to_id TEXT NOT NULL,relation TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(owner,from_id,to_id,relation))',
 'CREATE INDEX IF NOT EXISTS bubbles_synapse_neighbors ON bubbles_synapse_edges(owner,to_id)'
];
const nodeId=/^mem_[a-zA-Z0-9_-]{8,80}$/;
const repoName=/^[a-zA-Z0-9_.-]{1,80}\/[a-zA-Z0-9_.-]{1,100}$/;
const categories=new Set(['general','audio-electronics','computer-science','science','history','finance','software','creative','personal-preferences','projects']);
const relations=new Set(['related','supports','contradicts','evolves','depends-on','part-of']);
export function categorizeRepository(repository,explicitCategory){
 if(explicitCategory!==undefined){
  if(!categories.has(explicitCategory))throw Error('memory_category_invalid');
  return {category:explicitCategory,derived:false};
 }
 const repo=String(repository||'').toLowerCase();
 // Weak labels, not factual classifications. Users can correct any label.
 const category=/radio|clubhouse|music|piano/.test(repo)?'audio-electronics':
  /quantaphi|codephi|github|oracle|builder/.test(repo)?'software':'general';
 return {category,derived:true};
}
function nodeInput(body){
 const repository=String(body.repository||'').trim();
 if(!repoName.test(repository))throw Error('memory_repository_invalid');
 if(!nodeId.test(body.id||''))throw Error('memory_id_invalid');
 const title=String(body.title||'').trim();
 const summary=String(body.summary||'').trim();
 const source=String(body.source||'').trim();
 if(!title||title.length>140||!summary||summary.length>3000||!source||source.length>250)
  throw Error('memory_content_invalid');
 // Never treat provider/web/model text as direct evidence of an owner preference.
 if(body.confirmed!==true)throw Error('memory_owner_confirmation_required');
 const {category,derived}=categorizeRepository(repository,body.category);
 return {id:body.id,repository,category,derived,title,summary,source};
}
export async function oracleSynapse(db,owner,body){
 // All routes into this function require the existing verified owner auth.
 for(const sql of synapseSchema)await db.prepare(sql).run();
 const mode=body.mode;
 if(mode==='synapse-save'){
  const node=nodeInput(body),now=Date.now();
  await db.prepare('INSERT INTO bubbles_synapse_nodes(owner,id,repository,category,title,summary,source,created,updated) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET repository=excluded.repository,category=excluded.category,title=excluded.title,summary=excluded.summary,source=excluded.source,updated=excluded.updated')
   .bind(owner,node.id,node.repository,node.category,node.title,node.summary,node.source,now,now).run();
  return {ok:true,id:node.id,repository:node.repository,category:node.category,categoryInferred:node.derived,status:'saved'};
 }
 if(mode==='synapse-link'){
  if(body.confirmed!==true)throw Error('memory_owner_confirmation_required');
  if(!nodeId.test(body.from||'')||!nodeId.test(body.to||'')||body.from===body.to||!relations.has(body.relation))
   throw Error('memory_link_invalid');
  const rows=await db.prepare('SELECT id FROM bubbles_synapse_nodes WHERE owner=? AND id IN (?,?)')
   .bind(owner,body.from,body.to).all();
  if((rows.results||[]).length!==2)throw Error('memory_link_target_not_found');
  await db.prepare('INSERT OR IGNORE INTO bubbles_synapse_edges(owner,from_id,to_id,relation,created) VALUES(?,?,?,?,?)')
   .bind(owner,body.from,body.to,body.relation,Date.now()).run();
  return {ok:true,status:'linked'};
 }
 if(mode==='synapse-query'){
  const query=String(body.query||'').trim().slice(0,120);
  const repo=String(body.repository||'').trim();
  if(repo&&!repoName.test(repo))throw Error('memory_repository_invalid');
  const like='%'+query.replace(/[%_\\]/g,'')+'%';
  if(!query&&!repo)throw Error('memory_query_required');
  const nodes=await db.prepare('SELECT id,repository,category,title,summary,source,created,updated FROM bubbles_synapse_nodes WHERE owner=? AND (?=\'\' OR repository=?) AND (?=\'\' OR title LIKE ? OR summary LIKE ? OR category LIKE ?) ORDER BY updated DESC LIMIT 16')
   .bind(owner,repo,repo,query,like,like,like).all();
  const found=nodes.results||[],edges=[];
  for(const node of found.slice(0,8)){
   const linked=await db.prepare('SELECT from_id,to_id,relation FROM bubbles_synapse_edges WHERE owner=? AND (from_id=? OR to_id=?) LIMIT 12')
    .bind(owner,node.id,node.id).all();
   edges.push(...(linked.results||[]));
  }
  return {ok:true,nodes:found,links:[...new Map(edges.map(x=>[x.from_id+':'+x.to_id+':'+x.relation,x])).values()],authority:'owner-labelled-not-verified-fact'};
 }
 throw Error('memory_operation_unsupported');
}
