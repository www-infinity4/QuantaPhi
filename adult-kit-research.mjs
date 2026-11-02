/* Read-only 21+ lifestyle kit research plans.
 * This prepares a human-editable checklist, NOT a cart, order, medical advice,
 * verified age pass, regulated product offer, ad campaign or freight quote.
 * Nothing is fetched, profiled, charged, persisted or sent to any merchant. */
import {ADULT_LIFESTYLE_KITS,sourcesForKit} from './adult-lifestyle-catalog.mjs';
import {eligiblePublisher} from './restricted-source-directory.mjs';
import {moneyCents,formatCents} from './design-lab/bulk-allocator.mjs';
const ROLES=Object.freeze({
 'playboy':'publisher',
 'victorias-secret':'retailer',
 'hims':'health-provider',
 'adore-me':'retailer',
 'savage-x':'retailer',
 'agent-provocateur':'retailer',
 'grav':'regulated-accessories',
 'amsterdam-de-wallen':'visitor-guide',
 'amsterdam-nightlife':'visitor-guide',
 'cafe-de-jaren':'dining-venue',
 'coffee-coconuts':'dining-venue',
 'amsterdam-coffeeshops':'venue-information',
 'opentable':'booking-platform',
 'spafinder':'booking-platform',
 'sonos':'retailer',
 'philips-hue':'retailer',
 'etsy':'retailer',
 'eventbrite':'booking-platform'
});
export function prepareAdultKitResearch({kitId,budget='300.00',region=''}={}){
 const kit=ADULT_LIFESTYLE_KITS.find(x=>x.id===kitId);
 if(!kit)throw new RangeError('Choose a lifestyle kit before preparing a plan');
 const budgetCents=moneyCents(budget,'Budget');
 if(!budgetCents)throw new RangeError('Budget must be greater than zero');
 if(typeof region!=='string'||region.length>60||/[<>\x00-\x1f\x7f]/.test(region))throw new RangeError('Enter a short destination or region without special characters');
 const rows=sourcesForKit(kitId).map(source=>{
  if(!eligiblePublisher(source,true)||!ROLES[source.id])throw Error('Source requires verification before planning');
  return Object.freeze({id:source.id,title:source.title,officialUrl:source.url,role:ROLES[source.id],
   quoteStatus:'not_verified',fulfillmentStatus:'not_quoted'});
 });
 if(rows.length!==kit.sourceIds.length||rows.length===0)throw Error('Kit sources are incomplete');
 return Object.freeze({status:'research_only',kitId,title:kit.title,description:kit.description,
  budgetCents,budgetLabel:formatCents(budgetCents),region:region.trim(),
  sources:Object.freeze(rows),merchantQuotesAvailable:false,shipmentsQuoted:false,
  savingsCents:null,ordersPlaced:0,walletDebits:0,profileSaved:false});
}
export function formatAdultKitChecklist(plan){
 if(!plan||plan.status!=='research_only'||!Array.isArray(plan.sources)||!plan.sources.length)throw new RangeError('A valid research kit is required');
 return [
  'INFINITY® · Lifestyle kit research checklist',
  plan.title,
  'Budget ceiling: '+plan.budgetLabel,
  'Research region: '+(plan.region||'not specified'),
  '',
  ...plan.sources.map((row,i)=>(i+1)+'. '+row.title+' ['+row.role+']\n   '+row.officialUrl),
  '',
  'No live product prices or availability verified.',
  'Direct and combined shipping not quoted.',
  'No orders, prescription decisions, campaign approvals or payment actions.',
  'Verify current merchant offers, regional conditions and any fulfillment agreements independently.'
 ].join('\n');
}
