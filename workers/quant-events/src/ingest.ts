/**
 * QuantaPhi first-party telemetry ingestion. Standalone Worker module.
 * - INGEST_MODE=queue: recommended at high traffic; accepted != persisted.
 * - INGEST_MODE=direct: explicitly configured isolated staging only.
 * - Missing INGEST_MODE or server-signed identity fails closed.
 *
 * This is a trusted server-to-server endpoint. Do NOT expose INGEST_TOKEN to
 * browser/PWA clients or accept an unverified client-supplied user ID.
 */

type SqlValue = string | number | null;
type Statement = { bind(...values: SqlValue[]): Statement };
type D1Result = { success?: boolean; meta?: { changes?: number } };
type DB = {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<D1Result[]>;
};

type QueueProducer = { send(message: QueueItem): Promise<void> };
interface Env {
  DB?: DB;
  EVENT_QUEUE?: QueueProducer;
  INGEST_TOKEN: string;
  INGEST_MODE?: 'direct' | 'queue';
  DIRECT_STAGING_ALLOWED?: string;
  USER_IDENTITY_HMAC_SECRET?: string;
  GEO_STORAGE_ENABLED?: string;
}

type CfGeo = {
  region?: string | null;
  regionCode?: string | null;
  postalCode?: string | null;
};

type EventRow = {
  id: string;
  event_type: string;
  target_entity: string;
  numerical_value: number;
};
type IngestPayload = {
  userId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  events: EventRow[];
};
type EdgeData = { region: string | null; stateCode: string | null; postalCode: string | null };
type QueueItem = {
  schema_version: 1;
  user: { id: string; device_type: IngestPayload['deviceType'] };
  queries: EventRow[];
  edge: EdgeData;
  accepted_at_ms: number;
};

// A D1 prepared statement accepts up to 100 bound parameters. Six per event:
// 16 event rows per INSERT = 96 params; the last four are unused, never exceeded.
const ROWS_PER_INSERT = 16;
const MAX_EVENTS = 100;
const MAX_BODY_BYTES = 64 * 1024;
const EVENT_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

function response(body: object, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff','Vary':'Origin' },
  });
}
function normalizeTag(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/gu, ' ').toLowerCase();
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function cleanEdge(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean && clean.length <= max ? clean : null;
}
function parsePayload(payload: unknown): { data?: IngestPayload; status: number; error?: string } {
  if (!isRecord(payload) || !Array.isArray(payload.queries) ||
      payload.queries.length === 0 || payload.queries.length > MAX_EVENTS) {
    return { status: 400, error: 'queries_required' };
  }
  if (!isRecord(payload.user) || typeof payload.user.id !== 'string') {
    return { status: 422, error: 'user_id_required' };
  }
  const userId = payload.user.id.trim();
  if (!EVENT_ID_PATTERN.test(userId)) {
    return { status: 422, error: 'invalid_user_id' };
  }
  const deviceValue = payload.user.device_type;
  const deviceType = deviceValue === undefined ? 'unknown' : normalizeTag(deviceValue, 12);
  if (!deviceType || !['mobile', 'tablet', 'desktop', 'unknown'].includes(deviceType)) {
    return { status: 422, error: 'invalid_device_type' };
  }
  const seen = new Set<string>();
  const events: EventRow[] = [];
  for (const item of payload.queries) {
    if (!isRecord(item) || typeof item.id !== 'string' || !EVENT_ID_PATTERN.test(item.id) || seen.has(item.id)) {
      return { status: 422, error: 'invalid_event_id' };
    }
    const eventType = normalizeTag(item.event_type, 120);
    const targetEntity = normalizeTag(item.target_entity, 240);
    if (!eventType || !targetEntity || typeof item.numerical_value !== 'number' ||
        !Number.isFinite(item.numerical_value)) {
      return { status: 422, error: 'invalid_event' };
    }
    seen.add(item.id);
    events.push({ id: item.id, event_type: eventType, target_entity: targetEntity, numerical_value: item.numerical_value });
  }
  return { status: 200, data: { userId, deviceType: deviceType as IngestPayload['deviceType'], events } };
}
function getEdge(request: Request): EdgeData {
  const cf = (request as Request & { cf?: CfGeo | null }).cf;
  return {
    region: cleanEdge(cf?.region, 120),
    stateCode: cleanEdge(cf?.regionCode, 8)?.toUpperCase() ?? null,
    postalCode: cleanEdge(cf?.postalCode, 20),
  };
}
/**
 * A separate trusted identity Worker must sign the authenticated user subject,
 * not any browser-provided ID, using a secret distinct from INGEST_TOKEN.
 * The caller sets signed geo=1 only after confirming current user consent.
 * This staged contract does not by itself wire QuantaPhi's sign-in adapter.
 */
