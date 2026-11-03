/** Public-source catalog helpers; no merchant checkout, paid offers or wallet state. */
export const departments=Object.freeze(['Mixed','Food','Fashion','Home']);
export const CATALOG_ENDPOINT='https://quantaphi-product-directory.marvaseater.workers.dev';
const ID=/^[a-z0-9][a-z0-9-]{0,63}$/;
export function officialLink(raw){
 try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||!url.hostname||url.hostname==='localhost')return null;return url.href;}
 catch{return null;}
}
export function requestPath(department='Mixed',page=0){
 if(!departments.includes(department)||!Number.isInteger(page)||page<0||page>50)return null;
 const paging=`limit=24&offset=${page*24}`;
 return department==='Mixed'?`/v1/mixed?${paging}`:`/v1/brands?department=${encodeURIComponent(department)}&${paging}`;
}
const sourceDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=Date.now()+86400000;
export function readBrands(payload,department='Mixed'){
 if(!departments.includes(department)||!Array.isArray(payload?.data))return [];
 const found=new Set();return payload.data.filter(item=>{
  if(!item||typeof item!=='object'||!ID.test(item.brand_id||'')||typeof item.name!=='string'||!item.name.trim()||!officialLink(item.official_url)||!officialLink(item.source_url))return false;
  if(item.source_state!=='official_site_verified'||!sourceDate(item.source_checked_at)||item.adult_restricted===1||item.adult_restricted===true)return false;
  if(!departments.slice(1).includes(item.primary_department)||department!=='Mixed'&&item.primary_department!==department||found.has(item.brand_id))return false;
  found.add(item.brand_id);return true;
 }).map(item=>({brand_id:item.brand_id,name:item.name.trim().slice(0,110),official_url:officialLink(item.official_url),source_url:officialLink(item.source_url),description:typeof item.description==='string'?item.description.slice(0,350):'',primary_department:item.primary_department,primary_shelf:typeof item.primary_shelf==='string'?item.primary_shelf.slice(0,90):'',source_checked_at:item.source_checked_at}));
}
export function readCollections(payload,brandId){
 if(!ID.test(brandId||'')||!Array.isArray(payload?.data))return [];
 const found=new Set();return payload.data.filter(item=>item&&item.brand_id===brandId&&ID.test(item.collection_id||'')&&typeof item.title==='string'&&item.title.trim()&&officialLink(item.source_url)&&sourceDate(item.source_checked_at)&&!found.has(item.collection_id)&&!!found.add(item.collection_id)).map(item=>({collection_id:item.collection_id,title:item.title.slice(0,110),source_url:officialLink(item.source_url),source_checked_at:item.source_checked_at}));
}
export function chooseBrand(rows,index,offset){return Array.isArray(rows)&&rows.length?rows[((index+offset)%rows.length+rows.length)%rows.length]:null;}
