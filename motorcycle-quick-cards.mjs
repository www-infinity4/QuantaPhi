/* Harley-Davidson and Indian Motorcycle: independently curated 2026 Quick Cards.
 * First-party navigation and real manufacturer photographs only. There is no
 * merchant relationship, live inventory, payment, dealership API, or login.
 * Sources checked 2026-11-07:
 * https://www.harley-davidson.com/us/en/motorcycles/index.html
 * https://www.indianmotorcycle.com/en-us/motorcycles/
 */
const model=(id,name,url)=>Object.freeze({id,name,url});
const card=(data)=>Object.freeze({...data,images:Object.freeze([data.image]),models:Object.freeze(data.models)});
export const MOTORCYCLE_SOURCES=Object.freeze([
 card({
  id:'harley-davidson',name:'Harley-Davidson',kind:'Motorcycles',
  feature:'2026 Harley-Davidson motorcycles · cruisers, touring & adventure',
  official:'https://www.harley-davidson.com/us/en/motorcycles/index.html',
  featureUrl:'https://www.harley-davidson.com/us/en/motorcycles/index.html',
  image:'https://www.harley-davidson.com/ctfasset/5vy1mse9fkav/SoTpAm4FgRHFRDDEpCpGA/9b4e33a6577e5f1b9c9fc7a1f68ee834/2026-street-bob-beauty-styling-ls.jpg?impolicy=myresize&rw=2560',
  imageCaption:'2026 Street Bob · Harley-Davidson manufacturer photo',
  focus:'Help visitors compare current Harley-Davidson motorcycles on the real manufacturer pages, without invented stock, quotes, credit offers or dealer relationships.',
  details:'Choose a 2026 motorcycle model inside the card. Follow, Star, Collect and Share remain the QuantaPhi card actions; model details and dealer transactions remain on the manufacturer website.',
  sourceCheckedAt:'2026-11-07',sourceStatus:'observed-public-catalog',
  models:[
   model('street-bob','Street Bob · Cruiser','https://www.harley-davidson.com/us/en/motorcycles/street-bob.html'),
   model('street-glide','Street Glide · Touring','https://www.harley-davidson.com/us/en/motorcycles/street-glide.html'),
   model('pan-america','Pan America 1250 Special · Adventure','https://www.harley-davidson.com/us/en/motorcycles/pan-america-1250-special.html')
  ]
 }),
 card({
  id:'indian-motorcycle',name:'Indian Motorcycle',kind:'Motorcycles',
  feature:'2026 Indian motorcycles · Scout, Chief & Challenger',
  official:'https://www.indianmotorcycle.com/en-us/motorcycles/',
  featureUrl:'https://www.indianmotorcycle.com/en-us/motorcycles/',
  image:'https://cdn1.polaris.com/globalassets/indian/2026/model/vehicle-cards---/ind-scoutbobberstd-my26-e8af-us-blackmetallic-n26sbb76aa.png?v=de16f63e',
  imageCaption:'2026 Scout Bobber · Indian Motorcycle manufacturer photo',
  focus:'Help visitors explore real Indian Motorcycle cruiser and bagger models, with official 2026 specs and sources, without invented pricing, availability or purchases.',
  details:'Select an Indian Motorcycle model on this card to open its real source details. Account, inventory, dealer and payments are managed by the manufacturer and its authorized sellers.',
  sourceCheckedAt:'2026-11-07',sourceStatus:'observed-public-catalog',
  models:[
   model('scout-bobber','Scout Bobber · Cruiser','https://www.indianmotorcycle.com/en-us/scout-motorcycles/scout-bobber/'),
   model('sport-scout','Sport Scout · Cruiser','https://www.indianmotorcycle.com/en-us/scout-motorcycles/sport-scout/'),
   model('chief','Chief · Cruiser','https://www.indianmotorcycle.com/en-us/chief-motorcycles/chief/?model=chief'),
   model('challenger','Indian Challenger · Bagger','https://www.indianmotorcycle.com/en-us/challenger-motorcycles/challenger/')
  ]
 })
]);
export const findMotorcycleSource=id=>MOTORCYCLE_SOURCES.find(c=>c.id===id)||null;
export function motorcycleModel(card,id){
 const trusted=findMotorcycleSource(card?.id);
 if(!trusted||card?.official!==trusted.official)return null;
 return trusted.models.find(model=>model.id===id)||null;
}
export function mountMotorcycleQuickCard(root,card){
 const trusted=findMotorcycleSource(card?.id);
 if(!root||!trusted||card?.official!==trusted.official)return false;
 const section=document.createElement('section');
 section.className='qcx-tool qcx-motorcycle-tool';
 const headline=document.createElement('h3');
 headline.textContent='Choose your 2026 motorcycle';
 const picker=document.createElement('select');
 picker.className='qcx-motorcycle-select';
 picker.setAttribute('aria-label',trusted.name+' model');
 for(const model of trusted.models){
  const option=document.createElement('option');
  option.value=model.id;option.textContent=model.name;
  picker.append(option);
 }
 const selectedModel=document.createElement('a');
 selectedModel.className='qcx-button qcx-motorcycle-link';
 selectedModel.target='_blank';
 selectedModel.rel='noopener noreferrer';
 const caption=document.createElement('p');
 caption.className='qcx-note';
 caption.textContent=trusted.imageCaption+' · Representative image, not a photo of every option.';
 const update=()=>{
  const model=motorcycleModel(trusted,picker.value)||trusted.models[0];
  selectedModel.href=model.url;
  selectedModel.textContent='Explore '+model.name.split(' · ')[0]+' on '+trusted.name+' ↗';
 };
 picker.addEventListener('change',update);
 update();
 const listing=document.createElement('a');
 listing.className='qcx-link';
 listing.href=trusted.official;
 listing.target='_blank';
 listing.rel='noopener noreferrer';
 listing.textContent='View all '+trusted.name+' motorcycles ↗';
 const warning=document.createElement('p');
 warning.className='qcx-note';
 warning.textContent='Independent QuantaPhi guide. Actual specifications, inventory and checkout are provided by the manufacturer or dealer.';
 section.append(headline,picker,selectedModel,listing,caption,warning);
 root.append(section);
 return true;
}
