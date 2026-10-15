/* Infinity Cellular pilot readiness: deterministic and fail-closed.
 * This is a design/verification model, not cellular network provisioning.
 * User-entered statements do not constitute regulatory or deployment evidence.
 */
export const CELLULAR_PLAN_VERSION = 1;
export const DEFAULT_PILOT = Object.freeze({
  version:CELLULAR_PLAN_VERSION,
  networkName:"Infinity Cellular",
  pilotType:"private-cbrs-lte",
  band:"CBRS 3550–3700 MHz (LTE B48)",
  core:"Open5GS EPC (4G)",
  coverage:"single-site pilot",
  radio:"FCC-authorized CBRS CBSD + appropriate antennas",
  radioAuthorized:false,
  spectrumCoordinated:false,
  deviceBandSupported:false,
  testSimProvisioned:false,
  coreInstalled:false,
  upstreamConnected:false,
  permittedBackhaul:"none",
  rfEnvironmentVerified:false,
  dataPathProven:false,
  emergencyService:"not provided by this pilot",
  userPrice:"free to user only if funded by operator/sponsor",
  testSiteDescription:"",
  labNotes:""
});
const FIELDS=[
  {key:"radioAuthorized",label:"FCC-authorized CBRS base station identified and installation planned"},
  {key:"spectrumCoordinated",label:"SAS coordination and any required installer registration confirmed"},
  {key:"deviceBandSupported",label:"Test phone or modem supports the intended CBRS LTE band"},
  {key:"testSimProvisioned",label:"Test SIM and subscriber credentials properly provisioned"},
  {key:"coreInstalled",label:"Open5GS EPC core running on a server"},
  {key:"upstreamConnected",label:"Independent wired or otherwise legitimate Internet backhaul connected"},
  {key:"rfEnvironmentVerified",label:"Location, RF power and interference rules verified"},
  {key:"dataPathProven",label:"Real-device LTE attach and public WAN packet test recorded"}
];
export const PILOT_FIELDS = Object.freeze(FIELDS.map(f=>Object.freeze(f)));
export function normalizePilot(value={}){
 const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const out={...DEFAULT_PILOT};
 for(const f of PILOT_FIELDS)out[f.key]=v[f.key]===true;
 for(const key of ["testSiteDescription","labNotes"]){
  if(typeof v[key]==='string')out[key]=v[key].trim().slice(0,key==="labNotes"?1200:150);
 }
 if(["none","fiber-isp","licensed-fixed","existing-cellular","other-legal"].includes(v.permittedBackhaul))
  out.permittedBackhaul=v.permittedBackhaul;
 return out;
}
export function readiness(value){
 const plan=normalizePilot(value);
 const outstanding=PILOT_FIELDS.filter(f=>!plan[f.key]).map(f=>f.label);
 if(plan.permittedBackhaul==="none")outstanding.push("Specify a lawful, working upstream Internet service (the website cannot supply radio backhaul)");
 if(plan.permittedBackhaul==="existing-cellular")outstanding.push("Cellular backhaul still depends on another carrier and does not establish independence");
 return {plan,remaining:outstanding,completed:PILOT_FIELDS.length-PILOT_FIELDS.filter(f=>!plan[f.key]).length,
  total:PILOT_FIELDS.length,readiness:outstanding.length===0?"operator_claims_complete_unverified":"not_ready",
  live:false,proof:"Never assume RF transmission, real-device LTE attachment, or free Internet connectivity from website form inputs.",
  canAdvertiseService:false};
}
export function manifest(value){
 const status=readiness(value),p=status.plan;
 return {
  schema:"infinity-cellular-pilot/v1",
  generatedAt:new Date().toISOString(),
  publicSite:"https://quantaphi.org/cellular/",
  architecture:{
   lastMile:"Customer phone LTE Band 48 → authorized CBRS base station (CBSD)",
   radioAccess:"CBSD → local routed backhaul → Open5GS LTE core",
   coreAndInternet:"EPC gateway (PGW/UPF) → firewall/NAT/IPv6 → independently sourced ISP uplink → public Internet",
   phoneService:"Infinity Switchboard web calls work when the handset has an IP data path",
   authentication:"Operator-controlled test SIM/USIM in core; never store IMSI/K/OPc/secret keys on public websites"
  },
  statements:{
   zeroUserFeePossible:"Possible only when someone else pays for the equipment, spectrum coordination and upstream Internet service.",
   freeUplinkFromWebsite:false,
   carrierReplacementReady:false,
   emergencyCallingIncluded:false,
   satelliteReplacementReady:false
  },
  plan:p,readiness:status.readiness,outstanding:status.remaining,
  links:{
   cbrs:"https://www.nist.gov/programs-projects/citizens-broadband-radio-service",
   open5gs:"https://open5gs.org/open5gs/docs/guide/01-quickstart/"
  }
 };
}
