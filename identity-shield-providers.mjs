/* Infinity Identity Shield: reviewed external protection routes only.
 * These are direct, user-operated government and bureau pages—not partnerships,
 * OAuth connections, account monitoring, automated credit freezes or endorsements.
 * Never accept SSNs, credentials, or private reports in this module.
 */
const entries=[
 {
  id:'equifax',name:'Equifax',category:'Credit bureau',
  action:'Manage Equifax security freeze',
  detail:'A free credit-file freeze is managed with Equifax directly.',
  url:'https://www.equifax.com/personal/credit-report-services/credit-freeze'
 },
 {
  id:'experian',name:'Experian',category:'Credit bureau',
  action:'Manage Experian security freeze',
  detail:'Place, lift or review your free Experian credit freeze with the bureau.',
  url:'https://www.experian.com/help/credit-freeze/'
 },
 {
  id:'transunion',name:'TransUnion',category:'Credit bureau',
  action:'Manage TransUnion security freeze',
  detail:'Manage a free security freeze in the TransUnion service center.',
  url:'https://www.transunion.com/credit-freeze'
 },
 {
  id:'credit-reports',name:'AnnualCreditReport.com',category:'Credit reports',
  action:'Request official free credit reports',
  detail:'Authorized central website for reports from all three national bureaus.',
  url:'https://www.annualcreditreport.com/'
 },
 {
  id:'irs-ip-pin',name:'Internal Revenue Service',category:'Tax identity protection',
  action:'Get an IRS Identity Protection PIN',
  detail:'The IRS manages tax-return IP PIN enrollment; never share your PIN with QuantaPhi.',
  url:'https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin'
 },
 {
  id:'ssa-account',name:'Social Security Administration',category:'Social Security review',
  action:'Open official my Social Security',
  detail:'Review your own records directly with SSA; no third-party SSN-use feed is connected.',
  url:'https://www.ssa.gov/myaccount/'
 },
 {
  id:'ftc-recovery',name:'Federal Trade Commission',category:'Identity theft recovery',
  action:'Open official identity theft recovery',
  detail:'Report suspected identity theft and receive an individualized recovery plan.',
  url:'https://www.identitytheft.gov/Steps'
 }
];
// Data can only be extended through a reviewed source change. All statuses fail
// closed and do not become 'connected' merely because a user follows a link.
export const shieldProviders=Object.freeze(entries.map(row=>Object.freeze({
 ...row,connection:'external_only',partner_contract:false
})));
export function safeShieldProviderUrl(id,url){
 const known=shieldProviders.find(row=>row.id===id);
 return known&&known.url===url&&url.startsWith('https://')?known.url:null;
}
