/* Factual, independent directory of named Colorado store locations.
 * Source URLs are on the businesses' original websites. This is not
 * a paid endorsement or unverified product ad. Avoid images, prices and
 * offer claims without reuse rights and current merchant provenance.
 * No source data may render before the visitor deliberately acknowledges 21+.
 * No profile, wallet, or location-based device tracking. */
export const DISPENSARY_SOURCES=Object.freeze([
 {
  "id": "livwell-colorado",
  "name": "LivWell",
  "store": "Colorado Boulevard",
  "address": "2020 S Colorado Blvd, Denver, CO 80222",
  "source_url": "https://livwell.com/locations",
  "official_domain": "livwell.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "livwell-central",
  "name": "LivWell",
  "store": "Central Park",
  "address": "3955 Oneida St, Denver, CO 80207",
  "source_url": "https://livwell.com/locations",
  "official_domain": "livwell.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "native-roots-speer",
  "name": "Native Roots",
  "store": "Speer Boulevard",
  "address": "500 Grant St, Denver, CO 80203",
  "source_url": "https://nativerootscannabis.com/shop/",
  "official_domain": "nativerootscannabis.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "native-roots-highlands",
  "name": "Native Roots",
  "store": "Highlands",
  "address": "2209 W 32nd Ave, Denver, CO 80211",
  "source_url": "https://nativerootscannabis.com/shop/",
  "official_domain": "nativerootscannabis.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "fired-sixth",
  "name": "Fired Cannabis",
  "store": "6th Avenue",
  "address": "745 E 6th Ave, Denver, CO 80203",
  "source_url": "https://firedcannabis.com/6th-dispensary/",
  "official_domain": "firedcannabis.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "fired-alameda",
  "name": "Fired Cannabis",
  "store": "Alameda",
  "address": "2601 W Alameda Ave, Denver, CO 80219",
  "source_url": "https://firedcannabis.com/locations/",
  "official_domain": "firedcannabis.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "fired-cherry",
  "name": "Fired Cannabis",
  "store": "Cherry Creek",
  "address": "310 St Paul St, Denver, CO 80206",
  "source_url": "https://firedcannabis.com/locations/",
  "official_domain": "firedcannabis.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "lightshade-evans",
  "name": "Lightshade",
  "store": "Evans",
  "address": "5885 E Evans Ave, Denver, CO 80222",
  "source_url": "https://lightshade.com/dispensaries/denver-locations/",
  "official_domain": "lightshade.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "lightshade-dayton",
  "name": "Lightshade",
  "store": "Dayton",
  "address": "330 S Dayton St, Denver, CO 80247",
  "source_url": "https://lightshade.com/dispensaries/denver-locations/",
  "official_domain": "lightshade.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "star-buds-lakeside",
  "name": "Star Buds",
  "store": "Lakeside",
  "address": "5238 W 44th Ave, Denver, CO 80212",
  "source_url": "https://starbudscolorado.com/stores/lakeside-dispensary",
  "official_domain": "starbudscolorado.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "green-solution-wewatta",
  "name": "The Green Solution",
  "store": "Wewatta",
  "address": "1995 Wewatta St, Denver, CO 80202",
  "source_url": "https://tgscolorado.com/",
  "official_domain": "tgscolorado.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "maikoh-broadway",
  "name": "Maikoh Holistics",
  "store": "North Broadway",
  "address": "260 N Broadway, Denver, CO 80203",
  "source_url": "https://www.maikohholistics.com/location-hours",
  "official_domain": "maikohholistics.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false

 },
 {
  "id": "the-dab-alameda",
  "name": "The Dab by Silverpeak",
  "store": "Alameda",
  "address": "2748 W Alameda Ave, Denver, CO 80219",
  "source_url": "https://thedab303.com/locations/",
  "official_domain": "thedab303.com",
  "category": "dispensary",
  "city": "Denver",
  "state": "CO",
  "paid_sponsor": false
 },
 {
  "id": "the-dispensary-breckenridge",
  "name": "The Dispensary",
  "store": "Breckenridge",
  "former_brand": "Alpenglow Botanicals",
  "phone": "(970) 389-6839",
  "address": "1805 Airport Rd, Breckenridge, CO 80424",
  "source_url": "https://thedispensary.com/locations/breckenridge-co/",
  "official_domain": "thedispensary.com",
  "category": "dispensary",
  "city": "Breckenridge",
  "state": "CO",
  "paid_sponsor": false
 }
].map(x=>Object.freeze(x)));
export const DISPENSARY_CARD_IDS=Object.freeze(DISPENSARY_SOURCES.map(x=>'dispensary-'+x.id));
export function eligibleDispensary(row,acknowledged){
 if(acknowledged!==true||!row||row.category!=='dispensary'||row.paid_sponsor!==false||
    !row.name||!row.store||!row.address||!row.id)return null;
 try{
  const url=new URL(row.source_url),domain=String(row.official_domain||'').toLowerCase();
  if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain))return null;
  if(url.protocol!=='https:'||url.username||url.password||url.port||
      (url.hostname!==domain&&!url.hostname.endsWith('.'+domain)))return null;
  return row;
 }catch{return null}
}

/* The directory is not an advertising service. Only individually approved
 * merchant-owned storefront/editorial photography can appear in this gallery;
 * never infer rights from a screenshot, public URL, or user upload.
 * Regulated product promotions belong to the separately verified ads path. */
export function approvedDirectoryMedia(row,acknowledged,now=Date.now()){
 if(!eligibleDispensary(row,acknowledged))return [];
 const accepted=[],seen=new Set(),domain=row.official_domain;
 const allowed=(raw)=>{try{
  const u=new URL(raw);
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
   (u.hostname===domain||u.hostname.endsWith('.'+domain))?u:null;
 }catch{return null}};
 for(const item of Array.isArray(row.media_gallery)?row.media_gallery:[]){
  if(!item||item.status!=='approved'||item.rights_cleared!==true||
     !['storefront','editorial'].includes(item.kind)||!item.publisher||
     !allowed(item.source_url)||!allowed(item.rights_evidence_url))continue;
  const image=allowed(item.url);
  if(!image||!/\.(?:jpg|jpeg|png|webp)$/i.test(image.pathname))continue;
  const reviewed=Date.parse(item.reviewed_at||''),expires=Date.parse(item.expires_at||'');
  if(!Number.isFinite(reviewed)||reviewed>now||reviewed<now-180*86400000||
     !Number.isFinite(expires)||expires<=now||seen.has(image.href))continue;
  seen.add(image.href);
  accepted.push({url:image.href,alt:String(item.alt||'Official store photograph').slice(0,160),
   publisher:String(item.publisher).slice(0,100),sourceUrl:item.source_url});
  if(accepted.length===6)break;
 }
 return accepted;
}
