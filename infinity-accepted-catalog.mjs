/* Owner-curated Infinity acceptance. This describes QuantaPhi placement,
 * not a manufacturer endorsement, lifetime warranty or audited durability claim.
 * Model qualifiers are preserved: acceptance does not extend to every product.
 */
import {BRAND_SOURCE_EVIDENCE} from './infinity-accepted-sources.mjs';
const groups=[
 ['Infrastructure & Physical Tools',`
Channellock|https://www.channellock.com/
Wright Tool|https://www.wrighttool.com/
Estwing|https://www.estwing.com/
Knipex|https://www.knipex.com/
Wera|https://www.wera.de/en/
Wiha|https://www.wihatools.com/
PB Swiss Tools|https://www.pbswisstools.com/en/
Snap-on|https://www.snapon.com/
Lie-Nielsen|https://www.lie-nielsen.com/
Starrett|https://www.starrett.com/
Mitutoyo|https://www.mitutoyo.com/
Leatherman|https://www.leatherman.com/
Victorinox|https://www.victorinox.com/
Stabila|https://www.stabila.com/en-US/
Klein Tools|https://www.kleintools.com/
Lodge Cast Iron|https://www.lodgecastiron.com/
Le Creuset|https://www.lecreuset.com/
Smithey Ironware|https://smithey.com/
All-Clad|https://www.all-clad.com/
Fissler|https://www.fissler.com/us/
Zojirushi|https://www.zojirushi.com/
Vitamix|https://www.vitamix.com/
Ankarsrum|https://www.ankarsrum.com/us/
Bialetti|https://www.bialetti.com/
Technivorm Moccamaster|https://us.moccamaster.com/
Rada Cutlery|https://radakitchenstore.com/
Wüsthof|https://www.wusthof.com/
Zwilling J.A. Henckels|https://www.zwilling.com/us/
Mauviel|https://mauviel-usa.com/`],
 ['Hardware, Electronics & Enclosures',`
Framework Computers|https://frame.work/
Fairphone|https://www.fairphone.com/
System76|https://system76.com/
Pine64|https://pine64.org/
MNT Research|https://mntre.com/
ThinkPad (Classic/T-Series)|https://www.lenovo.com/us/en/c/laptops/thinkpad/thinkpadt/
Noctua|https://noctua.at/
Seasonic|https://seasonic.com/
iFixit|https://www.ifixit.com/
Sony (Professional/Pro-Audio)|https://pro.sony/
Sennheiser (Studio Monitor Series)|https://www.sennheiser.com/
Beyerdynamic|https://north-america.beyerdynamic.com/
Audio-Technica (Studio Line)|https://www.audio-technica.com/en-us/
Genelec|https://www.genelec.com/
Miele|https://www.mieleusa.com/
Speed Queen|https://speedqueen.com/
Henry / Numatic|https://numatic.com/
Leica Camera (M-Series)|https://leica-camera.com/en-US/photography/cameras/m
Garmin (Handheld GPS/Mariner)|https://www.garmin.com/en-US/
Fujitsu (Fi-Series Scanners)|https://www.pfu-us.ricoh.com/scanners/fi
Brother (Monochrome Laser Printers)|https://www.brother-usa.com/
Texas Instruments (Graphing Calculators)|https://education.ti.com/`],
 ['Tactical, Environmental & Transport Systems',`
Casio (G-Shock/Classic Line)|https://www.casio.com/us/
Seiko (Mechanical/Automatic)|https://www.seikowatches.com/us-en/
Rolex|https://www.rolex.com/
Patek Philippe|https://www.patek.com/
Pelican Cases|https://www.pelican.com/
Nanuk|https://nanuk.com/
Zippo|https://www.zippo.com/
Ronson|https://ronson.com/
Maglite|https://maglite.com/
SureFire|https://www.surefire.com/
Toyota (Land Cruiser/Hilux Industrial Platforms)|https://www.toyota-global.com/
Chris King|https://chrisking.com/
Shimano (Deore XT/XTR Mechanical)|https://bike.shimano.com/
Phil Wood|https://philwood.com/
Ortlieb|https://www.ortlieb.com/
Ram Mounts|https://rammount.com/
Maclaren|https://maclarenbaby.com/
Peak Design|https://www.peakdesign.com/
Anchor Hocking|https://www.anchorhocking.com/
Thule|https://www.thule.com/en-us/
Patagonia|https://www.patagonia.com/
Osprey|https://www.osprey.com/
Darn Tough|https://darntough.com/
Filson|https://www.filson.com/
Barbour|https://www.barbour.com/
Arc'teryx (Alpha/Beta Hard Shell Lines)|https://arcteryx.com/us/en/
Mystery Ranch|https://www.mysteryranch.com/
Goruck|https://www.goruck.com/
Red Wing Shoes|https://www.redwingshoes.com/
Danner Boots|https://www.danner.com/
Schott NYC|https://www.schottnyc.com/
Nicks Boots|https://nicksboots.com/
White's Boots|https://whitesboots.com/
Fjällräven|https://www.fjallraven.com/us/en-us/
Duluth Trading Co.|https://www.duluthtrading.com/
Hilleberg|https://hilleberg.com/
Snow Peak|https://www.snowpeak.com/
Stanley|https://www.stanley1913.com/
Klean Kanteen|https://www.kleankanteen.com/
Hydro Flask|https://www.hydroflask.com/
Therm-a-Rest|https://www.thermarest.com/
MSR (Mountain Safety Research)|https://www.msrgear.com/
Coleman (Classic Camp Stoves)|https://www.coleman.com/
Primus|https://primusequipment.com/
Cascade Designs|https://cascadedesigns.com/`],
 ['Materials, Lifestyle & Furniture Engineering',`
Montblanc|https://www.montblanc.com/
Lamy|https://www.lamy.com/
Fisher Space Pen|https://www.spacepen.com/
Saddleback Leather|https://saddlebackleather.com/
Tanner Goods|https://www.tannergoods.com/
Fox Umbrellas|https://www.foxumbrellas.com/
Kaweco|https://www.kaweco-pen.com/
S.T. Dupont|https://www.st-dupont.com/
Duluth Pack|https://www.duluthpack.com/
Swaine Adeney Brigg|https://swaine.london/
Herman Miller (Aeron/Eames Line)|https://www.hermanmiller.com/
Steelcase|https://www.steelcase.com/
USM Modular Furniture|https://www.usm.com/
Vitsœ|https://www.vitsoe.com/
Artek|https://www.artek.fi/
Carl Hansen & Søn|https://www.carlhansen.com/
Knoll|https://www.knoll.com/
Fritz Hansen|https://www.fritzhansen.com/
Thonet|https://www.thonet.de/
Emeco|https://www.emeco.net/`]
];
const slug=name=>'durable-'+name.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .replace(/œ/g,'oe').replace(/ø/g,'o').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
export const INFINITY_ACCEPTED_BRANDS=Object.freeze(groups.flatMap(([category,rows])=>
 rows.trim().split('\n').map(row=>{
  const [name,seedUrl]=row.split('|'),id=slug(name),evidence=BRAND_SOURCE_EVIDENCE[id]||{};
  return Object.freeze({id,name,category,official:evidence.official||seedUrl,
   seedUrl,infinityAccepted:true,acceptedBy:'catalog-owner',acceptedAt:'2026-10-27',
   feature:'Products · care · repair · parts',study:name+' official products, repair resources and service terms',
   image:evidence.image||null,logo:evidence.logo||null,
   sourceCheckedAt:evidence.checkedAt||null,sourceStatus:evidence.status||'not-checked',
   actions:Object.freeze((evidence.actions||[]).map(x=>Object.freeze({...x}))),
   // Source inspection is separate from TinyFish end-to-end acceptance.
   browserStatus:'awaiting-runtime-acceptance',
   acceptanceNote:'Infinity accepted is QuantaPhi owner curation. Check the selected model and current manufacturer terms.'});
 })));
const byId=new Map(INFINITY_ACCEPTED_BRANDS.map(card=>[card.id,card]));
export const acceptedBrand=id=>byId.get(id)||null;
export function isInfinityAccepted(card){
 const trusted=acceptedBrand(card?.id);
 return Boolean(trusted&&card?.official===trusted.official);
}
export const hasAcceptedSource=card=>Boolean(isInfinityAccepted(card)&&card.sourceStatus==='observed'&&card.actions.length);
export const ACCEPTED_GROUPS=Object.freeze(groups.map(([name])=>name));
