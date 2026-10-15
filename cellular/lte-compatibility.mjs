/**
 * Reference LTE radio eligibility for selected Moto G Pure variants.
 *
 * No phone identifiers, carrier passwords or SIM authentication information
 * are accessed here. A compatible frequency is NOT permission to transmit.
 */
export const MOTOROLA_VARIANTS=Object.freeze({
 "XT2163-4":Object.freeze([1,2,3,4,5,7,8,12,13,17,25,26,38,40,41,66,71]),
 "XT2163-6":Object.freeze([2,4,5,12,14,30,66])
});
export const COMMON_CANDIDATES=Object.freeze([2,4,5,12,66]);
export function evaluateBand({variant,band,rightsGranted=false,simOperatorAgreement=false,coreAuthorized=false,backhaulVerified=false}={}){
 const listed=Object.hasOwn(MOTOROLA_VARIANTS,variant);
 const target=Number(band);
 const supported=listed&&Number.isInteger(target)&&MOTOROLA_VARIANTS[variant].includes(target);
 const isLicensedCandidate=COMMON_CANDIDATES.includes(target);
 const results={
  deviceKnown:listed,
  bandSupportedInPublishedSpecification:supported,
  bandLicensedSpectrum:isLicensedCandidate,
  existingSimCanBeUsedWithoutReplacement:!!simOperatorAgreement,
  actualRFNetworkConnected:false,
  publicInternetValidated:false
 };
 const blockers=[];
 if(!listed)blockers.push("Exact Motorola variant not established");
 if(!supported)blockers.push("This LTE band is not listed for the selected handset variant");
 if(!isLicensedCandidate)blockers.push("Band not in the common licensed-band candidate set");
 if(!rightsGranted)blockers.push("No independently verified spectrum/licensee authority");
 if(!simOperatorAgreement)blockers.push("No authorized SIM issuer agreement, roaming or provisioning");
 if(!coreAuthorized)blockers.push("No confirmed operator network core integration");
 if(!backhaulVerified)blockers.push("No verified Internet uplink and device data test");
 return {...results,band:target,variant:listed?variant:"unknown",
  proposalEligibleForLicensedPilot:listed&&supported&&isLicensedCandidate,
  operatorAssertionsCompleteUnverified:blockers.length===0,
  serviceActive:false,blockers};
}
