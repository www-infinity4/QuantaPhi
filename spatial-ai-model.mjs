/* Spatial AI: data-only local OBJ geometry; no remote processing. */
export const CUBE_OBJ=[
 '# Example geometry, not a camera reconstruction.',
 'v -1 -1 -1','v 1 -1 -1','v 1 1 -1','v -1 1 -1',
 'v -1 -1 1','v 1 -1 1','v 1 1 1','v -1 1 1',
 'f 1 2 3','f 1 3 4','f 5 8 7','f 5 7 6',
 'f 1 5 6','f 1 6 2','f 2 6 7','f 2 7 3',
 'f 3 7 8','f 3 8 4','f 5 1 4','f 5 4 8'
].join('\n');
const bad=(message)=>{throw new Error(message);};
export function parseOBJ(input,{maxBytes=1_000_000,maxVertices=5000,maxFaces=10000}={}){
 if(typeof input!=='string'||new TextEncoder().encode(input).length>maxBytes)bad('OBJ exceeds file size limit.');
 const vertices=[],faces=[];
 for(const line of input.split(/\r?\n/)){
  const parts=line.trim().split(/\s+/),type=parts[0];
  if(type==='v'){
   if(parts.length<4)bad('Invalid OBJ vertex.');
   const v=parts.slice(1,4).map(Number);
   if(v.some(n=>!Number.isFinite(n)||Math.abs(n)>1e7))bad('Non-finite or out-of-range vertex.');
   if(vertices.push(v)>maxVertices)bad('Too many vertices.');
  }else if(type==='f'){
   if(parts.length<4||parts.length>65)bad('Only faces with 3–64 corners are supported.');
   const ids=parts.slice(1).map(p=>{
    const part=p.split('/')[0];
    if(!/^[1-9]\d*$/.test(part))bad('Only positive OBJ vertex indices are supported.');
    const id=Number(part)-1;
    if(!Number.isSafeInteger(id)||id>=vertices.length)bad('OBJ face references an unavailable vertex.');
    return id;
   });
   if(new Set(ids).size!==ids.length)bad('Degenerate OBJ face.');
   for(let i=1;i<ids.length-1;i++){
    if(faces.push([ids[0],ids[i],ids[i+1]])>maxFaces)bad('Too many faces.');
   }
  }
 }
 if(vertices.length<3||!faces.length)bad('OBJ needs at least three vertices and one face.');
 const spans=[0,1,2].map(a=>Math.max(...vertices.map(v=>v[a]))-Math.min(...vertices.map(v=>v[a])));
 if(Math.max(...spans)<1e-9)bad('Degenerate OBJ size.');
 return {vertices,faces};
}
export function normalizeMesh({vertices,faces}){
 const min=[0,1,2].map(a=>Math.min(...vertices.map(v=>v[a])));
 const max=[0,1,2].map(a=>Math.max(...vertices.map(v=>v[a])));
 const center=min.map((n,i)=>(n+max[i])/2);
 const length=Math.max(...max.map((n,i)=>n-min[i]));
 if(!Number.isFinite(length)||length<1e-9)bad('Degenerate OBJ size.');
 return {vertices:vertices.map(v=>v.map((n,i)=>(n-center[i])*2/length)),faces};
}
export function projectVertices(vertices,{yaw=.5,pitch=.3,scale=90}={}){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 return vertices.map(([x,y,z])=>{
  const xx=x*cy-z*sy,zz=x*sy+z*cy;
  return [xx*scale,(y*cp-zz*sp)*scale];
 });
}
export function meshSummary(mesh){
 return mesh.vertices.length+' vertices · '+mesh.faces.length+' faces · local geometry, not verified measurements';
}
