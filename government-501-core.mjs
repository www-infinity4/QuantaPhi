/* 501 Affiliates · independent directory of verified, public U.S. agency
 * resources. A QuantaPhi card is NOT a federal employment, agency-affiliation,
 * authorization, contractor badge or credential. No internal worker tools. */
export const GOV501_RESOURCES=Object.freeze([
 {id:'agency-directory',title:'Find government agencies',category:'Directory',url:'https://www.usa.gov/agency-index/',access:'public',
  description:'Find the official department website, phone, address and public agency contact information.'},
 {id:'open-data',title:'Government open datasets',category:'Public APIs',url:'https://data.gov/',access:'public',
  description:'Browse published government open data before requesting a provider-specific integration.'},
 {id:'data-developers',title:'Government API developer access',category:'Public APIs',url:'https://api.data.gov/',access:'account-required',
  description:'Discover API documentation and obtain a key where the publisher requires one; public data only.'},
 {id:'agency-developers',title:'Login.gov agency developer guide',category:'Agency developer',url:'https://developers.login.gov/',access:'agency-approval',
  description:'Read integration requirements. An agency partnership and approval are required before using production Login.gov integrations.'},
 {id:'official-signin',title:'Government sign-in guide',category:'Accounts',url:'https://www.login.gov/',access:'account-required',
  description:'Sign in only at the official agency or Login.gov website using your own authorized account.'},
 {id:'government-jobs',title:'USAJOBS · Government careers',category:'Work opportunities',url:'https://www.usajobs.gov/',access:'account-required',
  description:'Find and apply for federal public-sector jobs. An application is not employee status or tool access.'},
 {id:'government-procurement',title:'SAM.gov · Federal contracting',category:'Work opportunities',url:'https://sam.gov/',access:'account-required',
  description:'Explore federal contract opportunities and official entity registration requirements.'},
 {id:'public-records',title:'FOIA.gov · Request public records',category:'Public records',url:'https://www.foia.gov/',access:'public',
  description:'Learn about public-records requests and contact participating agencies through official channels.'}
]);
const HOSTS=new Set(['www.usa.gov','usa.gov','data.gov','api.data.gov','developers.login.gov','login.gov','www.login.gov','www.usajobs.gov','sam.gov','www.sam.gov','www.foia.gov','www.gsa.gov']);
export function officialResourceUrl(value){
 try{
  const u=new URL(String(value||''));
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&HOSTS.has(u.hostname.toLowerCase())?u.href:'';
 }catch{return ''}
}
export function selectGovernmentResources(query=''){
 const q=String(query||'').trim().slice(0,80).toLowerCase();
 if(!q)return GOV501_RESOURCES;
 return GOV501_RESOURCES.filter(row=>[row.title,row.category,row.description,row.id].join(' ').toLowerCase().includes(q));
}
