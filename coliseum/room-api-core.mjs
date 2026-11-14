/* Infinity Coliseum public-beta contract; no fake AI IDs or subscription grants. */
export const BETA_CAPACITY=1000;
export const FREE_EDITION_IDS=Object.freeze(['zeus','hermes']);
export const ROOM_SECTORS=Object.freeze(['Technology','Gaming','Shopping','Business','Science','Media','Education','Art & Design','Community']);
export const clean=(value,limit)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit);
export const validModel=id=>FREE_EDITION_IDS.includes(id);
export const validSector=value=>ROOM_SECTORS.includes(value);
export const validIdea=body=>validModel(body?.modelId)&&validSector(body?.sector)&&clean(body?.title,110).length>=5&&clean(body?.description,1800).length>=12;
export const validMessage=body=>validModel(body?.modelId)&&validSector(body?.sector)&&clean(body?.text,1000).length>=2;
export const canJoin=(n,existing=false)=>existing||(Number.isInteger(n)&&n>=0&&n<BETA_CAPACITY);
export const publicMemberLabel=id=>'Builder-'+String(id||'').slice(0,8);
export function allowsOrigin(origin){
 return origin==='https://quantaphi.org'||origin==='https://www.quantaphi.org';
}
export function editionPolicy(id){
 if(['athena','hephaestus'].includes(id))return {allowed:false,reason:'paid_editions_not_active'};
 if(!validModel(id))return {allowed:false,reason:'unknown_edition'};
 return {allowed:true,reason:'free_beta_only'};
}
