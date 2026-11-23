// Unified Wallet: NUMBER = display/index only. Proof = device private key.
// Device enrollment remains a source-only pilot. The global account label
// below is read-only metadata on an already authenticated user, never login proof.
const NUMBER=/^\d{39}$/;
const NONEMPTY=x=>typeof x==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(x);
const text=new TextEncoder();
/** Stable platform-wide account label, independent of enrolled device lists.
 * Call only after the server has resolved the authenticated account key.
 * Full SHA-256 is retained as 78 decimal characters, including leading zeroes.
 * No email, government ID, hardware ID, credential, or ledger data is used.
 */
export async function globalUserIdentity(accountId,cryptoApi=globalThis.crypto){
 const key=Number.isSafeInteger(accountId)&&accountId>=0?String(accountId):accountId;
 if(typeof key!=='string'||!/^[A-Za-z0-9_.:-]{1,159}$/.test(key))throw Error('canonical account key required');
 if(typeof cryptoApi?.subtle?.digest!=='function')throw Error('cryptographic hashing required');
 const bytes=new Uint8Array(await cryptoApi.subtle.digest('SHA-256',text.encode('QuantaPhi-global-user-id-v1\n'+key)));
 let value=0n;
 for(const byte of bytes)value=(value<<8n)|BigInt(byte);
 return {version:'nwi-v1',scope:'quantaphi',number:value.toString(10).padStart(78,'0'),isAuthentication:false};
}
function publicP256(jwk){
 return Boolean(jwk&&typeof jwk==='object'&&!Array.isArray(jwk)&&
  jwk.kty==='EC'&&jwk.crv==='P-256'&&jwk.d===undefined&&
  typeof jwk.x==='string'&&/^[A-Za-z0-9_-]{43}$/.test(jwk.x)&&
  typeof jwk.y==='string'&&/^[A-Za-z0-9_-]{43}$/.test(jwk.y));
}
export function issueNumericDeviceId(cryptoApi=globalThis.crypto){
 if(typeof cryptoApi?.getRandomValues!=='function')throw Error('cryptographic randomness required');
 const bytes=cryptoApi.getRandomValues(new Uint8Array(16));
 if(!(bytes instanceof Uint8Array)||bytes.length!==16||bytes.every(x=>x===0))
  throw Error('cryptographic randomness unavailable');
 let number=0n;
 for(const byte of bytes)number=(number<<8n)|BigInt(byte);
 return number.toString(10).padStart(39,'0');
}
export function createWalletDeviceLink({verifiedAccountId,requestedAccountId,deviceNumber,publicKeyJwk,consent}={}){
 if(consent!==true)throw Error('explicit device-link consent required');
 if(!NONEMPTY(verifiedAccountId)||requestedAccountId!==verifiedAccountId)
  throw Error('account mismatch: active verified wallet required');
 if(!NUMBER.test(deviceNumber||''))throw Error('invalid 39-digit device number');
 if(!publicP256(publicKeyJwk))throw Error('valid public P-256 proof key required');
 return {version:'wallet-device-number/v1',accountId:verifiedAccountId,deviceNumber,
  publicKeyJwk:{kty:'EC',crv:'P-256',x:publicKeyJwk.x,y:publicKeyJwk.y},
  status:'pending_challenge_verification',
  grants:{walletRead:false,walletSpend:false,deviceEnrollment:false},
  note:'This number is an app-scoped label, not an authentication or account-recovery token.'};
}
export async function accountDeviceChain({verifiedAccountId,linkedAccountId,deviceNumbers=[],crypto:cryptoApi=globalThis.crypto}={}){
 if(!NONEMPTY(verifiedAccountId)||linkedAccountId!==verifiedAccountId)
  throw Error('account mismatch: cannot assemble device chain for another account');
 if(!Array.isArray(deviceNumbers)||deviceNumbers.length>1000||deviceNumbers.some(x=>!NUMBER.test(x||'')))
  throw Error('invalid device number chain');
 if(new Set(deviceNumbers).size!==deviceNumbers.length)throw Error('duplicate device number');
 const canonical='QuantaPhi-wallet-device-list-v1\n'+verifiedAccountId+'\n'+[...deviceNumbers].sort().join('\n');
 const hash=await cryptoApi.subtle.digest('SHA-256',text.encode(canonical));
 const fingerprint=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
 return {format:'wallet-numeric-account-chain/v1',deviceCount:deviceNumbers.length,
  fingerprint,isAuthentication:false};
}
export function deviceChallengeMessage({accountId,deviceNumber,challenge}={}){
 if(!NONEMPTY(accountId)||!NUMBER.test(deviceNumber||'')||
   !/^[A-Za-z0-9_-]{43}$/.test(challenge||''))throw Error('invalid device challenge');
 return 'QuantaPhi-wallet-device-proof-v1\n'+accountId+'\n'+deviceNumber+'\n'+challenge;
}
export async function verifyDeviceChallenge({
 verifiedAccountId,linkedAccountId,deviceNumber,enrolledDeviceNumber,
 challenge,signature,publicKeyJwk,issuedAt,now,used=false,crypto:cryptoApi=globalThis.crypto
}={}){
 if(!NONEMPTY(verifiedAccountId)||linkedAccountId!==verifiedAccountId||
  deviceNumber!==enrolledDeviceNumber||!NUMBER.test(deviceNumber||'')||
  used!==false||!Number.isSafeInteger(issuedAt)||!Number.isSafeInteger(now)||
  now<issuedAt||now-issuedAt>5*60*1000||!publicP256(publicKeyJwk)||
  !(signature instanceof Uint8Array)||signature.length<48||signature.length>144)return false;
 try{
  const payload=deviceChallengeMessage({accountId:linkedAccountId,deviceNumber,challenge});
  const key=await cryptoApi.subtle.importKey('jwk',
   {kty:'EC',crv:'P-256',x:publicKeyJwk.x,y:publicKeyJwk.y},
   {name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  return await cryptoApi.subtle.verify({name:'ECDSA',hash:'SHA-256'},
   key,signature,text.encode(payload));
 }catch{return false}
}
