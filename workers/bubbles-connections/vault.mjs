const encoder = new TextEncoder();
export const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
export const randomToken = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value) {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

// keys is a server-supplied keyring {keyId: base64urlEncoded32ByteKey}.
// Retain older keys during rotation until their records have been re-encrypted.
export class TokenVault {
  constructor(keys, activeKeyId) { this.keys = keys; this.activeKeyId = activeKeyId; }
  async key(id) {
    if (!Object.hasOwn(this.keys, id)) throw Error('vault_key_unavailable');
    const raw = decode(this.keys[id]);
    if (raw.length !== 32) throw Error('vault_key_invalid');
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt']);
  }
  async seal(value, context) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:encoder.encode(context)}, await this.key(this.activeKeyId), encoder.encode(JSON.stringify(value)));
    return {keyId:this.activeKeyId, iv:base64url(iv), ciphertext:base64url(new Uint8Array(ciphertext))};
  }
  async open(record, context) {
    const bytes = await crypto.subtle.decrypt({name:'AES-GCM', iv:decode(record.iv), additionalData:encoder.encode(context)}, await this.key(record.keyId), decode(record.ciphertext));
    return JSON.parse(new TextDecoder().decode(bytes));
  }
}
