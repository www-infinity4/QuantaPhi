// Fixed sign-in steps only. The configured email stays in owner-gated responses;
// passwords, MFA codes, cookies and tokens are never read or copied.
export function chatgptLoginExpression(expectedEmail){
 return '(()=>{const expected='+JSON.stringify(String(expectedEmail||'').trim().toLowerCase())+';'+String.raw`
 const visible=e=>!!e?.getClientRects?.().length;
 const key=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
 const controls=[...document.querySelectorAll('button,a[href],[role="button"],[role="link"]')].filter(visible);
 const click=el=>{el.click();return {ok:true,state:'progress'};};
 const exact=labels=>controls.filter(e=>labels.includes(key(e.innerText||e.getAttribute('aria-label'))));
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expected))return {ok:false,error:'chatgpt_account_not_configured'};
 if(!['https://chatgpt.com','https://auth.openai.com','https://accounts.google.com'].includes(location.origin))
  return {ok:false,error:'unexpected_signin_origin'};
 if([...document.querySelectorAll('input[type="password"],input[autocomplete="one-time-code"],iframe[src*="recaptcha"],iframe[src*="turnstile"]')].some(visible))
  return {ok:true,state:'needs_owner',reason:'password_or_verification_required'};
 if(location.origin==='https://accounts.google.com'){
  const accounts=[...document.querySelectorAll('[data-identifier],[data-email]')].filter(visible)
   .filter(e=>key(e.getAttribute('data-identifier')||e.getAttribute('data-email'))===expected);
  if(accounts.length===1)return click(accounts[0]);
  if(accounts.length>1)return {ok:false,error:'ambiguous_google_account'};
  const input=[...document.querySelectorAll('input[type="email"]')].filter(visible);
  if(input.length===1){
   // Only the owner-configured email may be entered; never a password or code.
   const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
   setter.call(input[0],expected);input[0].dispatchEvent(new Event('input',{bubbles:true}));
   input[0].dispatchEvent(new Event('change',{bubbles:true}));
   const next=exact(['next']);if(next.length===1)return click(next[0]);
   return {ok:true,state:'needs_owner',reason:'google_next_not_available'};
  }
  const another=exact(['use another account']);if(another.length===1)return click(another[0]);
  return {ok:true,state:'needs_owner',reason:'google_signin_requires_owner'};
 }
 const google=exact(['continue with google','sign in with google']);
 if(google.length===1)return click(google[0]);
 const login=exact(['log in','sign in']);
 if(location.origin==='https://chatgpt.com'&&login.length===1)return click(login[0]);
 if(location.origin==='https://chatgpt.com'){
  const profile=document.querySelector('[data-testid="accounts-profile-button"],[data-testid="profile-button"],button[aria-label="Open profile menu"]');
  const menus=[...document.querySelectorAll('[role="menu"],[data-radix-menu-content]')].filter(visible);
  const addresses=menus.flatMap(e=>String(e.innerText||'').toLowerCase().match(/[^\s<>]+@[^\s<>]+\.[a-z]{2,}/g)||[]);
  if(addresses.includes(expected)){
   if(profile&&visible(profile)&&menus.length)profile.click();
   const sidebar=document.querySelector('button[aria-label="Open sidebar"],button[data-testid="open-sidebar-button"]');
   if(sidebar&&visible(sidebar))sidebar.click();
   return {ok:true,state:'history_ready',accountVerified:true};
  }
  if(addresses.length)return {ok:false,error:'different_chatgpt_account'};
  if(profile&&visible(profile)&&!menus.length)return click(profile);
 }
 return {ok:true,state:'needs_owner',reason:'signed_in_account_not_verified'};
})()`;
}
