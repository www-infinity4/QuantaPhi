/* Source-backed, editorial Innovations cards. Images are original concept illustrations.
 * Research updates must be checked before catalog changes; never auto-publish
 * scraped claims or promise a retail product based on a research article.
 */
export const INNOVATION_CARDS=Object.freeze([
 Object.freeze({
  id:'solar-paint',name:'Solar Paint',category:'Innovations · Energy',
  headline:'What if a wall could collect sunlight?',
  source:'https://8msolar.com/solar-paint-turning-any-surface-into-a-solar-panel/',
  sourceLabel:'Read 8MSolar solar paint research overview',sourceDate:'2025-04-02',
  checkedAt:'2026-11-07',readiness:'research',
  summary:'Photovoltaic inks and coatings may eventually turn building surfaces into electricity collectors. Today this is an emerging materials technology, not a can of ready-to-use solar power.',
  caveat:'Not available as an ordinary retail paint that plugs into an outlet. Energy-harvesting coatings need electrodes, wiring, conditioning, safety certification and measured outdoor durability.',
  image:'/innovations/solar-paint-concept.svg',
  imageAlt:'Original concept illustration: luminous blue solar coating applied to a sunlit building; not a real product photograph',
  applications:Object.freeze(['Walls and fences as future light-collecting surfaces','Surface-integrated sensors powered by light','A dry solar collector near a pond; never live electrical paint in the water']),
  researchQuery:'solar paint photovoltaic coating perovskite materials measured power durability practical applications'
 }),
 Object.freeze({
  id:'perovskite-cells',name:'Perovskite Solar Cells',category:'Innovations · Materials',
  headline:'New ways to capture more of the spectrum',
  source:'https://www.nlr.gov/pv/perovskite-solar-cells',
  sourceLabel:'Explore NLR photovoltaic research',sourceDate:'NLR research reference',
  checkedAt:'2026-11-07',readiness:'research',
  summary:'Perovskite materials absorb sunlight efficiently and can be manufactured in thin semiconductor layers. Scaling, stable outdoor operation and materials safety remain active engineering challenges.',
  caveat:'A high-efficiency laboratory cell is not proof that any brush-on coating can replace a commercial solar panel, or that a particular product is approved for sale.',
  image:'/innovations/perovskite-concept.svg',
  imageAlt:'Original concept illustration of a layered perovskite photovoltaic material receiving sunlight, not a product photograph',
  applications:Object.freeze(['Thin-film photovoltaic research','Potential future building-integrated modules','Perovskite and silicon tandem-cell design']),
  researchQuery:'perovskite photovoltaic thin film stability scale up tandem solar cell research latest'
 }),
 Object.freeze({
  id:'solar-windows',name:'Solar Windows',category:'Innovations · Buildings',
  headline:'Could glass be an electricity collector?',
  source:'https://www.energy.gov/cmei/buildings/articles/switchable-photovoltaic-windows',
  sourceLabel:'Read the U.S. DOE switchable photovoltaic window research',
  sourceDate:'DOE project reference',checkedAt:'2026-11-07',readiness:'prototype',
  summary:'Researchers have investigated glass that switches between daylight transmission and photovoltaic energy harvesting as sunlight changes.',
  caveat:'This is a research/prototype direction. An existing ordinary window does not become a power outlet simply by applying a coating.',
  image:'/innovations/solar-windows-concept.svg',
  imageAlt:'Original concept illustration of a blue glass building with switchable photovoltaic window panels, not an installed product photo',
  applications:Object.freeze(['Future commercial windows and skylights','Building electricity and thermal-management research','Architecture that integrates photovoltaic devices into glass']),
  researchQuery:'switchable photovoltaic windows solar glass DOE building integrated research performance'
 }),
 Object.freeze({
  id:'building-integrated-solar',name:'Solar Building Surfaces',category:'Innovations · Architecture',
  headline:'The roof, wall and shade can become the collector',
  source:'https://www.energy.gov/cmei/systems/articles/expanding-solar-energy-opportunities-rooftops-building-integration',
  sourceLabel:'Read DOE building-integrated photovoltaics overview',
  sourceDate:'2024-01-04',checkedAt:'2026-11-07',readiness:'field-applications',
  summary:'Building-integrated photovoltaics can replace some traditional building elements with solar-generating roofs, facades, skylights or awnings.',
  caveat:'Real projects require structural, electrical, weatherproofing and installer review. This is different from experimental brush-on solar paint.',
  image:'/innovations/building-solar-concept.svg',
  imageAlt:'Original concept illustration of architectural solar roof and facade panels, not a specific building installation photo',
  applications:Object.freeze(['Solar roofing and building facades','PV awnings and shades','Solar-integrated skylights and building envelopes']),
  researchQuery:'building integrated photovoltaics solar facades awnings roofing DOE real pilot installations'
 })
]);
export function validateInnovation(c){
 if(!c||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id||''))return false;
 try{const u=new URL(c.source);if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.'))return false;}catch{return false}
 return typeof c.name==='string'&&c.name.length>3&&
  typeof c.summary==='string'&&c.summary.length>=20&&
  typeof c.caveat==='string'&&c.caveat.length>=12&&
  /^\/innovations\/[a-z0-9-]+\.svg$/.test(c.image||'')&&
  typeof c.imageAlt==='string'&&typeof c.sourceDate==='string'&&
  Array.isArray(c.applications)&&c.applications.length>0 &&
  ['research','prototype','field-applications'].includes(c.readiness)&&
  !Object.hasOwn(c,'buyUrl');
}
export function innovationById(id){return INNOVATION_CARDS.find(c=>c.id===id)||null;}
export function nextInnovationIndex(index,direction,count=INNOVATION_CARDS.length){
 if(!Number.isInteger(count)||count<1)return -1;
 const n=Number.isFinite(index)?Math.trunc(index):0;
 return ((n+(direction<0?-1:1))%count+count)%count;
}
export function researchQueryFor(id){return innovationById(id)?.researchQuery||null;}
