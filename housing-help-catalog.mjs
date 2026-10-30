import {HOUSING_LINKS} from './disability-housing-core.mjs';
export const HOUSING_HELP_BRAND='INFINITY® · HOUSING HELP';
export const HOUSING_HELP_CHECKED='2026-10-29';
const resource=(id,title,provider,url,category,description,area,extra={})=>Object.freeze({id,title,provider,url,category,description,area,
 brand:HOUSING_HELP_BRAND,checked:HOUSING_HELP_CHECKED,paid:false,
 availability:'Ask the provider about current funding, eligibility, and waiting lists.',...extra});
export const HOUSING_HELP_RESOURCES=Object.freeze([
 resource('bath-access','Safer baths & easier access','Rebuilding Together',
  'https://rebuildingtogether.org/safe-at-home','bath',
  'Ask a local affiliate about modified showers, grab bars, ramps, and other safety or accessibility work.',
  'U.S. affiliate network; local coverage and services vary.',{action:'Find my local affiliate',actionUrl:'https://rebuildingtogether.org/find-your-local-affiliate'}),
 resource('home-repair','Roof & home repair help','USDA Rural Development',HOUSING_LINKS.repair,'repair',
  'Explore Section 504 repair loans. Grants have additional conditions, including age 62 or older. The applicant must own and occupy an eligible rural home.',
  'Eligible U.S. rural areas; agency review required.',{action:'See repair loans & forms'}),
 resource('home-loan','A loan for a home of your own','USDA Rural Development',HOUSING_LINKS.purchase,'loan',
  'Explore Section 502 Direct purchase loans and payment assistance. SSI or SSDI income is not an automatic approval or denial.',
  'Eligible U.S. rural areas; repayment and property review required.',{action:'Explore home purchase help'}),
 resource('sieda','Energy bills & weatherization','Sieda Community Action',
  'https://www.sieda.org/housing-stabilization/weatherization/','energy',
  'Insulation, appliance safety checks, furnace work, and limited repairs through Sieda’s weatherization program. This is not a home purchase or general remodeling program.',
  'Iowa: Appanoose, Davis, Jefferson, Keokuk, Mahaska, Van Buren, Wapello.',
  {state:'IA',phone:'641-682-8741',contactUrl:'https://www.sieda.org/contact-us/',action:'Ask Sieda about assistance'}),
 resource('scicap','Local help in Monroe County','South Central Iowa Community Action Program',
  'https://scicap.org/weatherization-of-home/','energy',
  'Ask about energy efficiency, insulation, furnace work, and safety measures. Homeowners and renters may be considered; selection depends on program priorities.',
  'Iowa: Clarke, Decatur, Lucas, Monroe, Wayne.',
  {state:'IA',phone:'641-932-5107',contactUrl:'https://scicap.org/contact/',action:'Contact the Monroe outreach office'}),
 resource('chariton-valley','Local repair grants & loans','Chariton Valley Regional Housing Trust Fund',
  'https://centerville-ia.org/chariton-valley-regional-housing-trust-fund','grant',
  'The city’s program page lists home repair assistance, including roofs, plumbing, and accessibility improvements. Contact the fund to ask about an application and current availability.',
  'Iowa: Appanoose, Lucas, Monroe, Wayne.',{state:'IA',phone:'641-436-1775',action:'See local application information'}),
 resource('habitat','Nonprofit repairs & home access','Habitat for Humanity',
  'https://www.habitat.org/our-work/aging-in-place','nonprofit',
  'Local Habitat affiliates may offer critical repairs and accessibility modifications through aging-in-place work. Age, income, project rules, and available services vary locally.',
  'Participating U.S. affiliates; confirm local service.',{action:'Find a local Habitat',actionUrl:'https://www.habitat.org/volunteer/near-you/find-your-local-habitat'}),
 resource('housing-agency','Help finding an affordable rental','Local public housing agencies',HOUSING_LINKS.pha,'rental',
  'Ask the agency serving your area about housing vouchers, accessible rentals, application help, and open waiting lists.',
  'U.S. local housing agencies; area eligibility and vacancies vary.',{action:'Find my housing agency'}),
 resource('community-action','Find local nonprofit support','National Community Action Partnership',
  'https://communityactionpartnership.com/find-a-cap/','nonprofit',
  'Find a Community Action agency by state, county, ZIP, or service. Ask the local agency which housing and energy programs it currently offers.',
  'U.S. Community Action network; local services vary.',{action:'Find a Community Action agency'}),
 resource('iowa-modifications','Bathroom & accessibility options','Iowa Health and Human Services',
  'https://hhs.iowa.gov/family-community/aging-services/home-modification','bath',
  'Find home modification guidance and ask about an assessment or qualifying Medicaid waiver services. Modifications require an individual program review.',
  'Iowa; Medicaid and other program requirements vary.',{state:'IA',action:'Explore Iowa home modifications'})
]);
export const housingResource=id=>HOUSING_HELP_RESOURCES.find(r=>r.id===id)||null;
export const HOUSING_RESOURCE_ALIASES=Object.freeze({
 'bath-access':['bathroom help','accessible bathroom','bath help','rebuilding together'],
 'home-repair':['roof repair help','home repair loan','usda repair','section 504'],
 'home-loan':['usda purchase','section 502'],
 sieda:['sieda','seida','sieda community action'],scicap:['scicap','south central iowa community action'],
 'chariton-valley':['chariton valley housing','chariton valley housing trust fund'],
 habitat:['habitat','habitat for humanity'], 'housing-agency':['section 8','rental assistance'],
 'community-action':['community action agency','nonprofit housing help'],
 'iowa-modifications':['iowa home modification','iowa bathroom help']
});
export const housingResourceRoute=id=>housingResource(id)?'/housing-help.html?resource='+encodeURIComponent(id):'';
export function housingCompanions({state='',goal='buy'}={},rotation=0){
 const iowa=state===''||state==='IA';
 const preferred=iowa?['bath-access','home-repair','home-loan','sieda','scicap','chariton-valley','iowa-modifications','habitat','housing-agency','community-action']:
  ['bath-access','home-repair','home-loan','habitat','housing-agency','community-action'];
 if(goal==='buy')preferred.unshift(...preferred.splice(preferred.indexOf('home-loan'),1));
 if(goal==='rent')preferred.unshift(...preferred.splice(preferred.indexOf('housing-agency'),1));
 const start=(Math.max(0,Number.isInteger(rotation)?rotation:0)*6)%preferred.length;
 return Array.from({length:Math.min(6,preferred.length)},(_,i)=>housingResource(preferred[(start+i)%preferred.length]));
}
export function housingResourceCard(resource){
 const r=housingResource(resource?.id);if(!r)return null;
 return {id:'housing-help-'+r.id,name:r.title,kind:'Housing help',category:'Housing',official:r.url,internal:true,description:r.description,feature:'Housing help from '+r.provider,
  route:housingResourceRoute(r.id),shareImage:'/assets/share/housing-help-'+r.id+'.png',
  shareDescription:r.provider+': '+r.description+' '+r.area};
}
