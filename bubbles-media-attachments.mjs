// Local, user-selected media only. Raw videos never leave the device.
export const MAX_IMAGES=16,MAX_VIDEOS=20,MAX_MESSAGE_TEXT=32000;
export function validateMediaBatch(files,images=0,videos=0){
 for(const file of files){
  const image=/^image\/(?:jpeg|png|webp)$/.test(file.type);
  const video=/^video\/(?:mp4|webm|quicktime)$/.test(file.type);
  if(!image&&!video)throw Error('Choose JPEG, PNG, WebP, MP4, WebM or MOV files.');
  if(!Number.isFinite(file.size)||file.size<=0||file.size>(image?8:100)*1024*1024)
   throw Error(image?'Images must be smaller than 8 MB.':'Videos must be smaller than 100 MB.');
  if(image)images++;else videos++;
 }
 if(images>MAX_IMAGES||videos>MAX_VIDEOS)throw Error('Attach up to 16 images and 20 videos per message.');
 return {images,videos};
}
function mediaEvent(target,event,act){
 return new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);target.removeEventListener(event,done);target.removeEventListener('error',fail);};
  const done=()=>{cleanup();resolve();};
  const fail=()=>{cleanup();reject(Error('This video could not be decoded on this device.'));};
  const timer=setTimeout(fail,15000);
  target.addEventListener(event,done,{once:true});target.addEventListener('error',fail,{once:true});
  try{act();}catch(error){cleanup();reject(error);}
 });
}
export function videoSampleTimes(duration){
 if(!Number.isFinite(duration)||duration<=0)throw Error('Video duration is unavailable.');
 return [...new Set([0,duration/2,Math.max(0,duration-0.1)])].sort((a,b)=>a-b);
}
// Decode one clip and yield one bounded JPEG at a time, even for a 20-clip batch.
// Callers must label the result as sampled visuals; no audio is transcribed.
export async function* videoFrames(file){
 const url=URL.createObjectURL(file),video=document.createElement('video');
 video.preload='auto';video.muted=true;video.playsInline=true;
 try{
  await mediaEvent(video,'loadeddata',()=>{video.src=url;video.load();});
  if(!video.videoWidth||!video.videoHeight)throw Error('No video picture is available.');
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
  canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('Canvas is unavailable.');
  for(const seconds of videoSampleTimes(video.duration)){
   if(Math.abs(video.currentTime-seconds)>0.01)
    await mediaEvent(video,'seeked',()=>{video.currentTime=seconds;});
   context.drawImage(video,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',0.5);
   if(data.length>440000)throw Error('A video frame could not be safely reduced.');
   yield {seconds,data};
  }
 }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
