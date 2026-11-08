/**
 * Infinity Cash / Bubbles allowance evidence gates — SOURCE-ONLY, NO MONEY MOVEMENT.
 *
 * A digital transfer reference, signature or ACH intent is a pointer to evidence,
 * not USD or permission to spend. Real multi-merchant stored USD requires licensed
 * partner custody, recipient matching, settlement, reversals, and bank reconciliation.
 * This module intentionally cannot credit balances, make investments or move cash.
 */
const blank=(status,reason,extra={})=>Object.freeze({
 status,reason,currency:'USD',amountCents:null,
 canCreditCashWallet:false,canSpend:false,canTransfer:false,...extra
});
export function assessExternalUsdReceipt(input={}){
 if(!Number.isSafeInteger(input?.amountCents)||input.amountCents<=0||input.amountCents>100000000){
  return blank('invalid_amount','A verified positive USD transfer amount is required.');
 }
 if(input.currency!=='USD')return blank('unsupported_currency','Only a provider-approved USD program may be evaluated.');
 const money={amountCents:input.amountCents};
 if(typeof input.providerReference!=='string'||input.providerReference.length<6||
    input.signatureVerified!==true||input.merchantMatched!==true){
  return blank('unverified_reference','A transfer reference or key alone is not proof of funds received.',money);
 }
 if(input.providerStatus!=='settled'){
  return blank('pending_settlement','A signed initiated or pending transfer cannot fund spendable USD.',money);
 }
 if(input.licensedProgramApproved!==true||input.reconciled!==true){
  return blank('provider_reconciliation_required','Provider custody, regulatory scope and bank reconciliation remain unverified.',money);
 }
 if(input.reversalPending===true||input.disputePending===true){
  return blank('funds_on_hold','Returned or disputed funds cannot be made spendable.',money);
 }
 return blank('awaiting_authorized_backend_ledger',
  'Only a reviewed licensed provider-backed server can post a matched settled USD journal entry.',money);
}
export function assessBubblesCashAllowance(input={}){
 const safe=Number.isSafeInteger(input?.requestedCents)&&input.requestedCents>0;
 return Object.freeze({
  status:'server_authorization_required',
  canMoveMoney:false,canInvestFunds:false,canPromiseReturns:false,
  amountCents:safe?input.requestedCents:null,
  reason:'Bubbles may draft legitimate purchase or business plans, not move, gamble, invest, borrow or promise profits from USD without explicit owner/provider-authorized transaction controls.'
 });
}
