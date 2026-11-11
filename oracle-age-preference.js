/* Oracle age-interest exposure: an adult content preference is never age verification.
 * Only persistent value is 'skip'; the spacing counter is anonymous device-local.
 * No ad targeting, medical information, identity or wallet data is persisted. */
(function(global){
'use strict';
const SKIP='oracle:adult-discovery-skip:v1';
const DISTANCE='oracle:adult-discovery-distance:v1';
let browsingThisVisit=false;
const readStore=k=>{try{return localStorage.getItem(k)}catch{return null}};
const writeStore=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
const removeStore=k=>{try{localStorage.removeItem(k)}catch{}};
const count=()=>Math.min(200,Math.max(0,parseInt(readStore(DISTANCE)||'0',10)||0));
function isPreference(e){return e?.id==='infinityAdultContentCard'||e?.id==='adult-content-preferences';}
function isAdult(e){
 if(isPreference(e))return true;
 const id=String(e?.id||''),category=String(e?.category||''),title=String(e?.title||'');
 return /^dispensary-|^adult-store-|^cannabis|bruceBannerWeedmapsCard/i.test(id)||
  /21\+|adult|dispensary|cannabis|tobacco|nicotine/i.test(category)||
  /^21\+[\s·:-]/i.test(title);
}
function read(){return {skipped:readStore(SKIP)==='1',nonAdultSince:count(),browsingThisVisit};}
function canAutoShow(e){
 if(!isAdult(e))return true;
 if(read().skipped)return false;
 return isPreference(e)?count()>=12:browsingThisVisit&&count()>=10;
}
function noteShown(e){
 if(!e)return;
 if(isAdult(e)){writeStore(DISTANCE,'0');return;}
 writeStore(DISTANCE,String(Math.min(200,count()+1)));
}
function noteSkipped(){writeStore(SKIP,'1');browsingThisVisit=false;writeStore(DISTANCE,'0');}
function acknowledgeBrowse(){removeStore(SKIP);browsingThisVisit=true;writeStore(DISTANCE,'0');}
global.QuantaAgePreferences=Object.freeze({isAdult,isPreference,read,canAutoShow,noteShown,noteSkipped,acknowledgeBrowse});
})(window);
