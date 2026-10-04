async function ensureResearchRevisions(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS quanta_research_revisions(revision_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,search_id TEXT NOT NULL,token_id TEXT NOT NULL,data_json TEXT NOT NULL,created_at INTEGER NOT NULL)").run();
}

async function ensureStarCoinCredits(env) {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS quanta_star_coin_credits(credit_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,wallet_id TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('collect','share')),reference_id TEXT NOT NULL,reference TEXT NOT NULL,tenths INTEGER NOT NULL DEFAULT 1,client_created_at TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,UNIQUE(user_id,reference_id))"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_star_coin_credits_user_created ON quanta_star_coin_credits(user_id,created_at)")
  ]);
}
async function ensureCollects(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS quant_collects(collect_id TEXT PRIMARY KEY,wallet_id TEXT NOT NULL,content_key TEXT NOT NULL,type TEXT,title TEXT NOT NULL,story TEXT,media TEXT,source_url TEXT,collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(wallet_id,content_key))").run();
}
function collectRow(body) {
  return {
    key: String(body?.key || "").trim().slice(0, 700),
    type: String(body?.type || "").trim().slice(0, 40),
    title: String(body?.title || "").trim().slice(0, 500),
    story: String(body?.story || "").trim().slice(0, 4000),
    media: String(body?.media || "").trim().slice(0, 2000),
    sourceUrl: String(body?.sourceUrl || "").trim().slice(0, 2000)
  };
}
function upsertCollect(env, wallet, card) {
  return env.DB.prepare("INSERT INTO quant_collects(collect_id,wallet_id,content_key,type,title,story,media,source_url) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(wallet_id,content_key) DO UPDATE SET type=excluded.type,title=excluded.title,story=excluded.story,media=excluded.media,source_url=excluded.source_url,collected_at=CURRENT_TIMESTAMP")
    .bind("qc_" + crypto.randomUUID(), wallet, card.key, card.type, card.title, card.story, card.media, card.sourceUrl);
}
async function starCoinState(env, user, limit = 500) {
  const totals = await env.DB.prepare("SELECT COALESCE(SUM(tenths),0) AS tenths,COALESCE(SUM(kind='collect'),0) AS collects,COALESCE(SUM(kind='share'),0) AS shares FROM quanta_star_coin_credits WHERE user_id=?").bind(user).first();
  const history = await env.DB.prepare("SELECT reference_id,kind,reference,tenths,client_created_at,created_at FROM quanta_star_coin_credits WHERE user_id=? ORDER BY created_at DESC LIMIT ?").bind(user, limit).all();
  const tenths = Number(totals?.tenths || 0);
  return { ok: true, credits_tenths: tenths, star_coins: Math.floor(tenths / 10), progress: tenths % 10, collects: Number(totals?.collects || 0), shares: Number(totals?.shares || 0), history: history.results || [] };
}

