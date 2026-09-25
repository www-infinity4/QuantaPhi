export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = origin === "https://www-infinity4.github.io" ? origin : "";
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
    const match = /^Bearer\\s+(sq_[A-Za-z0-9_-]{32,})$/.exec(authorization);
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

    if (url.pathname === "/v1/quants/search" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const queryText = String(body.query || "").trim().replace(/\s+/g, " ").slice(0, 500);
      const searchId = String(body.search_id || "").trim();
      if (!queryText || !/^[A-Za-z0-9_-]{20,100}$/.test(searchId))
        return json({ error: "invalid_initial_search" }, 400);

      const sourceKey = "initial-search:" + wallet + ":" + searchId;
      const prior = await env.DB.prepare(
        "SELECT mint_id,provenance_hash,source_key,query_text,amount,created_at FROM quant_mints WHERE source_key=?"
      ).bind(sourceKey).first();
      if (prior) return json({ ok: true, replayed: true, mint: prior });

      const searchURL = new URL("https://orange-brook-a2ac.marvaseater.workers.dev/search");
      searchURL.search = new URLSearchParams({ q: queryText, format: "json", categories: "general", safesearch: "1" });
      let searchResponse;
      try {
        searchResponse = await fetch(searchURL.toString(), { headers: { accept: "application/json" } });
      } catch {
        return json({ error: "search_unavailable" }, 502);
      }
      if (!searchResponse.ok) return json({ error: "search_failed" }, 502);
      const searchData = await searchResponse.json().catch(() => null);
      if (!searchData || !Array.isArray(searchData.results))
        return json({ error: "search_invalid_response" }, 502);

      const material = wallet + "\n" + sourceKey + "\n" + queryText;
      const mintDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
      const provenanceHash = Array.from(new Uint8Array(mintDigest), b => b.toString(16).padStart(2, "0")).join("");
      const mintId = "qm_" + crypto.randomUUID();
      const entryId = "qe_" + crypto.randomUUID();

      try {
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO quant_mints(mint_id,wallet_id,provenance_hash,source_key,query_text,amount) VALUES(?,?,?,?,?,1)"
          ).bind(mintId, wallet, provenanceHash, sourceKey, queryText),
          env.DB.prepare(
            "INSERT INTO quant_ledger_entries(entry_id,reference_id,entry_type,wallet_id,delta) VALUES(?,?,'mint',?,1)"
          ).bind(entryId, mintId, wallet)
        ]);
      } catch {
        const existing = await env.DB.prepare(
          "SELECT mint_id,provenance_hash,source_key,query_text,amount,created_at FROM quant_mints WHERE source_key=?"
        ).bind(sourceKey).first();
        if (existing) return json({ ok: true, replayed: true, mint: existing, search: searchData });
        return json({ error: "mint_failed" }, 409);
      }

      return json({ ok: true, replayed: false, mint_id: mintId, provenance_hash: provenanceHash, source_key: sourceKey, amount: 1, search: searchData }, 201);
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

    if (url.pathname === "/v1/quants/state" && request.method === "GET") {
      const found = await env.DB.prepare(
        "SELECT wallet_id FROM quant_wallets WHERE wallet_id=? AND status='active'"
      ).bind(wallet).first();
      if (!found) return json({ error: "wallet_not_found" }, 404);
      const row = await env.DB.prepare(
        "SELECT balance FROM quant_wallet_balances WHERE wallet_id=?"
      ).bind(wallet).first();
      return json({ wallet_id: wallet, balance: Number(row?.balance || 0) });
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
