/* Infinity Phone / Bubbles explicit carrier dial handoff.
 * No contact access, carrier permission, automated calls or call audio.
 */
(function(root){
 'use strict';
 const clean=(v,max)=>String(v||'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
 function normalizedNumber(input){
  const value=clean(input,35);
  if(!/^\+?[0-9 ().-]{7,30}$/.test(value))return null;
  let digits=value.replace(/\D/g,'');
  if(!value.startsWith('+')&&digits.length===10)digits='1'+digits;
  if(!/^[1-9][0-9]{7,14}$/.test(digits))return null;
  // Emergency/short codes are not handled by the Internet calling preview.
  if(['911','112','999','000'].includes(digits))return null;
  return {display:'+'+digits,uri:'tel:+'+digits};
 }
 function preview(recipient,message){
  const name=clean(recipient,70)||'you';
  const note=clean(message,1500);
  if(!note)return null;
  return 'Hello '+name+'. I’m Bubbles, an AI assistant calling on behalf of Kris. '+
   'Kris asked me to tell you: '+note+
   ' Would you like to respond?';
 }
 const api=Object.freeze({normalizedNumber,preview});
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.InfinityPhoneHandoff=api;
})(typeof window==='object'?window:globalThis);