async function ensureSearchOutbox(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS quanta_search_outbox(user_id TEXT NOT NULL,search_id TEXT NOT NULL,wallet_id TEXT NOT NULL,query_text TEXT NOT NULL,credit_query TEXT NOT NULL,client_created_at TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'PENDING',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,search_id))").run();
}
async function recordSearchFailure(env,item,error) {
  await env.DB.prepare("UPDATE quanta_search_outbox SET attempts=attempts+1,last_error=?,updated_at=? WHERE user_id=? AND search_id=? AND status='PENDING'").bind(String(error?.message||error).slice(0,500),Date.now(),item.user_id,item.search_id).run();
}
async function commitSearchPair(env,item) {
  const {user_id:user,wallet_id:wallet,search_id:searchId,query_text:query,credit_query:creditQuery}=item, now=Date.now();
  const sourceKey='initial-search:'+wallet+':'+searchId;
  const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
  const quantHash=await hash(wallet+'\n'+sourceKey+'\n'+query);
  const data={query:creditQuery,search_id:searchId,source:'QUANTAPHI',...(item.client_created_at?{created_at:item.client_created_at}:{})};
  const infinityHash=await hash(JSON.stringify({userId:user,type:'INFINITY_SEARCH',source:'QUANTAPHI',idempotencyKey:'quant-search:'+searchId,data}));
  const priorMint=await env.DB.prepare("SELECT mint_id FROM quant_mints WHERE source_key=?").bind(sourceKey).first();
  const priorToken=await env.DB.prepare("SELECT token_id FROM unified_token_records WHERE user_id=? AND token_type='INFINITY_SEARCH' AND json_extract(data_json,'$.search_id')=? LIMIT 1").bind(user,searchId).first();
  const mintId=priorMint?.mint_id||'qm_'+quantHash.slice(0,32), tokenId=priorToken?.token_id||'ut_'+infinityHash.slice(0,32);
  const infinityEvent='mint:'+user+':quant-search:'+searchId, quantEvent='quant-mint:'+user+':'+searchId;
  const metadata=JSON.stringify({source:'QUANTAPHI',search_id:searchId,query:creditQuery});
  // Every balance change, provenance record and history event shares this D1 transaction.
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO unified_wallet_state(user_id,created_at,updated_at) VALUES(?,?,?)").bind(user,now,now),
    env.DB.prepare("INSERT OR IGNORE INTO quant_mints(mint_id,wallet_id,provenance_hash,source_key,query_text,amount) VALUES(?,?,?,?,?,1)").bind(mintId,wallet,quantHash,sourceKey,query),
    env.DB.prepare("INSERT INTO quant_ledger_entries(entry_id,reference_id,entry_type,wallet_id,delta) SELECT ?,?,'mint',?,1 WHERE NOT EXISTS(SELECT 1 FROM quant_ledger_entries WHERE reference_id=? AND entry_type='mint')").bind('qe_'+quantHash.slice(0,32),mintId,wallet,mintId),
    env.DB.prepare("INSERT OR IGNORE INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) VALUES(?,?,'INFINITY_SEARCH','QUANTAPHI',?,?,?)").bind(tokenId,user,JSON.stringify(data),infinityHash,now),
    env.DB.prepare("UPDATE unified_wallet_state SET infinity_balance=infinity_balance+?,updated_at=? WHERE user_id=? AND NOT EXISTS(SELECT 1 FROM unified_wallet_events WHERE idempotency_key=?)").bind(priorToken?0:1,now,user,infinityEvent),
    env.DB.prepare("INSERT OR IGNORE INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) SELECT ?,?,?,'INFINITY','MINT',?,infinity_balance,?,?,? FROM unified_wallet_state WHERE user_id=?").bind('uwe_'+crypto.randomUUID(),infinityEvent,user,priorToken?0:1,tokenId,metadata,now,user),
    env.DB.prepare("INSERT OR IGNORE INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) SELECT ?,?,?,'QUANT','MINT',1,balance,?,?,? FROM quant_wallet_balances WHERE wallet_id=?").bind('uwe_'+crypto.randomUUID(),quantEvent,user,mintId,metadata,now,wallet),
    env.DB.prepare("INSERT INTO quanta_search_journal(search_id,user_id,wallet_id,query_text,status,quant_mint_id,infinity_token_id,created_at,updated_at) VALUES(?,?,?,?,'COMMITTED',?,?,?,?) ON CONFLICT(search_id) DO UPDATE SET status='COMMITTED',quant_mint_id=excluded.quant_mint_id,infinity_token_id=excluded.infinity_token_id,updated_at=excluded.updated_at WHERE quanta_search_journal.user_id=excluded.user_id").bind(searchId,user,wallet,creditQuery,mintId,tokenId,item.created_at,now),
    env.DB.prepare("UPDATE quanta_search_outbox SET status='COMMITTED',last_error=NULL,updated_at=? WHERE user_id=? AND search_id=?").bind(now,user,searchId)
  ]);
  const quant=await env.DB.prepare("SELECT balance FROM quant_wallet_balances WHERE wallet_id=?").bind(wallet).first();
  const infinity=await env.DB.prepare("SELECT infinity_balance FROM unified_wallet_state WHERE user_id=?").bind(user).first();
  return {ok:true,mint_id:mintId,source_key:sourceKey,provenance_hash:quantHash,amount:1,balance:Number(quant.balance),infinity:{token_id:tokenId,balance:Number(infinity.infinity_balance)}};
}
async function drainSearchOutbox(env) {
  await ensureSearchOutbox(env);
  const pending=await env.DB.prepare("SELECT * FROM quanta_search_outbox WHERE status='PENDING' ORDER BY created_at LIMIT 50").all();
  for(const item of pending.results||[]) {
    try {await commitSearchPair(env,item)}catch(error){await recordSearchFailure(env,item,error)}
  }
}