// Cache the current verification key per isolate, rotating when a signing secret changes.
let cachedIdentityKey: {secret:string;key:Promise<CryptoKey>}|undefined;
function hmacKey(secret:string):Promise<CryptoKey> {
  if(!cachedIdentityKey || cachedIdentityKey.secret!==secret) {
    const key=crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
      {name:'HMAC',hash:'SHA-256'},false,['verify']);
    cachedIdentityKey={secret,key};
    key.catch(()=>{if(cachedIdentityKey?.key===key)cachedIdentityKey=undefined;});
  }
  return cachedIdentityKey.key;
}
async function verifyIdentity(request: Request, userId: string, secret: string): Promise<{geoConsent:boolean}|null> {
  const tsText = request.headers.get('x-quant-identity-time') ?? '';
  const geo = request.headers.get('x-quant-identity-geo');
  const hex = request.headers.get('x-quant-identity-signature') ?? '';
  if (!/^[0-9]{13}$/.test(tsText) || !/^[a-f0-9]{64}$/i.test(hex) || (geo !== '0' && geo !== '1')) return null;
  const ts = Number(tsText);
  const now = Date.now();
  if (!Number.isSafeInteger(ts) || ts <= 0 || Math.abs(now - ts) > 5 * 60 * 1000) return null;
  const key = await hmacKey(secret);
  const sig = Uint8Array.from(hex.match(/../g)!, part => parseInt(part, 16));
  const message = new TextEncoder().encode(`v1\n${userId}\n${ts}\n${geo}`);
  const verified = await crypto.subtle.verify('HMAC', key, sig, message);
  return verified ? {geoConsent: geo === '1'} : null;
}

function toQueueItem(data: IngestPayload, edge: EdgeData, acceptedAtMs: number): QueueItem {
  return {
    schema_version: 1,
    user: { id: data.userId, device_type: data.deviceType },
    queries: data.events,
    edge,
    accepted_at_ms: acceptedAtMs,
  };
}
function validateQueueItem(message: unknown): { data: IngestPayload; item: QueueItem } {
  if (!isRecord(message) || message.schema_version !== 1 || !isRecord(message.edge) ||
      !Number.isSafeInteger(message.accepted_at_ms) || (message.accepted_at_ms as number) <= 0) {
    throw new Error('Invalid queue message envelope');
  }
  const parsed = parsePayload(message);
  if (!parsed.data) throw new Error('Invalid queue message payload');
  const edge = message.edge;
  const normalizedEdge: EdgeData = {
    region: cleanEdge(edge.region, 120),
    stateCode: cleanEdge(edge.stateCode, 8)?.toUpperCase() ?? null,
    postalCode: cleanEdge(edge.postalCode, 20),
  };
  return {
    data: parsed.data,
    item: toQueueItem(parsed.data, normalizedEdge, message.accepted_at_ms as number),
  };
}

