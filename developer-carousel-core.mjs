/* The existing first-party creator widgets, never duplicate fake card implementations.
 * The quick-card publisher remains the real, moderated /quick-card-builder.html. */
export const BUILDER_CARDS=Object.freeze([
 Object.freeze({id:'mediaStarCreator',label:'Media Star',description:'Create and export your own playable media card.'}),
 Object.freeze({id:'quickCardBuilderInline',label:'Quick Card',description:'Build and publish a shareable QuantaPhi card. Public discovery requires review.'}),
 Object.freeze({id:'government501Affiliates',label:'501 Affiliates',description:'Explore official public agency resources and developer programs.'}),
 Object.freeze({id:'infinityAffiliates',label:'Infinity Brands',description:'Match brands and explore the existing affiliate builder.'}),
 Object.freeze({id:'phiProjectActions',label:'Code Phi / Create Phi',description:'Start or continue a website build using the existing project tools.'})
]);
export function nextDeveloperCardIndex(index,direction,total=BUILDER_CARDS.length){
 if(!Number.isInteger(total)||total<=0)return -1;
 const current=Number.isFinite(index)?Math.trunc(index):0;
 const step=direction<0?-1:1;
 return ((current+step)%total+total)%total;
}
