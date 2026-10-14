/* Pure mathematical resonance tool; extracted from the owned Resonance-calculator v3.
 * No browser DOM, model calls, network or automatic token payouts.
 * Source: https://github.com/www-infinity4/Resonance-calculator
 * Keep conceptual material roles separate from idealized RF engineering. */
export const CALCULATOR_SOURCE='https://github.com/www-infinity4/Resonance-calculator';
export const ELEMENTS=Object.freeze([
  { z:3,  sym:"Li", name:"Lithium",       mass:6.941,   cat:"Alkali metal",         elec:"Conductor",                  rho:9.28e-8,  role:"Lightest metallic signal carrier — alkali primary emitter" },
  { z:10, sym:"Ne", name:"Neon",          mass:20.180,  cat:"Noble gas",             elec:"Gas / non-RF conductor",     rho:null,     role:"Luminescent discharge medium — photonic excitation reference" },
  { z:18, sym:"Ar", name:"Argon",         mass:39.948,  cat:"Noble gas",             elec:"Gas / non-RF conductor",     rho:null,     role:"Inert discharge envelope — controlled plasma reference" },
  { z:28, sym:"Ni", name:"Nickel",        mass:58.693,  cat:"Transition metal",      elec:"Conductor",                  rho:6.99e-8,  role:"Ferromagnetic core reservoir — magnetic field anchor" },
  { z:29, sym:"Cu", name:"Copper",        mass:63.546,  cat:"Transition metal",      elec:"Conductor",                  rho:1.72e-8,  role:"High-conductance current bus — primary RF signal trace" },
  { z:40, sym:"Zr", name:"Zirconium",     mass:91.224,  cat:"Transition metal",      elec:"Conductor",                  rho:4.21e-7,  role:"Structural resonance frame — high-temperature stability anchor" },
  { z:42, sym:"Mo", name:"Molybdenum",    mass:95.96,   cat:"Transition metal",      elec:"Conductor",                  rho:5.34e-8,  role:"High-melting-point RF bridge — thermal stability reference" },
  { z:43, sym:"Tc", name:"Technetium",    mass:98,      cat:"Transition metal",      elec:"Conductor (radioactive)",    rho:2.0e-7,   role:"⚠ Radioactive synthetic element — laboratory research reference only", radioactive:true },
  { z:46, sym:"Pd", name:"Palladium",     mass:106.42,  cat:"Transition metal",      elec:"Conductor",                  rho:1.05e-7,  role:"Catalytic interface layer — hydrogen-absorption reference" },
  { z:47, sym:"Ag", name:"Silver",        mass:107.868, cat:"Transition metal",      elec:"Conductor",                  rho:1.59e-8,  role:"Maximum-conductivity signal emitter — primary RF transmitter" },
  { z:48, sym:"Cd", name:"Cadmium",       mass:112.411, cat:"Transition metal",      elec:"Conductor",                  rho:7.2e-8,   role:"Intermetallic boundary layer — galvanic isolation reference" },
  { z:49, sym:"In", name:"Indium",        mass:114.818, cat:"Post-transition metal", elec:"Conductor",                  rho:8.37e-8,  role:"Soft metallic shield interface — low-temperature bonding medium" },
  { z:50, sym:"Sn", name:"Tin",           mass:118.710, cat:"Post-transition metal", elec:"Conductor",                  rho:1.09e-7,  role:"Solder-matrix conductor — mechanical bonding reference" },
  { z:51, sym:"Sb", name:"Antimony",      mass:121.760, cat:"Metalloid",             elec:"Metalloid / semiconductor",  rho:4.17e-7,  role:"Metalloid dopant bridge — n-type semiconductor reference" },
  { z:52, sym:"Te", name:"Tellurium",     mass:127.600, cat:"Metalloid",             elec:"Semiconductor",              rho:null,     role:"Photovoltaic chalcogenide — thermoelectric junction reference" },
  { z:53, sym:"I",  name:"Iodine",        mass:126.904, cat:"Halogen",               elec:"Insulator / non-conductor",  rho:null,     role:"Halide oxidiser layer — reactive boundary reference" },
  { z:54, sym:"Xe", name:"Xenon",         mass:131.293, cat:"Noble gas",             elec:"Gas / non-RF conductor",     rho:null,     role:"Heavy noble-gas resonator — high-pressure discharge reference" },
  { z:55, sym:"Cs", name:"Cesium",        mass:132.905, cat:"Alkali metal",          elec:"Conductor",                  rho:2.05e-7,  role:"Atomic clock reference metal — precision frequency standard" },
  { z:56, sym:"Ba", name:"Barium",        mass:137.327, cat:"Alkaline earth metal",  elec:"Conductor",                  rho:3.5e-7,   role:"Electron-emitting cathode base — thermionic emission reference" },
  { z:57, sym:"La", name:"Lanthanum",     mass:138.905, cat:"Lanthanide",            elec:"Conductor",                  rho:6.1e-7,   role:"Rare-earth optical dopant — glass refraction modifier" },
  { z:58, sym:"Ce", name:"Cerium",        mass:140.116, cat:"Lanthanide",            elec:"Conductor",                  rho:7.5e-7,   role:"Oxidation-resilient rare earth — catalytic surface layer" },
  { z:59, sym:"Pr", name:"Praseodymium",  mass:140.908, cat:"Lanthanide",            elec:"Conductor",                  rho:7.0e-7,   role:"Green-spectrum optical dopant — fibre-optic amplifier reference" },
  { z:60, sym:"Nd", name:"Neodymium",     mass:144.242, cat:"Lanthanide",            elec:"Conductor",                  rho:6.4e-7,   role:"Permanent magnet rare earth — high-field storage reference" },
  { z:61, sym:"Pm", name:"Promethium",    mass:145,     cat:"Lanthanide",            elec:"Conductor (radioactive)",    rho:null,     role:"⚠ Radioactive synthetic rare earth — nuclear research reference only", radioactive:true },
  { z:62, sym:"Sm", name:"Samarium",      mass:150.36,  cat:"Lanthanide",            elec:"Conductor",                  rho:9.4e-7,   role:"Samarium-cobalt magnet base — high-coercivity field anchor" },
  { z:63, sym:"Eu", name:"Europium",      mass:151.964, cat:"Lanthanide",            elec:"Conductor",                  rho:9.0e-7,   role:"Red-phosphor rare earth — luminescence frequency reference" },
  { z:64, sym:"Gd", name:"Gadolinium",    mass:157.25,  cat:"Lanthanide",            elec:"Conductor",                  rho:1.3e-6,   role:"Neutron-absorbing magnetic rare earth — MRI contrast reference" },
  { z:65, sym:"Tb", name:"Terbium",       mass:158.925, cat:"Lanthanide",            elec:"Conductor",                  rho:1.15e-6,  role:"Green-phosphor terbium — solid-state lighting reference" },
  { z:66, sym:"Dy", name:"Dysprosium",    mass:162.500, cat:"Lanthanide",            elec:"Conductor",                  rho:9.2e-7,   role:"High-anisotropy rare earth — high-temperature magnet additive" },
  { z:67, sym:"Ho", name:"Holmium",       mass:164.930, cat:"Lanthanide",            elec:"Conductor",                  rho:8.1e-7,   role:"Highest magnetic moment rare earth — pole-piece field concentrator" },
  { z:68, sym:"Er", name:"Erbium",        mass:167.259, cat:"Lanthanide",            elec:"Conductor",                  rho:8.6e-7,   role:"Optical amplifier dopant — 1550 nm fibre reference" },
  { z:69, sym:"Tm", name:"Thulium",       mass:168.934, cat:"Lanthanide",            elec:"Conductor",                  rho:6.7e-7,   role:"Thulium fibre-laser rare earth — 2 µm spectral reference" },
  { z:70, sym:"Yb", name:"Ytterbium",     mass:173.054, cat:"Lanthanide",            elec:"Conductor",                  rho:2.5e-7,   role:"Ytterbium precision laser — optical clock frequency reference" },
]);
const BY_SYMBOL=new Map(ELEMENTS.map(e=>[e.sym.toLowerCase(),e]));
const BY_NAME=new Map(ELEMENTS.map(e=>[e.name.toLowerCase(),e]));
const C0=299792458,MU0=4*Math.PI*1e-7;
const L_UNITS=Object.freeze({H:1,mH:1e-3,uH:1e-6});
const C_UNITS=Object.freeze({F:1,uF:1e-6,nF:1e-9,pF:1e-12});
const MAGNETIC=new Set(['Ni','Gd','Dy','Tb','Ho','Er']);
const CAUTION=new Set(['Cd','Cs','Ba','Tc','Pm']);
function quantity(value,unit,units,name){
 if(typeof value!=='number'&&typeof value!=='string')throw Error(name+'_required');
 if(!Object.hasOwn(units,unit))throw Error(name+'_unit_invalid');
 // Number() is intentionally strict: avoid accepting '10junk' via parseFloat.
 const n=typeof value==='number'?value:Number(value.trim());
 if(!Number.isFinite(n)||n<=0||n>1e12)throw Error(name+'_invalid');
 const si=n*units[unit];
 if(!Number.isFinite(si)||si<=0||si>1e12)throw Error(name+'_out_of_range');
 return si;
}
function element(value){
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='string'||value.length>50)throw Error('element_invalid');
 const raw=value.trim().toLowerCase();
 const result=BY_SYMBOL.get(raw)||BY_NAME.get(raw);
 if(!result)throw Error('element_unavailable_in_v3');
 return result;
}
function positive(value,name){
 const n=typeof value==='number'?value:typeof value==='string'?Number(value.trim()):NaN;
 if(!Number.isFinite(n)||n<=0||n>1e12)throw Error(name+'_invalid');
 return n;
}
export function calculateResonance(args={}){
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('resonance_arguments_required');
 const L=quantity(args.inductance??args.l,args.inductanceUnit??args.lUnit??'uH',L_UNITS,'inductance');
 const C=quantity(args.capacitance??args.c,args.capacitanceUnit??args.cUnit??'pF',C_UNITS,'capacitance');
 const f=1/(2*Math.PI*Math.sqrt(L*C));
 if(!Number.isFinite(f)||f<=0||f>1e15)throw Error('frequency_out_of_range');
 const wave=C0/f;
 const src=element(args.source),load=element(args.load);
 const zpRaw=args.primaryImpedanceOhms??args.zp, zsRaw=args.secondaryImpedanceOhms??args.zs;
 if((zpRaw===undefined)!==(zsRaw===undefined))throw Error('both_impedances_required');
 const ratios=zpRaw===undefined?null:(()=>{
  const zp=positive(zpRaw,'primary_impedance'),zs=positive(zsRaw,'secondary_impedance');
  return {primaryOhms:zp,secondaryOhms:zs,impedanceRatio:zp/zs,idealTurnsRatio:Math.sqrt(zp/zs)};
 })();
 const warnings=['Ideal LC and transformer equations exclude component losses, parasitics, temperature effects and loaded Q.'];
 if(src?.radioactive||load?.radioactive)warnings.push('Radioactive material: reference data only; do not use in consumer hardware.');
 if((src&&CAUTION.has(src.sym))||(load&&CAUTION.has(load.sym)))warnings.push('Material may present substantial chemical or handling hazards; do not infer physical safety from this calculator.');
 let skinDepthMeters=null;
 if(src&&MAGNETIC.has(src.sym)){
  warnings.push('Skin depth omitted for magnetic source material: permeability is frequency-dependent and not available in the v3 database.');
 }else if(src?.rho!==null&&src?.rho!==undefined&&Number.isFinite(src.rho)&&src.rho>0){
  skinDepthMeters=Math.sqrt(src.rho/(Math.PI*f*MU0)); // µr = 1 approximation only
  warnings.push('Skin depth assumes nonmagnetic bulk conductivity at ordinary conditions (µr ≈ 1).');
 }
 return {
  model:'ideal-resonance-v1',
  sourceRepository:CALCULATOR_SOURCE,
  engineering:{
   inductanceHenries:L,capacitanceFarads:C,frequencyHz:f,
   wavelengthMeters:wave,quarterWavelengthMeters:wave/4,
   rfBand:f<3e3?'ELF':f<3e4?'VLF':f<3e5?'LF':f<3e6?'MF':f<3e7?'HF':f<3e8?'VHF':f<3e9?'UHF':f<3e10?'SHF':'EHF',
   ...ratios?{transformer:ratios}:{},
   ...(skinDepthMeters!==null?{estimatedSkinDepthMeters:skinDepthMeters}:{})
  },
  materials:src||load?{source:src?{symbol:src.sym,atomicNumber:src.z,name:src.name}:null,load:load?{symbol:load.sym,atomicNumber:load.z,name:load.name}:null}:null,
  symbolic:src&&load?{
   atomicNumberRatio:src.z/load.z,
   atomicNumberSum:src.z+load.z,
   atomicMassRatio:src.mass/load.mass,
   classification:'conceptual comparison, not a measured coupling or energy-transfer result'
  }:null,
  warnings
 };
}
const NUM='(\\d+(?:\\.\\d+)?|\\.\\d+)(?:\\s*e([+-]?\\d+))?';
function readQuantity(text,kind){
 const suffix=kind==='l'?'(microhenries|microhenrys|microhenry|millihenries|millihenry|henries|henry|uH|µH|mH|H)':'(picofarads?|nanofarads?|microfarads?|farads?|pF|nF|uF|µF|F)';
 const r=new RegExp(NUM+'\\s*'+suffix+'(?=\\b|\\s|$|[,.;!?])','ig');
 const m=r.exec(text);
 if(!m)return null;
 const value=Number(m[1])*(m[2]?10**Number(m[2]):1);
 const unit=m[3].toLowerCase();
 return {value,unit:kind==='l'?(unit.includes('micro')||unit==='uh'||unit==='µh'?'uH':unit.includes('milli')||unit==='mh'?'mH':'H'):(unit.includes('pico')||unit==='pf'?'pF':unit.includes('nano')||unit==='nf'?'nF':unit.includes('micro')||unit==='uf'||unit==='µf'?'uF':'F')};
}
// Deterministic extraction of two quantities from spoken or typed input.
// Does not silently fill missing component values or synthesize readings.
export function parseResonanceSpeech(text){
 const request=String(text||'').slice(0,2000);
 const l=readQuantity(request,'l'),c=readQuantity(request,'c');
 if(!l||!c)return null;
 return {inductance:l.value,inductanceUnit:l.unit,capacitance:c.value,capacitanceUnit:c.unit};
}
export function describeResonance(result){
 const e=result.engineering;
 const scaled=e.frequencyHz>=1e9?(e.frequencyHz/1e9).toFixed(3)+' GHz':e.frequencyHz>=1e6?(e.frequencyHz/1e6).toFixed(3)+' MHz':e.frequencyHz>=1e3?(e.frequencyHz/1e3).toFixed(3)+' kHz':e.frequencyHz.toFixed(3)+' Hz';
 return 'Ideal LC resonance: '+scaled+' ('+e.rfBand+'), wavelength '+e.wavelengthMeters.toPrecision(5)+' m, quarter-wave '+e.quarterWavelengthMeters.toPrecision(5)+' m.'
   +(e.transformer?' Ideal turns ratio '+e.transformer.idealTurnsRatio.toPrecision(6)+':1.':'')
   +' Conceptual material comparisons are not physical measurements.';
}
