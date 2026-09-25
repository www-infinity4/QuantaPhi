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
      "SELECT wallet_id FROM quant_wallets WHERE user_id=?"
    ).bind(identity.user_id).first();
    if (!senderWallet) {
      const newWalletId = "qw_" + crypto.randomUUID();
      await env.DB.prepare(
        "INSERT OR IGNORE INTO quant_wallets(wallet_id,user_id) VALUES(?,?)"
      ).bind(newWalletId, identity.user_id).run();
      senderWallet = await env.DB.prepare(
        "SELECT wallet_id FROM quant_wallets WHERE user_id=?"
      ).bind(identity.user_id).first();
    }
    if (!senderWallet) return json({ error: "quant_wallet_create_failed" }, 500);
    const wallet = senderWallet.wallet_id;

    if (url.pathname === "/v1/quants/mint" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const sourceKey = String(body.source_key || "").trim().slice(0, 200);
      const queryText = String(body.query_text || "").trim().slice(0, 500);
      if (!sourceKey || !queryText) return json({ error: "invalid_mint" }, 400);

      const prior = await env.DB.prepare(
        "SELECT mint_id,provenance_hash,source_key,query_text,amount,created_at FROM quant_mints WHERE source_key=?"
      ).bind(sourceKey).first();
      if (prior) return json({ ok: true, replayed: true, mint: prior });

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
            "INSERT INTO quant_ledger_entries(entry_id,reference_id,entry_type,wallet_id,delta) VALUES(?,?,\'mint\',?,1)"
          ).bind(entryId, mintId, wallet)
        ]);
      } catch {
        const existing = await env.DB.prepare(
          "SELECT mint_id,provenance_hash,source_key,query_text,amount,created_at FROM quant_mints WHERE source_key=?"
        ).bind(sourceKey).first();
        if (existing) return json({ ok: true, replayed: true, mint: existing });
        return json({ error: "mint_failed" }, 409);
      }

      return json({ ok: true, replayed: false, mint_id: mintId, provenance_hash: provenanceHash, source_key: sourceKey, amount: 1 }, 201);
    }

    if (url.pathname === "/v1/quants/state" && request.method === "GET") {
      const found = await env.DB.prepare(
        "SELECT wallet_id FROM quant_wallets WHERE wallet_id=?"
      ).bind(wallet).first();
      if (!found) return json({ error: "wallet_not_found" }, 404);
      const row = await env.DB.prepare(
        "SELECT COALESCE(SUM(delta),0) balance FROM quant_ledger_entries WHERE wallet_id=?"
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
        "SELECT wallet_id FROM quant_wallets WHERE wallet_id=?"
      ).bind(wallet).first();
      const receiver = await env.DB.prepare(
        "SELECT wallet_id FROM quant_wallets WHERE wallet_id=?"
      ).bind(recipient).first();
      if (!sender || !receiver) return json({ error: "wallet_not_found" }, 404);

      const prior = await env.DB.prepare(
        "SELECT transfer_id,sender_wallet_id,recipient_wallet_id,amount,status,created_at FROM quant_transfers WHERE sender_wallet_id=? AND idempotency_key=?"
      ).bind(wallet, key).first();
      if (prior) return json({ ok: true, replayed: true, transfer: prior });

      const balance = await env.DB.prepare(
        "SELECT COALESCE(SUM(delta),0) balance FROM quant_ledger_entries WHERE wallet_id=?"
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
