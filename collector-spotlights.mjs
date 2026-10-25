/* Collector spotlights: exact photographed examples, not generic logo art.
 * Every image is a credited publisher/merchant preview linked to that image's
 * real original listing. No price below is a live estimate for another item.
 * If a host blocks image display, preserve the source link; never substitute art.
 */
const feature=(id,title,image,imageSource,credit,subhead,facts,detail,valueNote)=>Object.freeze({
 id,title,image,imageSource,credit,subhead,facts:Object.freeze(facts),detail,valueNote
});
export const COLLECTOR_SPOTLIGHTS=Object.freeze({
 topps:Object.freeze([
  feature('mclean-green','2026 Topps Chrome · Nolan McLean RC',
   'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/1496a942d1cd0429420d3d19cac4e5fe1f7832ca_26TCBB_1215_FR_GreenRefractorParallel.jpg?v=1781892446',
   'https://www.topps.com/products/2026-topps-chrome%C2%AE-baseball-value-box',
   'Topps · official product preview',
   'New York Mets · pictured Green Refractor preview',
   ['2026 Topps Chrome','Rookie card (RC)','Refractor design'],
   'Look at the genuine card art, rookie mark, nameplate and border. Check the exact set, card number and parallel before comparing sales.',
   'Manufacturer preview; no unverified resale price or claim of serial number.'
  ),
  feature('griffin-logofractor','2026 Topps Chrome · Konnor Griffin',
   'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/23dea80b980f88373ca43eafe6ead64ca0f1fbb8_26TCBB_3240_FR_RoseGoldLogofractor.jpg?v=1786630486',
   'https://www.topps.com/products/2026-topps-chrome%C2%AE-baseball-logofractor-edition',
   'Topps · official Logofractor preview',
   'Pittsburgh Pirates · autograph card art',
   ['2026 Chrome Logofractor','Rookie','Autograph design'],
   'Compare the autograph, foil surface and pictured parallel details with the official release. The photographed preview is an example, not inventory.',
   'Card-market value requires an exact parallel and verified sold comparables.'
  )
 ]),
 beckett:Object.freeze([
  feature('bgs-manga-example','Beckett grading · authenticated manga example',
   'https://www.beckett.com/_next/image?q=75&url=%2F_next%2Fstatic%2Fmedia%2FVerifiesAuthenticity.d9def955.png&w=3840',
   'https://www.beckett.com/manga-grading',
   'Beckett · official grading example',
   'Chainsaw Man #1 · example graded cover',
   ['Publisher: Beckett','Example label: 9.2','Authentication & encapsulation'],
   'Study the actual encapsulation and label. A printed grade applies only to the photographed collectible and does not determine the price of an unrelated card.',
   'Beckett catalog, grader population and market sale data must be checked separately; no invented book value.'
  )
 ]),
 vamworld:Object.freeze([
  feature('scarface-ms62','1888-O Morgan · VAM-1B4 Scarface',
   'https://www.scoins.com/img_auction/18/00009629o.jpg',
   'https://www.scoins.com/lot.aspx?a=18&l=434',
   'Scotsman Auction Co. · photographed PCGS MS62+ specimen',
   'Morgan silver dollar · New Orleans · late die state',
   ['1888-O','VAM-1B4','Look for obverse facial die break'],
   'The pictured Scarface specimen has a prominent die break near Liberty’s portrait. Compare the actual die-break progression and verify the stage before assigning a variety.',
   'A different PCGS MS64 VAM-1B3 sold at Heritage on Sep 12, 2024 for $8,100. This dated comparable is NOT a value for the pictured MS62+ coin.'
  ),
  feature('spitting-eagle','1891-CC Morgan · VAM-3 Spitting Eagle',
   'https://www.images-apmex.com/images/products/1891-cc-morgan-dollar-dmpl-ms-63-pcgs-vam-3-spitting-eagle_259932_slab.jpg?height=900&v=20220914012315&width=900',
   'https://www.apmex.com/product/259932/1891-cc-morgan-dollar-dmpl-ms-63-pcgs-vam-3-spitting-eagle',
   'APMEX · photographed PCGS MS63 DMPL specimen',
   'Carson City Morgan · Top 100 VAM variety',
   ['1891-CC','VAM-3','Reverse die gouge near eagle’s mouth'],
   'The slab identifies the VAM-3 Spitting Eagle. The key diagnostic is on the reverse, so this obverse photograph is a label/reference view, not a close-up of the marker.',
   'No live asking price or melt-value claim. Verify grade, attribution and sold comparables on the original source.'
  )
 ])
});
export const getCollectorSpotlights=id=>COLLECTOR_SPOTLIGHTS[id]||null;
export function validCollectorFeature(item){
 if(!item||!item.title||!item.image||!item.imageSource)return false;
 try{return [item.image,item.imageSource].every(url=>{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password})}catch{return false}
}
