// Pin only the explicitly configured entrypoint bytes. Its relative imports
// still use the original file location; dependencies are trusted host code.
let entry,source;
export function initialize(data){entry=data.entry;source=data.source;}
export async function resolve(specifier,context,next){
 if(specifier===entry)return {url:entry,shortCircuit:true};
 return next(specifier,context);
}
export async function load(url,context,next){
 if(url===entry)return {format:'module',source,shortCircuit:true};
 return next(url,context);
}
