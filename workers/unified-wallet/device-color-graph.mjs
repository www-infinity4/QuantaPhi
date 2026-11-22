// Opt-in visual encoding only. RGB hex is not encryption, identity proof,
// authentication or a recoverable copy of wallet data. Never use color output
// to authorize a balance query, device enrollment, money transfer or recovery.
import {accountDeviceChain} from './device-number-core.mjs';

const PREFIX='QuantaPhi-wallet-device-color-v1:';
const NUMBER=/^\d{39}$/;
const MAX=1n<<128n;
const COLOR=/^#[0-9a-f]{6}$/i;
const enc=new TextEncoder();

function api(cryptoApi){
 if(!cryptoApi?.subtle?.digest)throw Error('cryptographic SHA-256 required for color checksum');
 return cryptoApi;
}
async function checksum(number,cryptoApi){
 const digest=new Uint8Array(await api(cryptoApi).subtle.digest('SHA-256',enc.encode(PREFIX+number)));
 return digest.subarray(0,2);
}
function requireNumber(value){
 if(typeof value!=='string'||!NUMBER.test(value))throw Error('39-digit numeric device label required');
 if(BigInt(value)>=MAX)throw Error('device number exceeds 128-bit range');
}
function colors(bytes){
 const result=[];
 for(let i=0;i<bytes.length;i+=3)
  result.push('#'+Array.from(bytes.subarray(i,i+3),n=>n.toString(16).padStart(2,'0')).join('').padEnd(6,'0'));
 return result;
}
export async function encodeDeviceColorTiles(deviceNumber,{crypto:cryptoApi=globalThis.crypto}={}){
 requireNumber(deviceNumber);
 let value=BigInt(deviceNumber);
 const payload=new Uint8Array(18);
 for(let i=15;i>=0;i--){payload[i]=Number(value&255n);value>>=8n}
 payload.set(await checksum(deviceNumber,cryptoApi),16);
 return {format:'wallet-device-color-tiles/v1',tiles:colors(payload),
  isAuthentication:false,walletUnlocked:false,
  note:'Six visible RGB tiles represent one numeric alias, with a short accidental-error checksum. They are not encrypted or secret.'};
}
export async function decodeDeviceColorTiles(graph,{crypto:cryptoApi=globalThis.crypto}={}){
 if(graph?.format!=='wallet-device-color-tiles/v1'||!Array.isArray(graph.tiles)||
  graph.tiles.length!==6||!graph.tiles.every(c=>typeof c==='string'&&COLOR.test(c)))
  throw Error('invalid color graph: expected exactly six #RRGGBB tiles');
 const hex=graph.tiles.map(c=>c.slice(1)).join('');
 const payload=Uint8Array.from(hex.match(/../g),x=>parseInt(x,16));
 let number=0n;
 for(const byte of payload.subarray(0,16))number=(number<<8n)|BigInt(byte);
 const deviceNumber=number.toString(10).padStart(39,'0');
 requireNumber(deviceNumber);
 const check=await checksum(deviceNumber,cryptoApi);
 if(payload[16]!==check[0]||payload[17]!==check[1])
  throw Error('color graph checksum mismatch or corrupted device label');
 return deviceNumber;
}
export async function buildWalletColorWindow({
 verifiedAccountId,linkedAccountId,deviceNumbers=[],crypto:cryptoApi=globalThis.crypto
}={}){
 // Only a *previously authenticated server-supplied list* should be rendered.
 // accountDeviceChain rejects mixing different wallet IDs, but a copied
 // visual window still grants NO permission of any kind.
 const result=await accountDeviceChain({verifiedAccountId,linkedAccountId,deviceNumbers,crypto:cryptoApi});
 const fullHex=result.fingerprint;
 const groups=fullHex.match(/.{1,6}/g).map(group=>'#'+group.padEnd(6,'0'));
 return {format:'wallet-color-window/v1',colors:groups,
  deviceCount:result.deviceCount,isAuthentication:false,authorizesWallet:false,
  walletUnlocked:false,
  note:'Color alignment visualizes a verified wallet-owned device list only; it is copyable and cannot authorize sign-in.'};
}
export function colorWindowsAlign(expected,observed){
 // Deliberately a VISUAL comparison. Do not call from an authentication path.
 return Boolean(expected?.format==='wallet-color-window/v1'&&observed?.format===expected.format&&
  expected.isAuthentication===false&&observed.isAuthentication===false&&
  Number.isSafeInteger(expected.deviceCount)&&expected.deviceCount===observed.deviceCount&&
  Array.isArray(expected.colors)&&Array.isArray(observed.colors)&&
  expected.colors.length===11&&observed.colors.length===11&&
  expected.colors.every((v,i)=>typeof v==='string'&&COLOR.test(v)&&
   v.toLowerCase()===observed.colors[i]?.toLowerCase()));
}
