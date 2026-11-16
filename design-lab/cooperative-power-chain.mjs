/* Infinity Cooperative Power Chain: deterministic, read-only plans and quote comparisons.
 * Existing public-index search and bulk allocator remain authoritative for their tasks.
 * No merchant auth, inventory, partner warehouse, checkout, balance state, Quant AI profile,
 * energy claim, tax determination, or transaction is established by this source.
 */
import {moneyCents,formatCents} from './bulk-allocator.mjs';
const SHOP_PURPOSES=new Set(['gift','monthly-supplies']);
const safeText=(x,max=60)=>String(x??'').trim().replace(/\s+/g,' ').slice(0,max);
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const cost=n=>integer(n,0,1000000000);
const https=u=>{try{const url=new URL(String(u));return url.protocol==='https:'&&!url.username&&!url.password&&!url.port;}catch{return false;}};
const own=Object.hasOwn;
const total=values=>values.reduce((s,v)=>{const n=s+v;if(!Number.isSafeInteger(n)||n<0)throw RangeError('Cost exceeds safe cents');return n;},0);
export function planShoppingIntent({purpose='gift',budget='1000.00',itemCount=10,maxMerchants=4,region='',recipientInterests=[]}={}){
 if(!SHOP_PURPOSES.has(purpose))throw RangeError('Unknown shopping purpose');
 const budgetCents=moneyCents(budget,'Shopping budget');
 if(budgetCents<=0)throw RangeError('Budget must be positive');
 if(!integer(Number(itemCount),1,1000)||!integer(Number(maxMerchants),1,100))throw RangeError('Invalid item or merchant count');
 if(Number(maxMerchants)>Number(itemCount))throw RangeError('Merchants cannot exceed requested items');
 const tags=Array.isArray(recipientInterests)?recipientInterests:[];
 if(tags.length>12||tags.some(x=>typeof x!=='string'||x.length>50))throw RangeError('Too many interests');
 const selected=[...new Set(tags.map(x=>safeText(x,40)).filter(Boolean))];
 const plan={purpose,budgetCents,budgetLabel:formatCents(budgetCents),
  itemCount:Number(itemCount),maxMerchants:Number(maxMerchants),region:safeText(region,60),
  recipientPreferences:Object.freeze(selected),
  phases:Object.freeze([
   'Research source-backed ideas and approved merchant products',
   'Verify item price, stock, variants, license, delivery quote and return policy',
   'Compare direct shipments with an authorized cooperative hub, if one is actually available',
   'Review each merchant checkout and consent to each payment; retain separate receipts'
  ]),
  shopResearchPrompt:(purpose==='gift'?'gift ideas':'monthly supply products')+(selected.length?' '+selected.join(' '):''),
  status:'research_proposal',quotesVerified:false,hubAssigned:false,
  ordersPlaced:0,purchaseAuthorized:false,paymentMethodConnected:false,
  recipientDataStored:false};
 return Object.freeze(plan);
}
const quoteRef=q=>typeof q==='string'&&q.length>4&&q.length<160;
function readLines(lines){
 if(!Array.isArray(lines)||lines.length<1||lines.length>500)throw RangeError('Need 1–500 quoted items');
 const ids=new Set(),merchants=new Set(),out=[];
 for(const x of lines){
  if(!x||typeof x.sku!=='string'||!x.sku||typeof x.merchantId!=='string'||!x.merchantId||
     ids.has(x.merchantId+'::'+x.sku)||!integer(x.quantity,1,10000)||!cost(x.unitCents)||
     !https(x.sourceUrl)||!quoteRef(x.priceQuoteRef)||x.merchantVerified!==true)throw Error('Missing verified merchant item or duplicated variant');
  ids.add(x.merchantId+'::'+x.sku);merchants.add(x.merchantId);
  const subtotal=x.quantity*x.unitCents;
  if(!Number.isSafeInteger(subtotal))throw RangeError('Item total overflows');
  out.push(Object.freeze({merchantId:x.merchantId,sku:x.sku,quantity:x.quantity,unitCents:x.unitCents,subtotalCents:subtotal,sourceUrl:x.sourceUrl,priceQuoteRef:x.priceQuoteRef}));
 }
 if(merchants.size>100)throw RangeError('Too many merchants');
 return {items:Object.freeze(out),merchantIds:[...merchants].sort(),goodsCents:total(out.map(x=>x.subtotalCents))};
}
function exactPerMerchant(rows,ids,{costField}){
 if(!Array.isArray(rows)||rows.length!==ids.length||new Set(rows.map(r=>r?.merchantId)).size!==ids.length)return false;
 return rows.every(x=>ids.includes(x.merchantId)&&cost(x[costField])&&quoteRef(x.quoteRef)&&x.verified===true);
}
const option=(type,goods,charges,details)=>Object.freeze({type,goodsCents:goods,chargesCents:charges,
 totalCents:total([goods,charges]),totalLabel:formatCents(total([goods,charges])),
 shipmentCount:details.shipmentCount,quoteReferences:Object.freeze(details.quoteReferences),
 claimedEmissionSavings:null,actualCarrierBooked:false});