async function ensureLegacyOverdraftTrigger(env) {
  if (!env.DB) return;
  const row = await env.DB.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name='quant_no_overdraft'").first();
  if (row?.sql && row.sql.includes('quant_legacy_migrations')) return;
  await env.DB.prepare("DROP TRIGGER IF EXISTS quant_no_overdraft").run();
  await env.DB.prepare("CREATE TRIGGER quant_no_overdraft BEFORE INSERT ON quant_ledger_entries WHEN NEW.delta<0 BEGIN SELECT RAISE(ABORT,'insufficient_quant_balance') WHERE (SELECT COALESCE(SUM(delta),0) FROM quant_ledger_entries WHERE wallet_id=NEW.wallet_id) + (SELECT COALESCE(legacy_amount,0) FROM quant_legacy_migrations WHERE wallet_id=NEW.wallet_id) + NEW.delta < 0; END").run();
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(drainSearchOutbox(env)); },
  async fetch(request, env, ctx) {
    await ensureLegacyOverdraftTrigger(env);
    if(ctx?.waitUntil)ctx.waitUntil(drainSearchOutbox(env));
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = ["https://quantaphi.org", "https://www.quantaphi.org", "https://www-infinity4.github.io", "https://quantaphi.net", "https://www.quantaphi.net"].includes(origin) ? origin : "";
    const headers = {
      "content-type": "application/json",
      ...(allowedOrigin ? { "access-control-allow-origin": allowedOrigin, "vary": "Origin" } : {}),
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS"
    };
    const json = (value, status = 200) =>
      new Response(JSON.stringify(value), { status, headers });

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return new Response(null, { status: 403, headers });
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === "/health")
      return json({ ok: true, service: "quanta-phi-ledger" });

    if (origin && !allowedOrigin) return json({ error: "origin_not_allowed" }, 403);

    const authorization = request.headers.get("Authorization") || "";
    const match = /^Bearer\s+(sq_[A-Za-z0-9_-]{32,})$/.exec(authorization);
    if (!match) return json({ error: "authorization_required" }, 401);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(match[1]));
    const tokenHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const identity = await env.IDENTITY_DB.prepare(
      "SELECT a.id AS user_id FROM accounts a JOIN account_devices d ON d.account_id=a.id WHERE d.token_hash=?"
    ).bind(tokenHash).first();
    if (!identity) return json({ error: "invalid_device_token" }, 401);
    let senderWallet = await env.DB.prepare(
      "SELECT wallet_id,status FROM quant_wallets WHERE user_id=?"
    ).bind(identity.user_id).first();
    if (!senderWallet) {
      const newWalletId = "qw_" + crypto.randomUUID();
      await env.DB.prepare(
        "INSERT OR IGNORE INTO quant_wallets(wallet_id,user_id) VALUES(?,?)"
      ).bind(newWalletId, identity.user_id).run();
      senderWallet = await env.DB.prepare(
        "SELECT wallet_id,status FROM quant_wallets WHERE user_id=?"
      ).bind(identity.user_id).first();
    }
    if (!senderWallet) return json({ error: "quant_wallet_create_failed" }, 500);
    if (senderWallet.status !== "active") return json({ error: "wallet_disabled" }, 403);
    const wallet = senderWallet.wallet_id;

    if (url.pathname === "/v1/quants/research" && request.method === "POST") {
      const body=await request.json().catch(()=>({})),searchId=String(body.search_id||'');
      const journal=await env.DB.prepare("SELECT infinity_token_id FROM quanta_search_journal WHERE user_id=? AND search_id=? AND status='COMMITTED'").bind(identity.user_id,searchId).first();
      if(!journal?.infinity_token_id)return json({error:'search_not_committed'},409);
      const data=body.research;
      if(!data||typeof data!=='object'||JSON.stringify(data).length>100000)return json({error:'invalid_research_revision'},400);
      await ensureResearchRevisions(env);
      const raw=JSON.stringify(data),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity.user_id+'\n'+searchId+'\n'+raw));
      const revisionId=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      await env.DB.prepare("INSERT OR IGNORE INTO quanta_research_revisions(revision_id,user_id,search_id,token_id,data_json,created_at) VALUES(?,?,?,?,?,?)").bind(revisionId,identity.user_id,searchId,journal.infinity_token_id,raw,Date.now()).run();
      return json({ok:true,revision_id:revisionId});
    }
    if (url.pathname === "/v1/quants/history" && request.method === "GET") {
      await ensureResearchRevisions(env);
      const searches = await env.DB.prepare("SELECT search_id,query_text,status,quant_mint_id,infinity_token_id,created_at FROM quanta_search_journal WHERE user_id=? ORDER BY created_at DESC LIMIT 1000").bind(identity.user_id).all();
      const tokens = await env.DB.prepare("SELECT t.token_id,t.source,t.data_json,t.created_at,(SELECT r.data_json FROM quanta_research_revisions r WHERE r.token_id=t.token_id AND r.user_id=t.user_id ORDER BY r.created_at DESC LIMIT 1) AS research_json FROM unified_token_records t WHERE t.user_id=? AND t.token_type='INFINITY_SEARCH' ORDER BY t.created_at DESC LIMIT 1000").bind(identity.user_id).all();
      return json({ ok:true, searches:searches.results, tokens:tokens.results });
    }

    if (url.pathname === "/v1/quants/search" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const query = String(body.query || "").trim().replace(/\s+/g, " ").slice(0,500);
      const creditQuery = String(body.credit_query || query).trim().replace(/\s+/g," ").slice(0,500);
      const searchId = String(body.search_id || "").trim();
      if (!query || !/^[A-Za-z0-9_-]{20,100}$/.test(searchId)) return json({error:"invalid_initial_search"},400);
      await ensureSearchOutbox(env);
      const prior = await env.DB.prepare("SELECT user_id,query_text FROM quanta_search_journal WHERE search_id=?").bind(searchId).first();
      if (prior && (prior.user_id !== identity.user_id || prior.query_text !== creditQuery)) return json({error:"search_id_conflict"},409);
      const now=Date.now();
      await env.DB.prepare("INSERT OR IGNORE INTO quanta_search_outbox(user_id,search_id,wallet_id,query_text,credit_query,client_created_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,'PENDING',?,?)")
        .bind(identity.user_id,searchId,wallet,query,creditQuery,String(body.created_at||'').slice(0,80),now,now).run();
      const item=await env.DB.prepare("SELECT * FROM quanta_search_outbox WHERE user_id=? AND search_id=?").bind(identity.user_id,searchId).first();
      if (item.credit_query!==creditQuery) return json({error:"search_id_conflict"},409);
      try {
        const result=await commitSearchPair(env,item);
        return json({...result,replayed:Boolean(prior),journal:{search_id:searchId,status:"COMMITTED"}});
      } catch(error) {
        await recordSearchFailure(env,item,error);
        return json({ok:false,error:"search_commit_pending",search_id:searchId,durable_pending:true},503);
      }
    }

    if (url.pathname === "/v1/quants/infinity-legacy-balance" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const amount = Number(body.legacy_balance);
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000000)
        return json({ error: "invalid_legacy_infinity_balance" }, 400);
      const eventKey = "legacy-infinity-balance:" + identity.user_id;
      const prior = await env.DB.prepare(
        "SELECT event_id,balance_after,created_at FROM unified_wallet_events WHERE idempotency_key=?"
      ).bind(eventKey).first();
      if (prior) return json({ ok: true, replayed: true, balance: Number(prior.balance_after || 0) });
      await env.DB.prepare("INSERT OR IGNORE INTO unified_wallet_state(user_id,created_at,updated_at) VALUES(?,?,?)")
        .bind(identity.user_id, Date.now(), Date.now()).run();
      const current = await env.DB.prepare(
        "SELECT infinity_balance FROM unified_wallet_state WHERE user_id=?"
      ).bind(identity.user_id).first();
      // This is a one-time floor restoration, not a mint. A newer paired search
      // must not prevent an older owned Infinity balance from being recovered.
      // The idempotency key above makes reload/retry harmless.
      const before = Number(current?.infinity_balance || 0), next = Math.max(before, amount), now = Date.now();
      await env.DB.batch([
        env.DB.prepare("UPDATE unified_wallet_state SET infinity_balance=?,updated_at=? WHERE user_id=?")
          .bind(next, now, identity.user_id),
        env.DB.prepare("INSERT INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) VALUES(?,?,?,'INFINITY','IMPORT',?,?,?,?,?)")
          .bind("uwe_" + crypto.randomUUID(), eventKey, identity.user_id, Math.max(0, next - before), next, "legacy-browser-balance", JSON.stringify({ source: "QUANTAPHI", reason: "balance_only_migration" }), now)
      ]);
      return json({ ok: true, replayed: false, balance: next, imported: Math.max(0, next - before) }, 201);
    }

    if (url.pathname === "/v1/quants/history-import" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const tokens = Array.isArray(body.tokens) ? body.tokens.slice(0, 500) : [];
      const searches = Array.isArray(body.searches) ? body.searches.slice(0, 1000) : [];
      let tokenCount = 0, searchCount = 0;
      for (const item of tokens) {
        const localId = String(item?.id || "").trim().slice(0, 180);
        const query = String(item?.query || "").trim().replace(/\s+/g, " ").slice(0, 500);
        if (!localId || !query) continue;
        const source = String(item?.source || "QUANTAPHI").trim().slice(0, 120) || "QUANTAPHI";
        const sourceEventId = String(item?.source_event_id || "").trim().slice(0, 180);
        const websiteUrl = String(item?.website_url || "").trim().slice(0, 2000);
        const created = Number(item?.created_at);
        const createdAt = Number.isFinite(created) && created > 0 ? Math.trunc(created) : Date.now();
        const canonical = "legacy-history\n" + identity.user_id + "\n" + localId;
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
        const tokenId = "hist_" + hash.slice(0, 32);
        const data = { query, local_token_id: localId, source_event_id: sourceEventId, website_url: websiteUrl, imported_history: true };
        const result = await env.DB.prepare(
          "INSERT OR IGNORE INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) VALUES(?,?,'INFINITY_SEARCH',?,?,?,?)"
        ).bind(tokenId, identity.user_id, source, JSON.stringify(data), hash, createdAt).run();
        if (Number(result?.meta?.changes || 0) > 0) tokenCount++;
      }
      for (const item of searches) {
        const historyId = String(item?.id || "").trim().slice(0, 180);
        const query = String(item?.query || "").trim().replace(/\s+/g, " ").slice(0, 500);
        if (!historyId || !query || historyId.startsWith("archive:")) continue;
        const created = Number(item?.created_at);
        const createdAt = Number.isFinite(created) && created > 0 ? Math.trunc(created) : Date.now();
        const searchId = "archive:" + identity.user_id.slice(0, 24) + ":" + historyId;
        const result = await env.DB.prepare(
          "INSERT OR IGNORE INTO quanta_search_journal(search_id,user_id,wallet_id,query_text,status,quant_mint_id,infinity_token_id,created_at,updated_at) VALUES(?,?,?,?, 'ARCHIVED', NULL, NULL, ?, ?)"
        ).bind(searchId, identity.user_id, wallet, query, createdAt, Date.now()).run();
        if (Number(result?.meta?.changes || 0) > 0) searchCount++;
      }
      return json({ ok: true, imported_tokens: tokenCount, imported_searches: searchCount });
    }

    if (url.pathname === "/v1/quants/legacy-migrate" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const amount = Number(body.legacy_amount);
      if (!Number.isSafeInteger(amount) || amount < 0) return json({ error: "invalid_legacy_amount" }, 400);
      const prior = await env.DB.prepare(
        "SELECT migration_id,wallet_id,legacy_amount,provenance_hash,created_at FROM quant_legacy_migrations WHERE wallet_id=?"
      ).bind(wallet).first();
      if (prior) return json({ ok: true, replayed: true, migration: prior });
      const material = "legacy-quanta-phi-v1\n" + wallet + "\n" + String(amount);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
      const provenanceHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
      const migrationId = "qlm_" + crypto.randomUUID();
      try {
        await env.DB.prepare(
          "INSERT INTO quant_legacy_migrations(migration_id,wallet_id,legacy_amount,provenance_hash) VALUES(?,?,?,?)"
        ).bind(migrationId, wallet, amount, provenanceHash).run();
      } catch {
        const existing = await env.DB.prepare(
          "SELECT migration_id,wallet_id,legacy_amount,provenance_hash,created_at FROM quant_legacy_migrations WHERE wallet_id=?"
        ).bind(wallet).first();
        if (existing) return json({ ok: true, replayed: true, migration: existing });
        return json({ error: "legacy_migration_failed" }, 409);
      }
      return json({ ok: true, replayed: false, migration_id: migrationId, wallet_id: wallet, legacy_amount: amount, provenance_hash: provenanceHash }, 201);
    }

    if (url.pathname === "/v1/quants/receive" && request.method === "GET") {
      const found = await env.DB.prepare(
        "SELECT wallet_id,status,created_at FROM quant_wallets WHERE wallet_id=? AND status='active'"
      ).bind(wallet).first();
      if (!found) return json({ error: "wallet_not_found" }, 404);
      return json({
        ok: true,
        wallet_id: found.wallet_id,
        status: found.status,
        created_at: found.created_at
      });
    }

    if (url.pathname === "/v1/quants/collects" && request.method === "POST") {
      const card = collectRow(await request.json().catch(() => ({})));
      if (!card.key || !card.title) return json({ error: "invalid_collect" }, 400);
      await ensureCollects(env);
      await upsertCollect(env, wallet, card).run();
      return json({ ok: true, key: card.key }, 201);
    }

    if (url.pathname === "/v1/quants/collects" && request.method === "GET") {
      await ensureCollects(env);
      const rows = await env.DB.prepare("SELECT content_key AS key,type,title,story,media,source_url AS sourceUrl,collected_at AS collectedAt FROM quant_collects WHERE wallet_id=? ORDER BY collected_at DESC LIMIT 50").bind(wallet).all();
      return json({ ok: true, cards: rows.results || [] });
    }

    // Star Coin receipts from QuantaPhi Collect and Share buttons. Each receipt is
    // +0.1 Star Coin, recorded once per account and reference so retries are harmless.
    if (url.pathname === "/v1/quants/star-coins" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const credits = Array.isArray(body.credits) ? body.credits.slice(0, 100) : [];
      if (!credits.length) return json({ error: "invalid_star_coin_credits" }, 400);
      await ensureStarCoinCredits(env);
      await ensureCollects(env);
      const now = Date.now(), accepted = [], statements = [];
      for (const item of credits) {
        const kind = item?.kind === "share" ? "share" : item?.kind === "collect" ? "collect" : "";
        const referenceId = String(item?.reference_id || "").trim().slice(0, 800);
        if (!kind || !referenceId.startsWith("quantaphi:" + kind + ":")) continue;
        const reference = String(item?.reference || referenceId).trim().slice(0, 800);
        const createdAt = String(item?.created_at || "").slice(0, 80);
        statements.push(env.DB.prepare("INSERT OR IGNORE INTO quanta_star_coin_credits(credit_id,user_id,wallet_id,kind,reference_id,reference,tenths,client_created_at,created_at) VALUES(?,?,?,?,?,?,1,?,?)")
          .bind("qsc_" + crypto.randomUUID(), identity.user_id, wallet, kind, referenceId, reference, createdAt, now));
        const card = kind === "collect" && item?.card && typeof item.card === "object" ? collectRow(item.card) : null;
        if (card?.key && card.title) statements.push(upsertCollect(env, wallet, card));
        accepted.push(referenceId);
      }
      if (!statements.length) return json({ error: "invalid_star_coin_credits" }, 400);
      await env.DB.batch(statements);
      return json({ ...(await starCoinState(env, identity.user_id, 50)), accepted }, 201);
    }

    if (url.pathname === "/v1/quants/star-coins" && request.method === "GET") {
      await ensureStarCoinCredits(env);
      return json(await starCoinState(env, identity.user_id));
    }

    if (url.pathname.startsWith("/v1/music-quants")) {
      await env.DB.batch([
        env.DB.prepare("CREATE TABLE IF NOT EXISTS music_quants(quant_id TEXT PRIMARY KEY,owner_wallet_id TEXT NOT NULL,provenance_hash TEXT NOT NULL UNIQUE,payload_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
        env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_music_quants_owner ON music_quants(owner_wallet_id,status,created_at)"),
        env.DB.prepare("CREATE TABLE IF NOT EXISTS music_quant_transfers(transfer_id TEXT PRIMARY KEY,quant_id TEXT NOT NULL,sender_wallet_id TEXT NOT NULL,recipient_wallet_id TEXT NOT NULL,idempotency_key TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(sender_wallet_id,idempotency_key))")
      ]);

      if (url.pathname === "/v1/music-quants/sync" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const incoming = Array.isArray(body.quants) ? body.quants.slice(0, 100) : [];
        const accepted = [];
        for (const quant of incoming) {
          const quantId = String(quant?.id || "").trim();
          const provenanceHash = String(quant?.hash || "").trim().toLowerCase();
          const notes = Array.isArray(quant?.notes) ? quant.notes : [];
          const kind = quant?.kind === "listening" ? "listening" : "playable";
          const validShape = kind === "listening" ? notes.length === 0 : notes.length >= 5 && notes.length <= 15;
          if (!/^mq_[a-f0-9]{12,64}$/.test(quantId) || !/^[a-f0-9]{64}$/.test(provenanceHash) || !validShape) continue;
          const normalizedNotes = notes.map(note => ({
            name: String(note?.name || "").slice(0, 12),
            midi: Math.max(0, Math.min(127, Number(note?.midi) || 60)),
            holdMs: Math.max(40, Math.min(16000, Number(note?.holdMs) || 250)),
            offsetMs: Math.max(0, Math.min(16000, Number(note?.offsetMs) || 0)),
            onsetMs: Math.max(0, Math.min(60000, Number(note?.onsetMs) || 0)),
            group: Math.max(0, Math.min(4, Number(note?.group) || 0))
          }));
          const rawContext = quant?.context && typeof quant.context === "object" ? quant.context : {};
          const rawPlayback = rawContext?.playback && typeof rawContext.playback === "object" ? rawContext.playback : {};
          const contextEvents = Array.isArray(rawContext?.events) ? rawContext.events.slice(0, 12).map(event => ({
            action: String(event?.action || "").slice(0, 40),
            topic: String(event?.topic || "").slice(0, 180),
            channel: String(event?.channel || "").slice(0, 100),
            program: String(event?.program || "").slice(0, 180),
            page: String(event?.page || "").slice(0, 180),
            at: String(event?.at || "").slice(0, 40)
          })) : [];
          const payload = JSON.stringify({
            version: Math.max(2, Math.min(3, Number(quant?.version) || 2)),
            id: quantId,
            hash: provenanceHash,
            kind,
            notes: normalizedNotes,
            song: String(quant?.song || rawPlayback?.song || "").slice(0, 180),
            sourceUrl: String(quant?.sourceUrl || "").slice(0, 900),
            archiveItem: String(quant?.archiveItem || "").slice(0, 120),
            startedAt: String(quant?.startedAt || "").slice(0, 40),
            endedAt: String(quant?.endedAt || "").slice(0, 40),
            durationSec: Math.max(0, Math.min(86400, Number(quant?.durationSec) || 0)),
            settings: quant?.settings && typeof quant.settings === "object" ? quant.settings : {},
            assessment: Array.isArray(quant?.assessment) ? quant.assessment.slice(0,5).map(item => ({
              group: Math.max(0, Math.min(4, Number(item?.group) || 0)),
              onsetMs: Math.max(0, Math.min(60000, Number(item?.onsetMs) || 0)),
              deviationMs: Math.max(-10000, Math.min(10000, Number(item?.deviationMs) || 0)),
              grade: String(item?.grade || "").slice(0,16)
            })) : [],
            context: {
              version: 1,
              playback: {
                song: String(rawPlayback?.song || "").slice(0, 180),
                station: "Infinity Radio",
                playing: Boolean(rawPlayback?.playing),
                capturedAt: String(rawPlayback?.capturedAt || "").slice(0, 40)
              },
              events: contextEvents,
              retention: "user-owned-context"
            },
            createdAt: String(quant?.createdAt || new Date().toISOString()),
            source: kind === "listening" ? "infinity-radio-listening-quant" : "infinity-radio-music-quant"
          });
          await env.DB.prepare("INSERT OR IGNORE INTO music_quants(quant_id,owner_wallet_id,provenance_hash,payload_json) VALUES(?,?,?,?)")
            .bind(quantId, wallet, provenanceHash, payload).run();
          const owned = await env.DB.prepare("SELECT quant_id FROM music_quants WHERE quant_id=? AND owner_wallet_id=? AND status='active'")
            .bind(quantId, wallet).first();
          if (owned) accepted.push(quantId);
        }
        const countRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM music_quants WHERE owner_wallet_id=? AND status='active'").bind(wallet).first();
        return json({ ok: true, accepted, balance: Number(countRow?.count || 0) });
      }

      if (url.pathname === "/v1/music-quants/state" && request.method === "GET") {
        const rows = await env.DB.prepare("SELECT quant_id,provenance_hash,payload_json,created_at FROM music_quants WHERE owner_wallet_id=? AND status='active' ORDER BY created_at DESC LIMIT 500").bind(wallet).all();
        const quants = (rows.results || []).map(row => {
          let payload = {};
          try { payload = JSON.parse(row.payload_json); } catch {}
          return { ...payload, id: row.quant_id, hash: row.provenance_hash, cloudCreatedAt: row.created_at };
        });
        return json({ ok: true, wallet_id: wallet, balance: quants.length, quants });
      }

      if (url.pathname === "/v1/music-quants/transfer" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const quantId = String(body.quant_id || "").trim();
        const recipient = String(body.recipient_wallet_id || "").trim();
        const key = String(body.idempotency_key || "").trim();
        if (!quantId || !/^qw_[A-Za-z0-9-]{20,}$/.test(recipient) || !key) return json({ error: "invalid_music_quant_transfer" }, 400);
        if (recipient === wallet) return json({ error: "same_wallet" }, 400);
        const receiver = await env.DB.prepare("SELECT wallet_id FROM quant_wallets WHERE wallet_id=? AND status='active'").bind(recipient).first();
        if (!receiver) return json({ error: "wallet_not_found" }, 404);
        const prior = await env.DB.prepare("SELECT transfer_id,quant_id,recipient_wallet_id,status,created_at FROM music_quant_transfers WHERE sender_wallet_id=? AND idempotency_key=?").bind(wallet, key).first();
        if (prior) return json({ ok: true, replayed: true, transfer: prior });
        const owned = await env.DB.prepare("SELECT quant_id FROM music_quants WHERE quant_id=? AND owner_wallet_id=? AND status='active'").bind(quantId, wallet).first();
        if (!owned) return json({ error: "music_quant_not_owned" }, 409);
        const transferId = "mqt_" + crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare("INSERT INTO music_quant_transfers(transfer_id,quant_id,sender_wallet_id,recipient_wallet_id,idempotency_key,status) VALUES(?,?,?,?,?,'committed')").bind(transferId, quantId, wallet, recipient, key),
          env.DB.prepare("UPDATE music_quants SET owner_wallet_id=?,updated_at=CURRENT_TIMESTAMP WHERE quant_id=? AND owner_wallet_id=? AND status='active'").bind(recipient, quantId, wallet)
        ]);
        return json({ ok: true, replayed: false, transfer_id: transferId, quant_id: quantId, recipient_wallet_id: recipient });
      }

      return json({ error: "music_quant_route_not_found" }, 404);
    }

    if (url.pathname === "/v1/quants/state" && request.method === "GET") {
      const found = await env.DB.prepare(
        "SELECT wallet_id FROM quant_wallets WHERE wallet_id=? AND status='active'"
      ).bind(wallet).first();
      if (!found) return json({ error: "wallet_not_found" }, 404);
      const row = await env.DB.prepare(
        "SELECT balance FROM quant_wallet_balances WHERE wallet_id=?"
      ).bind(wallet).first();
      const infinity = await env.DB.prepare(
        "SELECT infinity_balance FROM unified_wallet_state WHERE user_id=?"
      ).bind(identity.user_id).first();
      return json({ wallet_id: wallet, balance: Number(row?.balance || 0), infinity_balance: Number(infinity?.infinity_balance || 0) });
    }

    if (url.pathname === "/v1/quants/transfer" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const recipient = String(body.recipient_wallet_id || "").trim();
      const amount = Number(body.amount);
      const key = String(body.idempotency_key || "").trim();

      if (!recipient || !Number.isSafeInteger(amount) || amount <= 0 || !key)
        return json({ error: "invalid_transfer" }, 400);
      if (recipient === wallet) return json({ error: "same_wallet" }, 400);

      const sender = await env.DB.prepare(
        "SELECT wallet_id FROM quant_wallets WHERE wallet_id=? AND status='active'"
      ).bind(wallet).first();
      const receiver = await env.DB.prepare(
        "SELECT wallet_id FROM quant_wallets WHERE wallet_id=? AND status='active'"
      ).bind(recipient).first();
      if (!sender || !receiver) return json({ error: "wallet_not_found" }, 404);

      const prior = await env.DB.prepare(
        "SELECT transfer_id,sender_wallet_id,recipient_wallet_id,amount,status,created_at FROM quant_transfers WHERE sender_wallet_id=? AND idempotency_key=?"
      ).bind(wallet, key).first();
      if (prior) return json({ ok: true, replayed: true, transfer: prior });

      const balance = await env.DB.prepare(
        "SELECT balance FROM quant_wallet_balances WHERE wallet_id=?"
      ).bind(wallet).first();
      if (Number(balance?.balance || 0) < amount)
        return json({ error: "insufficient_balance" }, 409);

      const transferId = crypto.randomUUID();
      try {
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO quant_transfers(transfer_id,sender_wallet_id,recipient_wallet_id,amount,idempotency_key,status) VALUES(?,?,?,?,?,?)"
          ).bind(transferId, wallet, recipient, amount, key, "committed"),
          env.DB.prepare(
            "INSERT INTO quant_ledger_entries(entry_id,reference_id,entry_type,wallet_id,delta) VALUES(?,?,\'transfer\',?,?)"
          ).bind(crypto.randomUUID(), transferId, wallet, -amount),
          env.DB.prepare(
            "INSERT INTO quant_ledger_entries(entry_id,reference_id,entry_type,wallet_id,delta) VALUES(?,?,\'transfer\',?,?)"
          ).bind(crypto.randomUUID(), transferId, recipient, amount)
        ]);
      } catch {
        const existing = await env.DB.prepare(
          "SELECT transfer_id,sender_wallet_id,recipient_wallet_id,amount,status,created_at FROM quant_transfers WHERE sender_wallet_id=? AND idempotency_key=?"
        ).bind(wallet, key).first();
        if (existing) return json({ ok: true, replayed: true, transfer: existing });
        return json({ error: "transfer_failed" }, 409);
      }

      return json({
        ok: true,
        replayed: false,
        transfer_id: transferId,
        sender_wallet_id: wallet,
        recipient_wallet_id: recipient,
        amount
      }, 201);
    }

    return json({ error: "not_found" }, 404);
  }
};

