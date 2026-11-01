export const crackerJackCard = Object.freeze({
  id: 'cracker-jack',
  brand: 'Cracker Jack',
  kind: 'independent-product-discovery',
  officialSite: 'https://www.crackerjack.com/',
  disclosure: 'Independent product discovery. Not sponsored by or affiliated with Frito-Lay.',
  title: 'Cracker Jack · A classic with a prize inside',
  description: 'Explore the original caramel-coated popcorn and peanuts, product information and official arcade.',
  imagePolicy: 'Only display verified licensed or authorized product assets; otherwise show neutral text fallback.',
  priceStatus: 'not-verified',
  productUrl: 'https://www.fritolay.com/products/cracker-jack-original-caramel-coated-popcorn-peanuts',
  actions: Object.freeze([
    Object.freeze({label:'Explore products',url:'https://www.crackerjack.com/'}),
    Object.freeze({label:'Product details',url:'https://www.fritolay.com/products/cracker-jack-original-caramel-coated-popcorn-peanuts'}),
    Object.freeze({label:'Play official arcade',url:'https://www.crackerjack.com/arcade/'}),
    Object.freeze({label:'Find stores',url:'https://contact.pepsico.com/fritolay/product-locator'})
  ]),
  // No wallet minting, checkout, copied arcade, or sponsorship claim.
  sponsorApproved: false,
  purchaseEnabled: false,
});
export function validateCrackerJackCard(card=crackerJackCard){
  if(card.sponsorApproved !== false || card.purchaseEnabled !== false) return false;
  if(card.priceStatus !== 'not-verified') return false;
  return card.actions.every(a=>{
    try {const u=new URL(a.url);return u.protocol==='https:'&&
      ['crackerjack.com','fritolay.com','pepsico.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d));}
    catch{return false;}
  });
}
