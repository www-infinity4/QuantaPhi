/* The existing QuantaPhi builders. Covers reuse source-confirmed assets, not fake tools.
 * The Quick Card form remains the real moderated /quick-card-builder.html. */
export const BUILDER_CARDS=Object.freeze([
 Object.freeze({id:'mediaStarCreator',label:'Media Star',description:'Create and export your own playable media card.',image:'/apps/icons/media-star-512.png',imageAlt:'Original Media Star app artwork',artMode:'contain',action:'Create Media Star'}),
 Object.freeze({id:'quickCardBuilderInline',label:'Quick Card',description:'Create and share a working QuantaPhi Quick Card. Public discovery requires review.',image:'/assets/phi-data-analyst.webp',imageAlt:'Original Infinity Phi creative studio artwork',artMode:'cover',action:'Build Quick Card'}),
 Object.freeze({id:'government501Affiliates',label:'501 Affiliates',description:'Find official public agencies, verified resources and development programs.',image:'https://www.google.com/s2/favicons?domain=usa.gov&sz=128',imageAlt:'USA.gov source website icon',artMode:'contain',action:'Explore resources'}),
 Object.freeze({id:'infinityAffiliates',label:'Infinity Brands',description:'Find an accepted brand, connect its original product and prepare an affiliation request.',image:'/assets/share/infinity-affiliates-card.png',imageAlt:'Original Infinity Affiliates card artwork',artMode:'cover',action:'Explore brands'}),
 Object.freeze({id:'phiProjectActions',label:'Code Phi · Create Phi',description:'Start or continue a real Code Phi or Create Phi project without leaving the card.',image:'/assets/phi-data-analyst.webp',imageAlt:'Original Infinity Phi development studio artwork',artMode:'cover',action:'Build with Phi'})
]);
export function nextDeveloperCardIndex(index,direction,total=BUILDER_CARDS.length){
 if(!Number.isInteger(total)||total<=0)return -1;
 const current=Number.isFinite(index)?Math.trunc(index):0;
 const step=direction<0?-1:1;
 return ((current+step)%total+total)%total;
}
