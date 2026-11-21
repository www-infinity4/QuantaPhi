const share=document.getElementById('launchShare');
const status=document.getElementById('launchShareStatus');
if(share)share.addEventListener('click',async()=>{
 const url='https://quantaphi.org/infinity-launch.html#starmaker';
 try{
  if(navigator.share){await navigator.share({title:'QuantaPhi · Try the StarMaker interactive Quick Card',text:'Explore Bubbles AI, the Quick Card and product roadmap.',url});status.textContent='Share sheet opened.';return;}
 }catch(e){if(e?.name==='AbortError'){status.textContent='Share cancelled.';return;}}
 try{await navigator.clipboard.writeText(url);status.textContent='Public product preview link copied.';}
 catch{status.textContent='Copy this product link: '+url;}
});