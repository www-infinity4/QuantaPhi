import {INFINITY_ACCEPTED_BRANDS} from '../infinity-accepted-catalog.mjs';
import {BRAND_PRODUCT_CARDS} from '../brand-product-cards.mjs';
import {PREMIUM_CARDS} from '../premium-source-cards.mjs';
import {REQUESTED_PUBLIC_CARDS} from '../verified-brand-sports-catalog.mjs';
const products=BRAND_PRODUCT_CARDS.map(card=>({id:card.id,name:card.brand,category:card.category,official:card.shop,
 seeds:BRAND_PRODUCT_CARDS.filter(x=>x.brand===card.brand).map(x=>x.url),priority:true}));
const retail=REQUESTED_PUBLIC_CARDS.filter(c=>['food','retail','coupon','vehicle','wearable','travel'].includes(c.kind))
 .map(c=>({...c,priority:c.kind==='food',seeds:c.actions.map(x=>x.url)}));
const premium=PREMIUM_CARDS.filter(c=>['Restaurants','Shopping','Trading cards','Auctions'].includes(c.category))
 .map(c=>({...c,priority:c.category==='Restaurants'}));
console.log(JSON.stringify([...products,...premium,...retail,...INFINITY_ACCEPTED_BRANDS].map(c=>({
 id:c.id,name:c.name,category:c.category,official:c.official,seeds:c.seeds||[],priority:Boolean(c.priority)
}))));
