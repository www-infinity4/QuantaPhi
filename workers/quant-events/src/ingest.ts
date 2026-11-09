/**
 * QuantaPhi first-party telemetry ingestion. Standalone Worker module.
 * - INGEST_MODE=queue: recommended at high traffic; accepted != persisted.
 * - INGEST_MODE=direct (or omitted): compatible immediate D1 writes.
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
    headers: { 'Cache-Control': 'no-store' },
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
    return { status: 400, error: 'queries must be a nonempty array of at most 100 structured events' };
  }
  if (!isRecord(payload.user) || typeof payload.user.id !== 'string') {
    return { status: 422, error: 'user.id is required' };
  }
  const userId = payload.user.id.trim();
  if (!EVENT_ID_PATTERN.test(userId)) {
    return { status: 422, error: 'user.id must be 8-128 safe characters' };
  }
  const deviceValue = payload.user.device_type;
  const deviceType = deviceValue === undefined ? 'unknown' : normalizeTag(deviceValue, 12);
  if (!deviceType || !['mobile', 'tablet', 'desktop', 'unknown'].includes(deviceType)) {
    return { status: 422, error: 'invalid user.device_type' };
  }
  const seen = new Set<string>();
  const events: EventRow[] = [];
  for (const item of payload.queries) {
    if (!isRecord(item) || typeof item.id !== 'string' || !EVENT_ID_PATTERN.test(item.id) || seen.has(item.id)) {
      return { status: 422, error: 'each query needs a unique event id (8-128 safe characters)' };
    }
    const eventType = normalizeTag(item.event_type, 120);
    const targetEntity = normalizeTag(item.target_entity, 240);
    if (!eventType || !targetEntity || typeof item.numerical_value !== 'number' ||
        !Number.isFinite(item.numerical_value)) {
      return { status: 422, error: 'invalid event_type, target_entity, or numerical_value' };
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

function prepareStatements(db: DB, packets: Array<{data:IngestPayload;item:QueueItem}>): {
  statements: Statement[]; eventStatementIndices: number[]; totalEvents: number;
} {
  const statements: Statement[] = [];
  const eventStatementIndices: number[] = [];
  let totalEvents = 0;
  for (const {data,item} of packets) {
    const {userId,deviceType,events} = data;
    const {region,stateCode,postalCode} = item.edge;
    const t = item.accepted_at_ms;
    statements.push(db.prepare(`
      INSERT INTO users (id, created_at, state_code, device_type, edge_region, postal_code)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).bind(userId,t,stateCode,deviceType,region,postalCode));
    for (let i=0; i<events.length; i+=ROWS_PER_INSERT) {
      const subset=events.slice(i,i+ROWS_PER_INSERT);
      const sql=`INSERT INTO events (id, user_id, event_type, target_entity, numerical_value, created_at_ms) VALUES ${
        subset.map(()=>'(?, ?, ?, ?, ?, ?)').join(', ')
      } ON CONFLICT(id) DO NOTHING`;
      const bindings: SqlValue[]=[];
      for (const e of subset) bindings.push(e.id,userId,e.event_type,e.target_entity,e.numerical_value,t);
      eventStatementIndices.push(statements.length);
      statements.push(db.prepare(sql).bind(...bindings));
      totalEvents+=subset.length;
    }
  }
  return {statements,eventStatementIndices,totalEvents};
}
async function persist(db: DB, packets: Array<{data:IngestPayload;item:QueueItem}>): Promise<{inserted:number;totalEvents:number}> {
  const {statements,eventStatementIndices,totalEvents} = prepareStatements(db,packets);
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
    if (new URL(request.url).pathname !== '/v1/events') return response({error:'not found'},404);
    if (request.method !== 'POST') return response({error:'POST required'},405);
    if (!env.INGEST_TOKEN || request.headers.get('authorization') !== `Bearer ${env.INGEST_TOKEN}`)
      return response({error:'unauthorized'},401);
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))
      return response({error:'application/json required'},415);
    const contentLength=Number(request.headers.get('content-length')??0);
    if (contentLength>MAX_BODY_BYTES) return response({error:'body too large'},413);

    let payload:unknown;
    try {
      // Enforce the limit while reading, even when Content-Length is omitted.
      const reader=request.body?.getReader();
      if (!reader) return response({error:'malformed JSON'},400);
      const decoder=new TextDecoder('utf-8',{fatal:true});
      let json='';let bytes=0;
      while(true) {
        const part=await reader.read();if(part.done) break;
        bytes+=part.value.byteLength;
        if(bytes>MAX_BODY_BYTES) {await reader.cancel();return response({error:'body too large'},413);}
        json+=decoder.decode(part.value,{stream:true});
      }
      json+=decoder.decode();
      payload=JSON.parse(json);
    } catch {return response({error:'malformed JSON'},400);}

    const parsed=parsePayload(payload);
    if (!parsed.data) return response({error:parsed.error},parsed.status);
    const item=toQueueItem(parsed.data,getEdge(request),Date.now());
    const mode=env.INGEST_MODE??'direct';
    if (mode==='queue') {
      if (!env.EVENT_QUEUE) return response({error:'queue unavailable'},503);
      try {
        await env.EVENT_QUEUE.send(item);
        // Durable Queue acceptance is NOT a D1 commit. Never report inserted here.
        return response({received:item.queries.length,accepted:item.queries.length,persisted:false},202);
      } catch {
        return response({error:'queue temporarily unavailable'},503);
      }
    }
    if(mode!=='direct') return response({error:'invalid INGEST_MODE configuration'},503);
    if(!env.DB) return response({error:'database unavailable'},503);
    try {
      const {inserted,totalEvents}=await persist(env.DB,[{data:parsed.data,item}]);
      return response({received:totalEvents,inserted,duplicates:totalEvents-inserted},inserted?201:200);
    } catch {
      console.error('D1 ingest failed');
      return response({error:'database temporarily unavailable'},503);
    }
  },
  async queue(batch: {messages:Array<{body:unknown}>},env:Env): Promise<void> {
    if(!env.DB) throw new Error('D1 binding unavailable');
    const packets=batch.messages.map(message=>validateQueueItem(message.body));
    if(packets.length===0) return;
    // One atomic D1 transaction for this consumer batch. On failure, throw so
    // Queues retries. Stable event IDs make replays idempotent.
    await persist(env.DB,packets);
  },
};