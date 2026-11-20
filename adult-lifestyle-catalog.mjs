/* Curated links for an opt-in, visitor-led 21+ lifestyle carousel.
 * These are independently operated websites, NOT paid advertisements, licenses,
 * live products, prescriptions, orders or shipping quotes.
 * Some linked sites admit adults aged 18+ or serve all ages; 21+ is QuantaPhi's
 * chosen navigation shelf, not a claim about the law at every destination.
 * No alcohol, tobacco/nicotine or mushroom suppliers are included.
 * No product pictures are reproduced or requested from third parties.
 */
const source=(id,title,subtitle,summary,url,official_domain,category)=>Object.freeze({
 id,kind:'independent-source',title,subtitle,summary,url,official_domain,category
});
export const ADULT_LIFESTYLE_SOURCES=Object.freeze([
 source('playboy','Playboy','Publisher · adult media','Browse the original adult-oriented publisher site. No media is embedded or copied.','https://www.playboy.com/','playboy.com','Adult media'),
 source('victorias-secret',"Victoria's Secret",'Lingerie and sleepwear','Explore lingerie, sleepwear and gifts on the brand’s original storefront.','https://www.victoriassecret.com/','victoriassecret.com','Fashion'),
 source('hims','Hims','Men’s health · provider-led','Explore the original telehealth provider; prescription eligibility and healthcare decisions stay with the provider.','https://www.hims.com/','hims.com','Wellness'),
 source('adore-me','Adore Me','Lingerie and sleepwear','Browse the original fashion retailer for night-in wardrobe ideas.','https://www.adoreme.com/','adoreme.com','Fashion'),
 source('savage-x','Savage X Fenty','Lingerie and loungewear','Discover fashion collections directly at the original brand website.','https://www.savagex.com/','savagex.com','Fashion'),
 source('agent-provocateur','Agent Provocateur','Designer lingerie','Explore the original designer boutique for occasion styling.','https://www.agentprovocateur.com/','agentprovocateur.com','Fashion'),
 source('grav','GRAV','Glassware · 21+ age policies','Visit the original glassware brand; local restrictions, age checks and product categories remain the merchant’s responsibility.','https://grav.com/','grav.com','Adult accessories'),
 source('amsterdam-de-wallen','De Wallen · Amsterdam','Official city visitor guide','Explore the city’s history, museums and nightlife guidance; no individual workers are listed or photographed.','https://www.iamsterdam.com/en/explore/neighbourhoods/centrum/things-to-do-in-de-wallen-red-light-district','iamsterdam.com','Travel and nightlife'),
 source('amsterdam-nightlife','Amsterdam nightlife guide','Official city nightlife guide','Research cultural events, clubs and visitor rules from the official city guide.','https://www.iamsterdam.com/en/whats-on/clubbing-and-nightlife/the-definitive-locals-guide-to-going-out-in-amsterdam','iamsterdam.com','Travel and nightlife'),
 source('cafe-de-jaren','Café de Jaren','Amsterdam café · English site','See the café’s original English-language site, food and event information.','https://cafedejaren.nl/en/','cafedejaren.nl','Dining'),
 source('coffee-coconuts','Coffee & Coconuts','Amsterdam coffee and café','Browse a café and roastery’s original site for locations and menu information.','https://coffeeandcoconuts.com/','coffeeandcoconuts.com','Dining'),
 source('amsterdam-coffeeshops','The Coffeeshops · Amsterdam','Independent venue information','Read original English-language venue and house-rule information; local law and the operator control entry and any products.','https://thecoffeeshops.com/','thecoffeeshops.com','Adult venues'),
 source('opentable','OpenTable','Restaurant discovery','Find dining options and independently confirm availability at the provider.','https://www.opentable.com/','opentable.com','Dining'),
 source('spafinder','Spafinder','Spa and wellness','Explore legitimate spa and wellness experiences via the original booking marketplace.','https://www.spafinder.com/','spafinder.com','Wellness'),
 source('sonos','Sonos','Home audio','Explore original home-audio equipment for a room or party setup.','https://www.sonos.com/','sonos.com','Room and event'),
 source('philips-hue','Philips Hue','Home lighting','Explore mood lighting from the official brand for event and room planning.','https://www.philips-hue.com/','philips-hue.com','Room and event'),
 source('etsy','Etsy','Independent makers','Browse decorations and gifts through the original marketplace.','https://www.etsy.com/','etsy.com','Room and event'),
 source('eventbrite','Eventbrite','Events and experiences','Find events and organizer information on the original events platform.','https://www.eventbrite.com/','eventbrite.com','Room and event')
]);
const kit=(id,title,description,sourceIds)=>Object.freeze({id,title,description,sourceIds:Object.freeze(sourceIds)});
export const ADULT_LIFESTYLE_KITS=Object.freeze([
 kit('after-dark-date','Date-night plans','Dress, dinner, relaxation and an original publisher in one research card. These are separate sellers and not one checkout.',['victorias-secret','opentable','spafinder','playboy']),
 kit('amsterdam-after-dark','Amsterdam after dark','De Wallen cultural guide, nightlife, a real café and English-language coffeeshop information. No person listings or service bookings.',['amsterdam-de-wallen','amsterdam-nightlife','cafe-de-jaren','amsterdam-coffeeshops']),
 kit('room-party','Room and party setup','Bring lighting, sound, decorations and event ideas together before checking separate retailers for current offers.',['philips-hue','sonos','etsy','eventbrite']),
 kit('lingerie-wellness','Lingerie and wellness','Compare original fashion boutiques alongside provider-led men’s wellness information.',['adore-me','savage-x','agent-provocateur','hims']),
 kit('glass-lounge','Glass and coffee lounge','Glassware, specialty coffee and room audio; no tobacco, nicotine or mushroom products.',['grav','coffee-coconuts','sonos']),
 kit('special-occasion','Special occasion','Combine an outfit, a restaurant, a spa idea and a maker gift from original providers.',['agent-provocateur','opentable','spafinder','etsy'])
]);
export function sourcesForKit(id){
 const selected=ADULT_LIFESTYLE_KITS.find(x=>x.id===id);
 if(!selected)return [];
 return selected.sourceIds.map(key=>ADULT_LIFESTYLE_SOURCES.find(s=>s.id===key)).filter(Boolean);
}
