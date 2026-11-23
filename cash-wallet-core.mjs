/**
 * QuantaPhi Cash Wallet source contract.
 *
 * Financial balances must come from an authenticated, regulated provider-backed
 * server. This module makes no payment, account mutation, custody or receipt claim.
 * Boolean inputs represent facts to be independently established by a TRUSTED
 * server; no client may turn them into authorization or settled dollars.
 * Existing Quants / Infinity / Star Coin / coupon ledgers are never touched.
 */
export const CASH_WALLET_CURRENCY='USD';
const cents=n=>Number.isSafeInteger(n)&&n>=0;
const result=(status,message,extra={})=>Object.freeze({status,message,canStartPayment:false,canCreditBalance:false,canCharge:false,...extra});

export function parseUsdCents(input){
 if(typeof input!=='string'||!/^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,2})?$/.test(input))return null;
 const [dollars,pennies='']=input.split('.');
 const total=Number(dollars)*100+Number(pennies.padEnd(2,'0')||'0');
 return Number.isSafeInteger(total)&&total>=1&&total<=99_999_999?total:null;
}

export function displayCashAmount(value){
 if(!cents(value))return '—';
 return '$'+Math.trunc(value/100).toLocaleString('en-US')+'.'+String(value%100).padStart(2,'0');
}

/** UI rendering only. Never accepts browser balances as proof or spends funds. */
export function readCashWalletSnapshot(raw){
 const unavailable=Object.freeze({status:'not_connected',currency:'USD',availableCents:null,pendingCents:null,display:'—'});
 if(!raw||raw.authenticated!==true||raw.providerStatus!=='ready'||raw.currency!=='USD'
    ||!cents(raw.availableCents)||!cents(raw.pendingCents))return unavailable;
 return Object.freeze({
  status:'connected',currency:'USD',availableCents:raw.availableCents,
  pendingCents:raw.pendingCents,display:displayCashAmount(raw.availableCents)
 });
}

/** A preflight result, not authority to create a deposit or credit money. */
export function assessCashWalletFunding({amount,authenticated=false,providerReady=false,limitCents=null}={}){
 const value=parseUsdCents(amount);
 if(value===null)return result('invalid_amount','Enter a positive USD amount with no more than two decimal places.');
 if(providerReady!==true)return result('processor_unavailable','Cash loads are not active. A regulated funding partner and merchant account are required.',{cents:value});
 if(authenticated!==true)return result('sign_in_required','Sign in to the verified cash account before starting a deposit.',{cents:value});
 if(!cents(limitCents)||limitCents<=0)return result('limit_unavailable','Provider-set funding limits have not been verified.',{cents:value});
 if(value>limitCents)return result('over_limit','Requested amount exceeds the provider-approved funding limit.',{cents:value});
 return result('eligible_for_partner_checkout','Eligible to request a server-created provider checkout. Funds remain pending until independently verified settlement.',{cents:value});
}

/** Eligibility advice only; actual checkout must be authorized atomically by the server. */
export function assessCashWalletSpending({
 amountCents,availableCents,authenticated=false,merchantConnected=false,approved=false
}={}){
 if(authenticated!==true)return result('sign_in_required','A verified signed-in cash account is required.');
 if(merchantConnected!==true)return result('merchant_not_connected','This merchant has not been approved for QuantaPhi Cash Wallet payments.');
 if(!Number.isSafeInteger(amountCents)||amountCents<=0)return result('invalid_quote','A server-confirmed positive USD price is required.');
 if(!cents(availableCents))return result('balance_unverified','The server-verified available cash balance is missing.');
 if(amountCents>availableCents)return result('insufficient_funds','Not enough settled available cash for this purchase.');
 if(approved!==true)return result('approval_required','Review the full order and explicitly authorize this payment.');
 return result('ready_for_server_authorization','Requires a separate authenticated and idempotent server reservation, provider acceptance and merchant receipt. No money has moved.');
}
