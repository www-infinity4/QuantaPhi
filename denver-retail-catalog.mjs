/* Denver destination catalog · original store/venue links checked 2026-11-01.
 * Store listings are not live inventory or claimed sponsorships.
 * A verified business directory is used when an official store site is unconfirmed.
 */
const make=(id,name,group,address,description,products,official,shopUrl,extra={})=>
  Object.freeze({id,name,group,address,description,products:Object.freeze(products),official,
    shopUrl,checked:'2026-11-01',category:'Denver retail destinations',...extra});
export const DENVER_RETAIL_CARDS=Object.freeze([
  make('denver-mint-store','U.S. Mint · Denver Gift Shop','Coins & collectibles',
    '320 W Colfax Ave, Denver, CO 80204',
    'Coins and Mint souvenirs at the public gift shop; guided Mint tours require a separate advance reservation.',
    ['Commemorative coins','Uncirculated coin sets','Mint souvenirs'],
    'https://www.usmint.gov/about/tours-and-locations/denver/tour-denver-mint',
    'https://www.usmint.gov/shop/',
    {photo:'https://dispatcher.usmint.gov/content/usmint/us/en/about/tours-and-locations/denver/jcr%3Acontent/root/container/teaser_50_50_6167178.coreimg.jpeg/1758742422030/denver-mint-circle-crop.jpeg',
      photoCredit:'U.S. Mint · Denver building',tourUrl:'https://www.usmint.gov/about/tours-and-locations/denver/tour-denver-mint',
      hours:'Gift shop: Mon–Thu · 8 a.m.–4:30 p.m.'}),
  make('denver-hammonds-candies','Hammond’s Candies · Factory Store','Handmade candy',
    '5735 Washington St, Denver, CO 80216',
    'Handmade lollipops, candy canes and nostalgic sweets at the Denver factory store.',
    ['Pulled lollipops','Candy canes','Chocolate treats'],
    'https://hammondscandies.com/pages/visit-store',
    'https://hammondscandies.com/collections/lollipops',
    {photo:'https://hammondscandies.com/cdn/shop/files/ChristmasTreeLollipops.png?v=1730486572&width=1200',
      photoCredit:'Hammond’s Candies · handmade lollipops',
      tourUrl:'https://hammondscandies.com/pages/factory-tours-new',
      hours:'Store: Mon–Sat · 9 a.m.–4 p.m.; Sun · 11 a.m.–4 p.m.'}),
  make('denver-enstrom-candies','Enstrom Candies · Cherry Creek','Premium confectionery',
    '201 University Blvd #118, Denver, CO 80206',
    'Colorado almond toffee, truffles and gift boxes with coffee and ice cream at the Cherry Creek store.',
    ['Almond toffee','Chocolate truffles','Gift boxes'],
    'https://www.enstrom.com/',
    'https://www.enstrom.com/',
    {photo:'https://cdn11.bigcommerce.com/s-3ehxep5zvn/images/stencil/500x659/products/146/472/1T221_1__92310.1667322666.jpg?c=1',
      photoCredit:'Enstrom · traditional almond toffee',
      hours:'Cherry Creek: Mon–Fri · 7 a.m.–7 p.m.; Sat · 8 a.m.–7 p.m.; Sun · 10 a.m.–5 p.m.'}),
  make('denver-pacific-mercantile','Pacific Mercantile Company','Japanese imports',
    '1925 Lawrence St, Denver, CO 80202',
    'Family-owned Japanese grocery in Sakura Square with specialty pantry items and imported gifts.',
    ['Japanese snacks','Sushi ingredients','Imported kitchenware'],
    'https://www.pacificeastwest.com/',
    'https://www.pacificeastwest.com/',
    {hours:'Mon–Sat · 9 a.m.–6 p.m.; Sun · 9 a.m.–2 p.m.'}),
  make('denver-chicago-food-depot','Chicago Food Depot · Lakewood','European delicatessen',
    '1477 Carr St, Lakewood, CO 80214',
    'A European specialty market for Polish pierogi, smoked sausages, cheeses and breads.',
    ['Pierogi','Kielbasa','European breads'],
    'https://chicagofooddepot.com/',
    'https://chicagofooddepot.com/our-products/',
    {hours:'Mon–Sat · 10 a.m.–6 p.m.; Sun · 11 a.m.–3 p.m.'}),
  make('denver-arash-international','Arash International Market · Aurora','Middle Eastern groceries',
    '2720 S Parker Rd, Aurora, CO 80014',
    'International grocery shopping for Persian and Mediterranean ingredients, spices and specialty meats.',
    ['Spices & grains','Feta & flatbreads','Fresh meat & produce'],
    'https://www.visitaurora.com/directory/arash-international-market/',
    null,
    {sourceType:'Verified tourism listing',hours:''}),
  make('denver-central-market','Denver Central Market · RiNo','Artisan food hall',
    '2669 Larimer St, Denver, CO 80205',
    'Browse multiple local food artisans in one market, from chocolates and baked goods to fresh meat and seafood.',
    ['Artisan chocolate','Fresh breads','Butcher & seafood counters'],
    'https://www.denvercentralmarket.com/',
    'https://www.denvercentralmarket.com/',
    {hours:'Food vendors: Sun–Thu · 8 a.m.–9 p.m.; Fri–Sat · 8 a.m.–11 p.m. (individual stalls vary)'})
]);
const officialHosts=Object.freeze({
 'denver-mint-store':['www.usmint.gov'],
 'denver-hammonds-candies':['hammondscandies.com'],
 'denver-enstrom-candies':['www.enstrom.com'],
 'denver-pacific-mercantile':['www.pacificeastwest.com'],
 'denver-chicago-food-depot':['chicagofooddepot.com'],
 'denver-arash-international':['www.visitaurora.com'],
 'denver-central-market':['www.denvercentralmarket.com']
});
const photos=Object.freeze({
 'denver-mint-store':'dispatcher.usmint.gov',
 'denver-hammonds-candies':'hammondscandies.com',
 'denver-enstrom-candies':'cdn11.bigcommerce.com'
});
const validUrl=(value,hosts)=>{
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.includes(u.hostname);}
  catch{return false}
};
export function validDenverRetailCard(card){
 if(!card||!/^[a-z0-9-]{5,90}$/.test(card.id||'')||!officialHosts[card.id])return false;
 const allowed=officialHosts[card.id];
 if(!validUrl(card.official,allowed)||card.shopUrl&&!validUrl(card.shopUrl,allowed))return false;
 if(card.photo&&!validUrl(card.photo,[photos[card.id]]))return false;
 if(card.tourUrl&&!validUrl(card.tourUrl,allowed))return false;
 if(!card.name||!card.description||!/^.+, (?:Denver|Lakewood|Aurora), CO 80\d{3}$/.test(card.address||''))return false;
 if(!Array.isArray(card.products)||card.products.length<2||card.products.some(x=>!x||typeof x!=='string'))return false;
 return true;
}
