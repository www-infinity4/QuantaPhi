const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const schema=fs.readFileSync(path.join(__dirname,'../workers/infinity-brain-clock/knowledge-schema.sql'),'utf8');
const python=String.raw`import sqlite3,sys
db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
schema=sys.stdin.read()
db.executescript(schema);db.executescript(schema)
names={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
assert {'quant_knowledge_catalog','knowledge_dependency_edges','execution_provenance_registry'} <= names
digest='a'*64
def catalog(id,ref):
 db.execute('INSERT INTO quant_knowledge_catalog (knowledge_id,repository,source_kind,source_ref,content_hash,title,summary,observed_at) VALUES (?,?,?,?,?,?,?,?)',(id,'www-infinity4/QuantaPhi','source',ref,digest,'Source','Verified content',1000))
def blocked(sql,args):
 try: db.execute(sql,args)
 except sqlite3.IntegrityError: return
 raise AssertionError('Expected immutable constraint violation')
catalog('k1','index.html');catalog('k2','worker.js')
blocked('INSERT INTO quant_knowledge_catalog (knowledge_id,repository,source_kind,source_ref,content_hash,title,summary,observed_at) VALUES (?,?,?,?,?,?,?,?)',('k3','www-infinity4/QuantaPhi','source','index.html',digest,'Duplicated','Duplicated',1001))
db.execute('INSERT INTO knowledge_dependency_edges (edge_id,from_knowledge_id,to_knowledge_id,relation,created_at) VALUES (?,?,?,?,?)',('edge-1','k2','k1','depends_on',1002))
blocked('INSERT INTO knowledge_dependency_edges (edge_id,from_knowledge_id,to_knowledge_id,relation,created_at) VALUES (?,?,?,?,?)',('edge-2','k2','missing','depends_on',1003))
blocked('INSERT INTO knowledge_dependency_edges (edge_id,from_knowledge_id,to_knowledge_id,relation,created_at) VALUES (?,?,?,?,?)',('edge-3','k1','k1','depends_on',1003))
base=('p1','TICKET-1','TASK-1','attempt-1','www-infinity4/QuantaPhi','greenbeans',1004)
db.execute('INSERT INTO execution_provenance_registry (provenance_id,ticket_id,job_id,attempt_id,repository,agent_id,recorded_at,status) VALUES (?,?,?,?,?,?,?,?)',(*base,'claimed'))
blocked('INSERT INTO execution_provenance_registry (provenance_id,ticket_id,job_id,attempt_id,repository,agent_id,recorded_at,status) VALUES (?,?,?,?,?,?,?,?)',('p2',*base[1:],'deployed_verified'))
blocked('INSERT INTO execution_provenance_registry (provenance_id,ticket_id,job_id,attempt_id,repository,agent_id,recorded_at,status) VALUES (?,?,?,?,?,?,?,?)',('p3','TICKET-1','TASK-1','attempt-2','www-infinity4/QuantaPhi','greenbeans',1005,'deployed_verified'))
db.execute('INSERT INTO execution_provenance_registry (provenance_id,ticket_id,job_id,attempt_id,repository,agent_id,recorded_at,status,commit_sha,test_receipt_ref,review_receipt_ref,deploy_receipt_ref) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',('p4','TICKET-1','TASK-1','attempt-3','www-infinity4/QuantaPhi','greenbeans',1006,'deployed_verified','f'*40,'tests/run/1','review/run/1','deploy/run/1'))
assert db.execute('SELECT COUNT(*) FROM execution_provenance_registry').fetchone()[0]==2
print('Additive knowledge schema validated twice, foreign keys/duplicates/receipts enforced')
`;
test('knowledge tables migrate idempotently and evidence gates reject invented completion',()=>{
  const result=spawnSync('python3',['-c',python],{input:schema,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/schema validated twice/);
});
test('knowledge schema cannot touch existing wallet or work-ticket tables',()=>{
  const statements=schema.replace(/--[^\n]*/g,''); // comments name preserved tables but do not execute mutations
  assert.doesNotMatch(statements,/\b(?:ALTER|DROP|DELETE|UPDATE|REPLACE|TRUNCATE)\s+(?:TABLE\s+)?(?:wallet|work_tickets|quant_ledger|unified_wallet|starcoin)/i);
  for(const table of ['quant_knowledge_catalog','knowledge_dependency_edges','execution_provenance_registry'])
    assert.match(schema,new RegExp('CREATE TABLE IF NOT EXISTS '+table));
});
