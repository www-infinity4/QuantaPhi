/* Source-only, stable QuantaPhi-owned card launcher inventory.
 * This is NOT a build, release, native wrapper, provider app, or permission grant.
 * The original accepted catalog is the sole identity authority; no duplicate
 * hand-maintained list or publisher account credentials are introduced.
 */
import {INFINITY_ACCEPTED_BRANDS,acceptedBrand} from '../../infinity-accepted-catalog.mjs';
export const CARD_LAUNCHER_CONTRACT_VERSION=1;
const SITE_ORIGIN='https://quantaphi.org';
const PACKAGE_PREFIX='org.quantaphi.cards.';
function launcherFor(card){
 if(!card||acceptedBrand(card.id)!==card||!/^[a-z][a-z0-9-]{4,90}$/.test(card.id))return null;
 const packageSuffix=card.id.replace(/-/g,'_');
 const applicationId=PACKAGE_PREFIX+packageSuffix;
 if(applicationId.length>220||!/^[a-z][a-z0-9_]*$/.test(packageSuffix))return null;
 return Object.freeze({
  schemaVersion:CARD_LAUNCHER_CONTRACT_VERSION,
  cardId:card.id,
  applicationId,
  displayName:'QuantaPhi · '+card.name,
  entryUrl:SITE_ORIGIN+'/?card='+encodeURIComponent(card.id),
  allowedOrigins:Object.freeze([SITE_ORIGIN]),
  launchMode:'owned_site_external_browser',
  publisher:'QuantaPhi',
  thirdPartyPublisherApp:false,
  nativePermissions:Object.freeze([]),
  releaseState:'source_only_unverified',
  apkAvailable:false,
  twaVerified:false,
  signingVerified:false
 });
}
export const CARD_LAUNCHER_MANIFESTS=Object.freeze(INFINITY_ACCEPTED_BRANDS.map(launcherFor));
const byId=new Map(CARD_LAUNCHER_MANIFESTS.filter(Boolean).map(m=>[m.cardId,m]));
export function cardLauncherManifest(id){return typeof id==='string'?byId.get(id)||null:null}
export function cardLauncherInventory(){return CARD_LAUNCHER_MANIFESTS.slice()}
export function validateLauncherManifest(m){
 if(!m||typeof m!=='object'||Object.keys(m).some(k=>![
 'schemaVersion','cardId','applicationId','displayName','entryUrl','allowedOrigins',
 'launchMode','publisher','thirdPartyPublisherApp','nativePermissions',
 'releaseState','apkAvailable','twaVerified','signingVerified'].includes(k)))return false;
 const canonical=cardLauncherManifest(m.cardId);
 if(!canonical)return false;
 return Object.keys(canonical).every(k=>JSON.stringify(m[k])===JSON.stringify(canonical[k]));
}
