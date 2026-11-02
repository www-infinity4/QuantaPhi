/* Owner-requested nostalgic Quick Card discovery queue.
 * Candidate entries are NOT advertisements, partnerships, licensed assets, or products.
 * This catalog is read-only; wallet, authentication and payment flows are untouched.
 */
const requests=[
 ['ge-vintage','General Electric · historical products','vintage-electronics',1425],
 ['eastland-shoes','Eastland leather shoes','heritage-footwear',1426],
 ['silk-shirts','Silk shirts','fashion-material',1427],
 ['big-johnson','Big Johnson · vintage graphic tees','novelty-apparel',1428],
 ['no-fear','No Fear clothing','retro-sportswear',1429],
 ['hypercolor','Hypercolor clothing','thermochromic-apparel',1430],
 ['spencers',"Spencer's novelty gifts",'novelty-gifts',1431],
 ['kb-toys','KB / Kay-Bee Toys','historical-toy-store',1432],
 ['toys-r-us','Toys “R” Us','toys-and-collectibles',1433],
 ['brass-armadillo','Brass Armadillo antique malls','antiques-and-dealers',1434],
 ['fun-cool','Fun & Cool · retro discovery','nostalgia-discovery',1435]
];
export const NOSTALGIA_CARD_CANDIDATES=Object.freeze(requests.map(([id,name,category,issue])=>Object.freeze({
 id,name,category,issue,issueUrl:`https://github.com/www-infinity4/QuantaPhi/issues/${issue}`,
 status:'research-needed',productCount:0,sponsored:false
})));
const byId=new Map(NOSTALGIA_CARD_CANDIDATES.map(candidate=>[candidate.id,candidate]));
export const getNostalgiaCandidate=id=>byId.get(id)||null;
function safeHttps(url){
 try{const parsed=new URL(url);return parsed.protocol==='https:'&&Boolean(parsed.hostname)&&!parsed.username&&!parsed.password;}
 catch{return false;}
}
/** Fail closed: only render a LIVE purchasable ad after independent rights + freshness checks. */
export function isPublishableNostalgiaOffer(item,now=new Date()){
 if(!item||!getNostalgiaCandidate(item.candidateId)||item.kind!=='offer')return false;
 if(item.sourceStatus!=='verified'||item.rightsStatus!=='licensed'||item.reviewStatus!=='approved')return false;
 if(item.listingStatus!=='in-stock'||!safeHttps(item.sourceUrl)||!safeHttps(item.imageUrl))return false;
 if(!Number.isFinite(item.price)||item.price<0||!/^[A-Z]{3}$/.test(item.currency||''))return false;
 const age=Date.parse(item.checkedAt),current=new Date(now).getTime();
 if(!Number.isFinite(age)||!Number.isFinite(current)||age>current||current-age>30*86400000)return false;
 if(item.promotionType==='independent')return true;
 return item.promotionType==='sponsored'&&safeHttps(item.sponsorEvidenceUrl);
}
