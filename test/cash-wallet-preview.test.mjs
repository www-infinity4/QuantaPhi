import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('preview is a full in-card wallet, not a fake funded account or active payment',()=>{
 const html=read('cash-wallet-preview.html');
 const css=read('cash-wallet-card.css');
 const js=read('cash-wallet-card.mjs');
 assert.match(html,/class="iqc-card cash-wallet-card"/);
 assert.match(html,/data-source-ready="false"/);
 assert.match(html,/id="cashWalletAmount"/);
 assert.match(html,/id="cashWalletAvailable">—/);
 assert.match(html,/id="cashWalletPending">—/);
 assert.match(html,/disabled aria-describedby="cw-pay-status"/);
 assert.match(html,/no live deposits or payments/i);
 assert.match(js,/assessCashWalletFunding\(\{amount:amount.value\}\)/);
 assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|paymentIntent|creditBalance/);
 assert.match(css,/@media\(max-width:430px\)/);
 assert.match(css, /:focus-visible/);
});

test('cash is isolated from the live unified token rewards and existing site navigation',()=>{
 const home=read('index.html');
 const module=read('cash-wallet-core.mjs');
 assert.doesNotMatch(home,/cash-wallet-preview\.html|cash-wallet-card\.mjs/);
 assert.doesNotMatch(module,/localStorage|sessionStorage|starquest_session|unified_wallet_state/);
 const worker=read('workers/unified-wallet/worker.js');
 assert.doesNotMatch(worker,/cash_wallet_events|cash_wallet_reservations/);
});

test('draft schema enforces USD integers, replay keys, and reservation uniqueness',()=>{
 const sql=read('workers/unified-wallet/cash-wallet-schema.sql');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS cash_wallet_accounts/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS cash_wallet_events/);
 assert.match(sql,/provider_event_id TEXT UNIQUE/);
 assert.match(sql,/amount_cents INTEGER NOT NULL CHECK\(amount_cents>0\)/);
 assert.match(sql,/currency='USD'/);
 assert.match(sql,/UNIQUE\(user_id,idempotency_key,event_type\)/);
 assert.match(sql,/UNIQUE\(user_id,merchant_id,order_id\)/);
 assert.doesNotMatch(sql,/UPDATE\s+(?:quant_wallets|unified_wallet_state)|DELETE\s+FROM\s+quant_wallets/i);
});

test('release gates explicitly block funds, transfer and public rollout until partner acceptance',()=>{
 const doc=read('docs/CASH-WALLET-RELEASE-GATES.md');
 assert.match(doc,/Release decision: blocked/i);
 assert.match(doc,/provider.*webhook/i);
 assert.match(doc,/merchant.*receipt/i);
 assert.match(doc,/not live endpoints/i);
});