export function compareFulfillmentQuotes({lines,directShipments,consolidation=null,budgetCents=null}={}){
 const basket=readLines(lines),ids=basket.merchantIds;
 if(budgetCents!==null&&!cost(budgetCents))throw RangeError('Invalid shopping budget cents');
 let direct=null,shared=null;
 if(exactPerMerchant(directShipments,ids,{costField:'shippingCents'})&&directShipments.every(s=>cost(s.taxCents)))
  direct=option('direct',basket.goodsCents,total(directShipments.flatMap(s=>[s.shippingCents,s.taxCents])),
   {shipmentCount:ids.length,quoteReferences:directShipments.map(s=>s.quoteRef)});
 const co=consolidation;
 if(co&&co.hubAvailable===true&&co.hubAgreementVerified===true&&
    quoteRef(co.hubAgreementRef)&&Array.isArray(co.approvedMerchantIds)&&
    co.approvedMerchantIds.length===ids.length&&ids.every(id=>co.approvedMerchantIds.includes(id))&&
    exactPerMerchant(co.inbound,ids,{costField:'freightCents'})&&
    cost(co.outboundCents)&&cost(co.handlingCents)&&cost(co.packingCents)&&cost(co.storageCents)&&
    quoteRef(co.outboundQuoteRef)&&cost(co.taxCents??0)){
  shared=option('cooperative-hub',basket.goodsCents,
   total([co.outboundCents,co.handlingCents,co.packingCents,co.storageCents,co.taxCents??0,
     ...co.inbound.map(x=>x.freightCents)]),
   {shipmentCount:1,quoteReferences:[co.hubAgreementRef,co.outboundQuoteRef,...co.inbound.map(x=>x.quoteRef)]});
 }
 const comparison=direct&&shared?Object.freeze({deltaCents:shared.totalCents-direct.totalCents,
 deltaLabel:(shared.totalCents>direct.totalCents?'+':'')+(shared.totalCents-direct.totalCents)/100+' USD',
 lessExpensive:shared.totalCents<direct.totalCents?'cooperative-hub':shared.totalCents>direct.totalCents?'direct':'same-quoted-cost'}):null;
 const budget=budgetCents===null?null:Object.freeze({limitCents:budgetCents,
 directWithinBudget:direct?direct.totalCents<=budgetCents:null,
 cooperativeWithinBudget:shared?shared.totalCents<=budgetCents:null});
 return Object.freeze({itemCount:basket.items.reduce((s,x)=>s+x.quantity,0),merchantCount:ids.length,
 goodsCents:basket.goodsCents,direct,cooperative:shared,comparison,budget,
 shippingEnvironmentalStatus:'not_measured',waterLiters:null,packagingImpact:null,
 comparisonIsNotGuaranteedSavings:true,quotesMustBeRevalidatedByBackend:true,
 mode:'comparison_only',purchaseAuthorized:false,ordersPlaced:0,
 missing:Object.freeze([...(direct?[]:['direct_merchant_quotes_required']),...(shared?[]:['signed_hub_and_complete_inbound_outbound_quotes_required'])])});
}
