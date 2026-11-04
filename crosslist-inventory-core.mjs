/*
 * Cross-marketplace sale reconciliation CONTRACT, not a sale executor.
 * Call only after a SERVER-side verified paid-order receipt and tenant/sku
 * matching. None of these plans posts, withdraws or changes a listing.
 * All action receipts must be persisted before retries or public claims.
 */
export const CROSSLIST_MARKETPLACES=Object.freeze([
 Object.freeze({id:'ebay',name:'eBay',requiresUserOAuth:true,nativeSync:true,mode:'authorized_sell_inventory_api',ready:false}),
 Object.freeze({id:'etsy',name:'Etsy',requiresUserOAuth:true,nativeSync:true,mode:'approved_open_api_v3',ready:false}),
 Object.freeze({id:'mercari',name:'Mercari US',requiresUserOAuth:false,nativeSync:false,mode:'merchant_import_manual',ready:false}),
 Object.freeze({id:'poshmark',name:'Poshmark',requiresUserOAuth:false,nativeSync:false,mode:'manual_only_until_approved',ready:false})
]);
const id=v=>typeof v==='string'&&v.length>0&&v.length<=150&&/^[a-zA-Z0-9_.:-]+$/.test(v);
const int=v=>Number.isSafeInteger(v)&&v>=1&&v<=1e6;
/**
 * This function ONLY assembles a plan from a server-verified event. The caller
 * must verify provider webhook signature, linked account, order payment state,
 * line-item SKU, replay protection and inventory ownership independently.
 * Plans must be turned into idempotent durable jobs by an authorized backend.
 */
export function planCrosslistSale({sale,listings,proof,enabledAdapters=[]}={}){
 const empty={status:'unverified',actions:[]};
 if(!sale||!id(sale.provider)||!id(sale.orderId)||!id(sale.sku)||!int(sale.quantity)||
    sale.status!=='paid'||!proof||proof.verifiedBy!=='server'||
    proof.provider!==sale.provider||proof.orderId!==sale.orderId||
    !Array.isArray(listings)||!Array.isArray(enabledAdapters))return empty;
 const actions=[],seen=new Set();
 for(const row of listings){
  if(!row||row.sku!==sale.sku||row.provider===sale.provider||row.status!=='active'||
   !id(row.provider)||!id(row.listingId)||!int(row.quantity))continue;
  const target=CROSSLIST_MARKETPLACES.find(p=>p.id===row.provider);
  if(!target)continue;
  const key=[sale.provider,sale.orderId,row.provider,row.listingId].join(':');
  if(seen.has(key))continue;seen.add(key);
  const quantity=Math.max(0,row.quantity-sale.quantity);
  const automation=target.nativeSync&&enabledAdapters.includes(row.provider);
  const action=quantity===0?'withdraw':'set_quantity';
  actions.push(Object.freeze({
   key,provider:row.provider,listingId:row.listingId,sku:sale.sku,action,
   ...(action==='set_quantity'?{quantity}:{}),
   status:automation?'requires_server_execution':'manual_follow_up'
  }));
 }
 return {status:'planned',actions};
}
