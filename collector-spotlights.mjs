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
  feature('ohtani-bgs95','2018 Topps Chrome · Shohei Ohtani RC, BGS 9.5',
   'https://cdn-vault.fanaticscollect.com/2025/12/29/rm2/large/v2176913_2020122810265670R_47.jpg',
   'https://www.fanaticscollect.com/buy-now/eda9f975-7736-4f81-b764-c64100e2ffdc/2018-topps-chrome-shohei-ohtani-rookie-150-bgs-95-gem-mint',
   'Fanatics Collect · photographed Beckett-graded card',
   'Los Angeles Angels · 2018 Topps Chrome #150 rookie',
   ['Card #150','BGS 9.5 Gem Mint','Corners 10 on pictured slab'],
   'The picture shows the actual Beckett label, 9.5 overall grade, subgrades and 2018 Topps Chrome #150 Shohei Ohtani rookie. This specimen is a grading reference, not another listing’s valuation.',
   'Check that another specimen is the same card, condition and grade before comparing sale prices. No unverified Beckett guide value is stated.'
  ),
  feature('judge-bgs95','2017 Topps Chrome · Aaron Judge RC, BGS 9.5',
   'https://images.pristineauction.com/258/2586146/share_1672426774-Aaron-Judge-2017-Topps-Chrome-169A-RC-BGS-95-PristineAuction.com.jpg',
   'https://www.pristineauction.com/a7132419-Aaron-Judge-2017-Topps-Chrome-169A-RC-BGS-95',
   'Pristine Auction · photographed Beckett-graded card',
   'New York Yankees · 2017 Topps Chrome #169A rookie',
   ['Card #169A','BGS 9.5 Gem Mint','Visible grading subgrades'],
   'Identify the real Aaron Judge rookie image, the Topps Chrome issue and the BGS slab. A separate image variation, grade or autograph is not interchangeable.',
   'The photograph establishes identification and grade only; confirm completed sales before displaying a price.'
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
