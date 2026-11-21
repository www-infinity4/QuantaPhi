import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('D1 design schema isolates owner/profile/job and preserves immutable receipts',()=>{
 const schema=fileURLToPath(new URL('../design-lab/tenant-context-schema.sql',import.meta.url));
 const script=String.raw`
import sqlite3,sys
db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
sql=open(sys.argv[1],encoding='utf-8').read()
db.executescript(sql)
db.executescript(sql)  # safe for deliberate repeated application
assert db.execute('PRAGMA foreign_keys').fetchone()[0]==1
a='a'*64
def fail(statement, values=()):
    try: db.execute(statement,values)
    except sqlite3.IntegrityError: return
    raise AssertionError('Expected constraint failure: '+statement)
def job(owner,profile,job_id,key,limit=10):
    db.execute("INSERT INTO qp_route_jobs(owner_id,profile_id,job_id,idempotency_key,circuit,request_sha256,target_limit,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,1)",
      (owner,profile,job_id,key,'collect',a,limit))
db.execute("INSERT INTO qp_context_profiles VALUES('alice','general','',1,1)")
db.execute("INSERT INTO qp_context_profiles VALUES('alice','private','',1,1)")
db.execute("INSERT INTO qp_context_profiles VALUES('bob','general','',1,1)")
db.execute("INSERT INTO qp_context_sessions VALUES('alice','general','session001',?,1)",(a,))
fail("INSERT INTO qp_context_sessions VALUES('alice','missing','session002',?,1)",(a,))
job('alice','general','job00100','request001')
job('bob','general','job00100','request001') # owner-scoped identity
fail("INSERT INTO qp_route_jobs(owner_id,profile_id,job_id,idempotency_key,circuit,request_sha256,target_limit,created_at,updated_at) VALUES('alice','missing','job00200','request002','shop',?,10,1,1)",(a,))
fail("INSERT INTO qp_route_jobs(owner_id,profile_id,job_id,idempotency_key,circuit,request_sha256,target_limit,created_at,updated_at) VALUES('alice','general','job00300','request001','shop',?,10,1,1)",(a,))
fail("INSERT INTO qp_route_jobs(owner_id,profile_id,job_id,idempotency_key,circuit,request_sha256,target_limit,created_at,updated_at) VALUES('alice','general','job00400','request004','shop',?,1000,1,1)",(a,))
db.execute("INSERT INTO qp_route_targets(owner_id,profile_id,job_id,domain,position,updated_at) VALUES('alice','general','job00100','ebay.com',1,1)")
fail("INSERT INTO qp_route_targets(owner_id,profile_id,job_id,domain,position,updated_at) VALUES('alice','private','job00100','pcgs.com',2,1)")
fail("INSERT INTO qp_route_targets(owner_id,profile_id,job_id,domain,position,updated_at) VALUES('bob','private','job00100','pcgs.com',2,1)")
db.execute("INSERT INTO qp_route_receipts VALUES('alice','general','receipt001','job00100','source001','source-result',?,1)",(a,))
fail("INSERT INTO qp_route_receipts VALUES('alice','private','receipt002','job00100','source002','source-result',?,1)",(a,))
fail("INSERT INTO qp_route_receipts VALUES('bob','general','receipt003','job00100','source003','source-result','short',1)")
fail("INSERT INTO qp_route_receipts VALUES('alice','general','receipt004','job00100','source001','source-result',?,1)",(a,))
fail("UPDATE qp_route_receipts SET payload_sha256=? WHERE owner_id='alice'",(a,))
fail("DELETE FROM qp_route_receipts WHERE owner_id='alice'")
fail("UPDATE qp_route_jobs SET owner_id='bob' WHERE owner_id='alice'")
fail("UPDATE qp_route_targets SET profile_id='private' WHERE owner_id='alice'")
fail("DELETE FROM qp_context_profiles WHERE owner_id='alice' AND profile_id='general'")
db.execute("UPDATE qp_route_jobs SET state='running',updated_at=2 WHERE owner_id='alice'")
db.execute("UPDATE qp_route_targets SET state='matched',attempts=1,updated_at=2 WHERE owner_id='alice'")
assert db.execute("SELECT COUNT(*) FROM qp_route_receipts").fetchone()[0]==1
assert not any('wallet' in n.lower() or 'mint' in n.lower() for (n,) in db.execute("SELECT name FROM sqlite_master WHERE type='table'"))
print('PASS: isolation, idempotency, limits, lifecycle and immutable receipts')
`;
 const result=spawnSync('python3',['-c',script,schema],{encoding:'utf8',timeout:15000});
 assert.equal(result.status,0,result.stderr||result.error?.message);
 assert.match(result.stdout,/PASS: isolation/);
});
