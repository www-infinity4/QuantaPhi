/* Media Star creator edition — independent of Fred Spaces and all Phi ledgers.
 * Embedded sites supply their own authorized source and their own payment backend.
 * Absolutely no platform API keys, private catalogs, StarQuest credentials or payouts.
 */
(() => {
  "use strict";
  const host = document.getElementById("mediaStarCreator");
  if (!host) return;
  const el = (name, className, text) => {
    const n = document.createElement(name);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const esc = value => String(value || "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const safeSource = raw => {
    if (!raw.trim()) return "";
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") throw Error("Use an HTTP(S) link to media you are authorized to publish.");
    if (u.username || u.password) throw Error("Do not put passwords in media URLs.");
    const h = u.hostname.toLowerCase();
    if (h === "quantaphi.org" || h.endsWith(".quantaphi.org") ||
        h === "marvaseater.workers.dev" || h.endsWith(".marvaseater.workers.dev") ||
        h === "localhost" || h === "127.0.0.1")
      throw Error("Add your own media URL, not a Phi-hosted catalog, wallet or Worker.");
    return u.href;
  };
  const playable = url => {
    if (!url) return "";
    const pathname = new URL(url).pathname.toLowerCase();
    if (/\.(mp3|wav|ogg|m4a|aac)(?:$)/.test(pathname)) {
      return '<audio controls preload="none" src="' + esc(url) + '" style="width:100%;margin-top:12px" aria-label="Creator audio"></audio>';
    }
    if (/\.(mp4|webm|ogv)(?:$)/.test(pathname)) {
      return '<video controls preload="none" playsinline src="' + esc(url) + '" style="display:block;width:100%;max-height:360px;margin-top:12px;border-radius:12px" aria-label="Creator video"></video>';
    }
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" style="display:inline-flex;margin-top:12px;padding:12px 17px;background:#2c2045;color:#fff;text-decoration:none;border-radius:999px;font-weight:800">▶ Open my media ↗</a>';
  };
  // Attribution is drafted into every exported card; a person named in
  // credits has no verified wallet claim or funded royalty by name alone.
  const ROLES=new Set(['host','guest','creator','actor','director','producer','writer','composer','performer','editor','crew']);
  function creditManifest(data){
    const entries=[],add=(name,role,url)=>{
      const title=String(name||'').trim().slice(0,120);
      if(title.length<2||!ROLES.has(role))return;
      let source='';
      try{const u=new URL(String(url||''));if(u.protocol==='https:'&&!u.username&&!u.password)source=u.href}catch{}
      entries.push({name:title,role,evidenceUrl:source,status:'source_and_identity_pending'});
    };
    add(data.creator,'creator',data.creditEvidence);
    for(const row of String(data.credits||'').split(/\r?\n/).slice(0,39)){
      const parts=row.split('|').map(x=>x.trim());
      if(parts.length>=2)add(parts[1],parts[0].toLowerCase(),parts[2]);
    }
    return [...new Map(entries.map(x=>[x.role+':'+x.name.toLowerCase(),x])).values()].slice(0,40);
  }
  function exportHtml(data) {
    const title = esc(data.title.trim() || "My Media Star");
    const description = esc(data.description.trim() || "Creator-selected original media");
    const source = safeSource(data.url);
    const productionCredits=creditManifest(data);
    const productionManifest=esc(JSON.stringify({version:1,sourceUrl:source,
      title:data.title,credits:productionCredits,mediaStarOwnedByPublisher:true,
      attributionState:'research_pending',settledMilliStarCoins:0}));
    const creditList=productionCredits.length
      ?productionCredits.map(x=>'<li>'+esc(x.role)+' · '+esc(x.name)+
        (x.evidenceUrl?' · <a target="_blank" rel="noopener noreferrer" href="'+esc(x.evidenceUrl)+'">Source ↗</a>':' · source pending')+'</li>').join('')
      :'<li>No people credited yet. Production research still required.</li>';

    const card = '<article data-production-credits="'+productionManifest+'" data-ledger-status="research-pending" data-media-star="creator-v3" data-payment-mode="off" aria-label="Media Star creator card" style="position:relative;isolation:isolate;overflow:hidden;max-width:720px;padding:22px;border:2px solid #f3ca52;border-radius:24px;background:linear-gradient(135deg,#fff8cd,#e4af31);color:#33220c;font:16px/1.5 system-ui,sans-serif;box-shadow:0 8px 25px #7d541d3d">' +
      '<span aria-hidden="true" style="position:absolute;right:-54px;top:-68px;width:295px;height:295px;clip-path:polygon(50% 0%,62% 34%,98% 35%,69% 57%,80% 91%,50% 72%,20% 91%,31% 57%,2% 35%,38% 34%);background:linear-gradient(150deg,#fff2a7,#edb028);opacity:.56;z-index:-1"></span>' +
      '<div style="position:relative"><strong style="letter-spacing:.06em;font-size:22px">⭐ MEDIA STAR</strong>' +
      '<p style="font-size:12px;font-weight:800;letter-spacing:.07em;margin:5px 0">CREATOR MEDIA</p>' +
      '<h2 style="font-size:24px;margin:10px 0">' + title + '</h2>' +
      '<p style="margin:11px 0">' + description + '</p>' +
      '<div data-media-star-player>' + (source ? playable(source) :
      '<form data-media-star-setup style="padding:12px;border:1px dashed #856728;border-radius:12px;background:#fff6d1"><label style="display:block;font-weight:700">Add your own media link <input type="url" name="media" required placeholder="https://your-site.example/your-episode.mp3" style="display:block;width:100%;box-sizing:border-box;padding:11px;border-radius:8px;border:1px solid #8c702a;margin:9px 0"></label><button type="submit" style="padding:10px 15px;border:0;border-radius:15px;background:#39204e;color:white;font-weight:800">Preview my media</button><p style="font-size:12px">This is a local preview. To publish for everyone, add the link in the website builder and copy the completed card.</p></form>') +
      '</div><details style="margin-top:12px;padding:12px;background:#fff7d6;border-radius:12px;border:1px solid #ac873b"><summary style="font-weight:900">Production credits · researched ledger</summary><ol>'+creditList+'</ol><p style="font-size:12px">These public credits need evidence, identity verification and a funded payout contract. No spendable StarCoins or cash are created by this card.</p></details><p style="font-size:12px;margin:12px 0 0">Creator-owned source. Independent wallet and server required for any paid access; no Phi or Fred entitlements are copied.</p></div></article>';
    if (source) return card;
    // No backend operations. In blank embeds the media-link form works locally,
    // and instructs the creator to publish the link into their actual site.
    return card + '<script>(function(){var root=document.currentScript.previousElementSibling;var form=root&&root.querySelector("[data-media-star-setup]");if(!form)return;form.addEventListener("submit",function(e){e.preventDefault();var input=form.querySelector("input[name=media]");var raw=input&&input.value||"";try{var u=new URL(raw);if(!/^https?:$/.test(u.protocol)||u.username||u.password||/^(?:localhost|127\\.0\\.0\\.1|quantaphi\\.org)$/.test(u.hostname)||u.hostname.endsWith(".quantaphi.org")||u.hostname.endsWith(".marvaseater.workers.dev"))throw Error();var link=document.createElement("a");link.href=u.href;link.target="_blank";link.rel="noopener noreferrer";link.textContent="▶ Open my media ↗";link.style="display:inline-block;padding:12px 17px;background:#30214b;color:#fff;border-radius:99px;font-weight:800;text-decoration:none";form.replaceWith(link);}catch(err){input.setCustomValidity("Add your own public HTTP(S) media link.");input.reportValidity();input.addEventListener("input",function(){input.setCustomValidity("")},{once:true});}})})()</script>';
  }
  host.className = "ms-creator-shell";
  const panel = el("article","ms-creator-card");
  const heading = el("div","ms-creator-heading");
  heading.append(el("span","ms-creator-logo","⭐"),el("div","ms-creator-heading-copy","MEDIA STAR · CREATOR EDITION"));
  panel.append(heading,el("h2","","Build your own Media Star"),el("p","ms-creator-intro",
    "Add a link to your own episode, sound, video or podcast. Build a standalone golden Media Star card. Fred’s Curio Spotlight and QuantaPhi’s wallet are not part of the exported card."));
  const form=el("form","ms-creator-form");form.noValidate=true;
  const field = (name,label,placeholder,kind="input") => {
    const wrap=el("label","ms-creator-label",label);
    const input=el(kind,"ms-creator-input");
    input.name=name;input.placeholder=placeholder;
    if(kind==="input"&&name==="url")input.type="url";
    wrap.append(input);form.append(wrap);return input;
  };
  const title=field("title","Card title","My original episode");
  const link=field("url","Link to your own content (HTTP or HTTPS)","https://your-site.example/episode.mp3");
  const description=field("description","Episode description","Tell viewers about your content","textarea");
  const creator=field("creator","Creator or main host to research","Creator / host name");
  const creditEvidence=field("creditEvidence","Official production credits source URL","https://example.org/credits");
  const contributors=field("credits","Actors, guests and crew · one per line","guest | Person Name | https://source.example/credits","textarea");
  form.append(el("p","ms-creator-intro","Each exported card includes a production credits manifest. Review researched names and sources; no automatic wallet payout is authorized."));

  const actions=el("div","ms-creator-actions");
  const createBtn=(label,css,cb)=>{const b=el("button",css,label);b.type="button";b.addEventListener("click",cb);actions.append(b);return b;};
  const preview=el("div","ms-creator-preview");preview.setAttribute("aria-live","polite");
  const feedback=el("p","ms-creator-status");feedback.setAttribute("role","status");
  const data=()=>({title:title.value,url:link.value,description:description.value,
    creator:creator.value,creditEvidence:creditEvidence.value,credits:contributors.value});
  let registeredContentId='';
  async function registerBuiltCard(){
    const item=data(),source=safeSource(item.url),api=window.StarQuestCloudLedger;
    if(!source||!item.title.trim()||typeof api?.registerProduction!=='function'){
      feedback.textContent='Card generated. Server attribution requires an original source and a verified creator account.';
      return;
    }
    try{
      const bytes=new TextEncoder().encode(source+'|'+item.title.trim().toLowerCase());
      const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
      const id='creator-'+[...digest.slice(0,16)].map(x=>x.toString(16).padStart(2,'0')).join('');
      const result=await api.registerProduction({platform:'media-star',sourceId:id,title:item.title,sourceUrl:source,
        credits:creditManifest(item)});
      if(result?.ok&&result.contentId){registeredContentId=result.contentId;
        feedback.textContent='Production credits recorded for owner review. StarCoin payouts are UNFUNDED, not spendable.';}
      else feedback.textContent='Production credit registry unavailable. The portable card still contains its credits.';
    }catch(error){
      feedback.textContent='Card is ready, but production credits were not saved to the server. Verified owner wallet and ledger deployment required.';
    }
  }
  createBtn("Preview card","ms-creator-button",()=>{
    try{ const html=exportHtml(data());preview.innerHTML=html.replace(/<script>[\s\S]*?<\/script>/gi,"");
      feedback.textContent=link.value.trim()?"Preview ready.":"Blank card ready. Add your own media URL before publishing to all visitors.";
      if(link.value.trim())void registerBuiltCard();
    }catch(e){feedback.textContent=e.message;}
  });
  createBtn("Copy my Media Star","ms-creator-button ms-primary",async()=>{
    try{const html=exportHtml(data());
      if(!navigator.clipboard?.writeText)throw Error("Clipboard is unavailable in this browser.");
      await navigator.clipboard.writeText(html);
      feedback.textContent="Your independent Media Star HTML is copied. No Fred content, Phi wallet, Cloudflare binding or payment keys are included.";
      if(link.value.trim())void registerBuiltCard();
    }catch(e){feedback.textContent=e.message;}
  });
  const build=which=>{
    let clean;
    try{clean=safeSource(link.value);}catch(e){feedback.textContent=e.message;return;}
    const prompt="Create my independent Media Star using MY supplied media content only. Title: "+
      (title.value.trim()||"My Media Star")+". Source link: "+(clean||"Not provided yet")+
      ". Description: "+(description.value.trim()||"Ask me for my description")+
      ". Ask for my own content link if missing. The Media Star visual template must remain generic, with no Fred Krueger/Curio Spotlight episode catalog, no QuantaPhi media index, no copied payment endpoints. If I enable paid access, guide me in connecting MY verified Unified Wallet and MY OWN Cloudflare Worker/D1 database, using server-only credentials, creator-specific entitlements and atomic audited transfers. Do not automatically enable billing or copy anyone else's Cloudflare bindings.";
    const u=new URL(which==="Infinity"?"/InfinityPhi/":"/OmniPhi/overview/",location.origin);
    u.searchParams.set("q",title.value.trim()||"Build a Media Star");
    u.searchParams.set("assetType","media-star-blank-v3");
    u.searchParams.set("buildPrompt",prompt);
    u.searchParams.set("from","media-star-creator");
    location.assign(u.href);
  };
  createBtn("Build with Infinity Phi","ms-creator-button",()=>build("Infinity"));
  createBtn("Build with Omni Phi","ms-creator-button",()=>build("Omni"));
  form.append(actions,feedback);
  panel.append(form,preview);
  const lookup=el('section','ms-production-lookup');
  lookup.append(el('h3','','Search the public production credits ledger'));
  lookup.append(el('p','ms-creator-intro','Search a credited creator, actor or guest. All proposed tokens remain unfunded; a credit is not a bank account or verified ownership.'));
  const searchInput=el('input','ms-creator-input');searchInput.type='search';
  searchInput.placeholder='Actor, guest or creator name';searchInput.setAttribute('aria-label','Find your name in media credits');
  const go=el('button','ms-creator-button','Find credits');go.type='button';
  const results=el('div','ms-production-results');results.setAttribute('aria-live','polite');
  go.addEventListener('click',async()=>{
    if(searchInput.value.trim().length<2){results.textContent='Enter at least two letters.';return}
    results.textContent='Checking source-backed production records…';
    try{
      const api=window.StarQuestCloudLedger;
      if(typeof api?.searchProductionCredits!=='function')throw Error('production_api_pending');
      const report=await api.searchProductionCredits(searchInput.value);
      results.replaceChildren();
      if(!report.results?.length){results.textContent='No matching credits are recorded yet.';return}
      for(const item of report.results.slice(0,40)){
        const row=el('article','ms-production-hit');
        row.append(el('strong','',String(item.display_name||'')+' · '+String(item.role||'')),
          el('small','',String(item.title||'')+' · '+String(item.qualified_plays||0)+' qualifying receipts · UNFUNDED'));
        const source=String(item.evidence_url||'');
        try{const u=new URL(source);if(u.protocol==='https:'){
          const a=el('a','','Check source ↗');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';row.append(a)
        }}catch{}
        const claim=el('button','ms-creator-button','Request credit review');claim.type='button';
        claim.addEventListener('click',async()=>{
          const proof=window.prompt('Provide a public official evidence URL for this credit. Do not upload private identity documents here.');
          if(!proof)return;
          try{
            const out=await api.claimProductionCredit(String(item.credit_id),proof);
            results.prepend(el('p','ms-creator-intro',out.submitted?'Claim submitted for identity/rights review. No StarCoins credited.':'Existing claim review is pending.'));
          }catch{results.prepend(el('p','ms-creator-intro','Credit claim could not be verified. Connect your authorized StarQuest wallet and supply a source.'))}
        });row.append(claim);results.append(row);
      }
    }catch{results.textContent='Public credit lookup is not yet operational on this backend. No payout was created.'}
  });
  lookup.append(searchInput,go,results);panel.append(lookup);
  host.append(panel);
  window.PhiMediaStarAsset=Object.freeze({
    html: options=>exportHtml(options&&typeof options==="object"?{
      title:String(options.title||""),url:String(options.url||""),description:String(options.description||""),creator:String(options.creator||""),creditEvidence:String(options.creditEvidence||""),credits:String(options.credits||""),creator:String(options.creator||""),creditEvidence:String(options.creditEvidence||""),credits:String(options.credits||"")
    }:{title:"",url:"",description:""})
  });
})();