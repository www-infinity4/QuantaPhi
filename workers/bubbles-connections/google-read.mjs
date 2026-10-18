import {randomToken} from './vault.mjs';
const READ_ACTIONS = Object.freeze({'drive.list':'drive.read','sheets.values':'sheets.read','calendar.events':'calendar.read'});
function selected(record, kind, id) {
  if (typeof id !== 'string' || !id || id.length > 200 || !record.resourceGrants?.[kind]?.includes(id)) throw Error('resource_selection_required');
  return encodeURIComponent(id);
}
export function googleReadURL(operation, args, record) {
  let url;
  if (operation === 'drive.list') {
    url = new URL('https://www.googleapis.com/drive/v3/files');
    const query = String(args.query || '').slice(0,200).replace(/[\\']/g,'\\$&');
    url.search = new URLSearchParams({pageSize:'25',fields:'files(id,name,mimeType,modifiedTime,webViewLink),nextPageToken',
      q:'trashed = false'+(query ? " and name contains '"+query+"'" : '')}).toString();
    if (args.pageToken) url.searchParams.set('pageToken',String(args.pageToken).slice(0,2048));
  } else if (operation === 'sheets.values') {
    const id = selected(record,'sheets',args.spreadsheetId), range = args.range;
    if (typeof range !== 'string' || !range || range.length > 200 || /[\x00-\x1f]/.test(range)) throw Error('range_invalid');
    url = new URL('https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/'+encodeURIComponent(range));
  } else if (operation === 'calendar.events') {
    const id = selected(record,'calendars',args.calendarId);
    url = new URL('https://www.googleapis.com/calendar/v3/calendars/'+id+'/events');
    url.search = new URLSearchParams({maxResults:'25',singleEvents:'true',orderBy:'startTime',fields:'items(id,summary,start,end,htmlLink),nextPageToken'}).toString();
    if (args.timeMin) {
      const date = new Date(args.timeMin);
      if (!Number.isFinite(date.getTime())) throw Error('time_invalid');
      url.searchParams.set('timeMin',date.toISOString());
    }
  } else throw Error('unsupported_action');
  return url.href;
}
export async function executeGoogleRead(service, {userId,id,operation,args = {}}, request = fetch) {
  if (!Object.hasOwn(READ_ACTIONS,operation)) throw Error('unsupported_action');
  return service.withCredential({userId,id,provider:'google',action:READ_ACTIONS[operation]}, async (token,record) => {
    const url = googleReadURL(operation,args,record);
    const response = await request(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
    if (!response.ok) throw Error('google_read_http_'+response.status);
    if (Number(response.headers.get('Content-Length')) > 1000000) throw Error('provider_response_too_large');
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try {
      while (true) {
        const {done,value} = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 1000000) { await reader.cancel(); throw Error('provider_response_too_large'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.length;}
    return {ok:true,provider:'google',operation,data:JSON.parse(new TextDecoder().decode(bytes)),
      receipt:{status:'provider_confirmed',httpStatus:response.status,at:new Date().toISOString()}};
  });
}

// Called from an explicit resource-picker submission, never model-generated
// scope escalation. Provider permission is verified before saving selection.
export async function selectGoogleResource(service,{userId,id,kind,resourceId},request = fetch) {
  if (!['sheets','calendars'].includes(kind) || typeof resourceId !== 'string' || !resourceId || resourceId.length > 200 || /[\x00-\x1f]/.test(resourceId)) throw Error('resource_selection_required');
  const action = kind==='sheets'?'sheets.read':'calendar.read';let revision;
  await service.withCredential({userId,id,provider:'google',action},async(token,record)=>{
    revision=record.revision;
    const url=kind==='sheets'?'https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(resourceId)+'?fields=spreadsheetId':
      'https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(resourceId)+'/events?maxResults=1&fields=kind';
    const response=await request(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token}});
    await response.body?.cancel();
    if(!response.ok)throw Error('google_read_http_'+response.status);
  });
  const key=await service.namespace(userId)+'connection:'+id;
  await service.storage.transaction(async tx=>{
    const record=await tx.get(key);
    if(record?.revision!==revision||record.status!=='connected')throw Error('connection_cancelled');
    const values=record.resourceGrants?.[kind]||[];
    if(values.length>=100&&!values.includes(resourceId))throw Error('too_many_requests');
    await tx.put(key,{...record,revision:randomToken(),resourceGrants:{...record.resourceGrants,[kind]:[...new Set([...values,resourceId])]}});
  });
  return {ok:true,kind,resourceId,status:'resource_selected'};
}