function prepareStatements(db: DB, packets: Array<{data:IngestPayload;item:QueueItem}>, enforceConsent=false): {
  statements: Statement[]; eventStatementIndices: number[]; totalEvents: number;
} {
  const statements: Statement[] = [];
  const eventStatementIndices: number[] = [];
  let totalEvents = 0;
  for (const {data,item} of packets) {
    const {userId,deviceType,events} = data;
    const {region,stateCode,postalCode} = item.edge;
    const t = item.accepted_at_ms;
    const userSql=enforceConsent
      ? `INSERT INTO users (id, created_at, state_code, device_type, edge_region, postal_code)
          SELECT ?,?,?,?,?,? WHERE EXISTS (
            SELECT 1 FROM quant_event_consents
            WHERE user_id=? AND purpose='analytics' AND policy_version='v1'
              AND revoked_at_ms IS NULL AND consented_at_ms<=?
          ) ON CONFLICT(id) DO NOTHING`
      : `INSERT INTO users (id, created_at, state_code, device_type, edge_region, postal_code)
          VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`;
    statements.push(db.prepare(userSql).bind(
      userId,t,stateCode,deviceType,region,postalCode,...(enforceConsent?[userId,t]:[])
    ));
    for (let i=0; i<events.length; i+=ROWS_PER_INSERT) {
      const subset=events.slice(i,i+ROWS_PER_INSERT);
      const values=subset.map(()=>'(?, ?, ?, ?, ?, ?)').join(', ');
      const sql=enforceConsent
        ? `WITH event_rows(id,user_id,event_type,target_entity,numerical_value,created_at_ms)
            AS (VALUES ${values})
            INSERT INTO events(id,user_id,event_type,target_entity,numerical_value,created_at_ms)
            SELECT id,user_id,event_type,target_entity,numerical_value,created_at_ms FROM event_rows
            WHERE EXISTS (
              SELECT 1 FROM quant_event_consents
              WHERE user_id=? AND purpose='analytics' AND policy_version='v1'
                AND revoked_at_ms IS NULL AND consented_at_ms<=?
            ) ON CONFLICT(id) DO NOTHING`
        : `INSERT INTO events (id, user_id, event_type, target_entity, numerical_value, created_at_ms)
            VALUES ${values} ON CONFLICT(id) DO NOTHING`;
      const bindings: SqlValue[]=[];
      for (const e of subset) bindings.push(e.id,userId,e.event_type,e.target_entity,e.numerical_value,t);
      if(enforceConsent) bindings.push(userId,t);
      eventStatementIndices.push(statements.length);
      statements.push(db.prepare(sql).bind(...bindings));
      totalEvents+=subset.length;
    }
  }
  return {statements,eventStatementIndices,totalEvents};
}
async function persist(db: DB, packets: Array<{data:IngestPayload;item:QueueItem}>, enforceConsent=false): Promise<{inserted:number;totalEvents:number}> {
  const {statements,eventStatementIndices,totalEvents} = prepareStatements(db,packets,enforceConsent);
  const results=await db.batch(statements);
  let inserted=0;
  for (const idx of eventStatementIndices) {
    const changes=results[idx]?.meta?.changes;
    // No successful insertion claims without D1 row-change receipts.
    if (!Number.isSafeInteger(changes) || (changes as number)<0) throw new Error('D1 did not report inserted row counts');
    inserted+=changes as number;
  }
  if (inserted>totalEvents) throw new Error('D1 returned impossible row counts');
  return {inserted,totalEvents};
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname !== '/v1/events') return response({error:'not_found'},404);
    if (request.method !== 'POST') return response({error:'post_required'},405);
    if (!env.INGEST_TOKEN || request.headers.get('authorization') !== `Bearer ${env.INGEST_TOKEN}`)
      return response({error:'unauthorized'},401);
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))
      return response({error:'json_required'},415);
    const contentLength=Number(request.headers.get('content-length')??0);
    if (contentLength>MAX_BODY_BYTES) return response({error:'body_too_large'},413);

    let payload:unknown;
    try {
      // Enforce the limit while reading, even when Content-Length is omitted.
      const reader=request.body?.getReader();
      if (!reader) return response({error:'malformed_json'},400);
      const decoder=new TextDecoder('utf-8',{fatal:true});
      let json='';let bytes=0;
      while(true) {
        const part=await reader.read();if(part.done) break;
        bytes+=part.value.byteLength;
        if(bytes>MAX_BODY_BYTES) {await reader.cancel();return response({error:'body_too_large'},413);}
        json+=decoder.decode(part.value,{stream:true});
      }
      json+=decoder.decode();
      payload=JSON.parse(json);
    } catch {return response({error:'malformed_json'},400);}

    const parsed=parsePayload(payload);
    if (!parsed.data) return response({error:parsed.error},parsed.status);
    if (!env.USER_IDENTITY_HMAC_SECRET) return response({error:'identity_verifier_unavailable'},503);
    let identity: {geoConsent:boolean}|null;
    try { identity = await verifyIdentity(request, parsed.data.userId, env.USER_IDENTITY_HMAC_SECRET); }
    catch { return response({error:'identity_verifier_unavailable'},503); }
    if (!identity) return response({error:'unverified_user_identity'},401);
    // Only store edge metadata with both a signed consent claim and a reviewed server rollout flag.
    const geoAllowed = identity.geoConsent && env.GEO_STORAGE_ENABLED === 'true';
    const edge:EdgeData = geoAllowed ? getEdge(request) : {region:null,stateCode:null,postalCode:null};
    const item=toQueueItem(parsed.data,edge,Date.now());
    const mode=env.INGEST_MODE;
    if (mode==='queue') {
      if (!env.EVENT_QUEUE) return response({error:'queue_unavailable'},503);
      try {
        await env.EVENT_QUEUE.send(item);
        // Durable Queue acceptance is NOT a D1 commit. Never report inserted here.
        return response({received:item.queries.length,accepted:item.queries.length,persisted:false},202);
      } catch {
        return response({error:'queue_temporarily_unavailable'},503);
      }
    }
    if(mode!=='direct') return response({error:'invalid_ingest_mode'},503);
    // Production must use Queues. Direct writes are a deliberate staging-only
    // exception, and even there SQL must enforce the current consent row.
    if(env.DIRECT_STAGING_ALLOWED!=='true') return response({error:'direct_ingestion_disabled'},503);
    if(!env.DB) return response({error:'database_unavailable'},503);
    try {
      const {inserted,totalEvents}=await persist(env.DB,[{data:parsed.data,item}],true);
      return response({received:totalEvents,inserted,duplicates:totalEvents-inserted},inserted?201:200);
    } catch (error) {
      // Staging-only path: log the D1 failure, never the request payload or bearer.
      const details=error instanceof Error
        ? {name:error.name,message:error.message,stack:error.stack}
        : {name:'UnknownError'};
      console.error('D1 ingest failed',details);
      return response({error:'database_temporarily_unavailable'},503);
    }
  },
  async queue(batch: {messages:Array<{body:unknown}>},env:Env): Promise<void> {
    if(!env.DB) throw new Error('D1 binding unavailable');
    const packets=batch.messages.map(message=>validateQueueItem(message.body));
    if(packets.length===0) return;
    // One atomic D1 transaction for this consumer batch. On failure, throw so
    // Queues retries. Stable event IDs make replays idempotent.
    // Consent is verified atomically by D1 on every queued insert; revocation
    // and renewed consent cannot revive an older queued event.
    await persist(env.DB,packets,true);
  },
};