import {createHash, createPublicKey, verify} from 'node:crypto';
import {z} from 'zod';
import type {PoolClient} from 'pg';

export const path = '/api/integrations/werigo-read';
const domain = 'werigo-codex-read-v1';
export const readKeyTtlDays = 30;
export const deviceTableSql = `CREATE TABLE IF NOT EXISTS ops.codex_read_devices (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{32}$'),
  public_key text NOT NULL CHECK (public_key ~ '^[A-Za-z0-9_-]{43}$'),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 48),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
)`;
export const deviceIdPattern = /^[a-f0-9]{32}$/;
export function readDeviceKey(value: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error('invalid_device_key');
  const raw = Buffer.from(value, 'base64url');
  if (raw.length !== 32 || raw.toString('base64url') !== value) throw new Error('invalid_device_key');
  const key = createPublicKey({key:{kty:'OKP', crv:'Ed25519', x:value}, format:'jwk'});
  return {id:createHash('sha256').update(raw).digest('hex').slice(0,32),key};
}
export function signedMessage(id: string, time: string, body: Uint8Array) {
  return Buffer.from([domain,'POST',path,id,time,createHash('sha256').update(body).digest('hex')].join('\n'));
}
export function readSignature(headers: Headers, now = Date.now()) {
  const id = headers.get('x-werigo-read-id') || '', time = headers.get('x-werigo-read-time') || '', sig = headers.get('x-werigo-read-signature') || '';
  if (!deviceIdPattern.test(id) || !/^\d{13}$/.test(time) || Math.abs(now-Number(time)) > 120_000 ||
      !/^[A-Za-z0-9_-]{86}$/.test(sig)) return null;
  return {id,time,sig};
}
export function verifyReadSignature(publicKey: string, signature: NonNullable<ReturnType<typeof readSignature>>, body: Uint8Array) {
  try {
    const {id,key} = readDeviceKey(publicKey);
    return id === signature.id && verify(null,signedMessage(id,signature.time,body),key,Buffer.from(signature.sig,'base64url'));
  } catch {return false;}
}

const reference = z.string().trim().regex(/^[A-Za-z0-9-]{3,50}$/).transform(v=>v.toUpperCase()).optional();
const limit = z.number().int().min(1).max(25).default(12);
export const readRequest = z.discriminatedUnion('tool',[
  z.strictObject({tool:z.literal('list_bookings'), args:z.strictObject({reference, status:z.string().regex(/^[a-z_]{2,30}$/).optional(), source:z.enum(['website','ops']).optional(),limit})}),
  z.strictObject({tool:z.literal('check_stock'), args:z.strictObject({start:z.iso.datetime({offset:true}),end:z.iso.datetime({offset:true}),model:z.enum(['bees','victory','athena','edpower']).optional()})}),
  z.strictObject({tool:z.literal('check_rental_status'), args:z.strictObject({reference,status:z.enum(['scheduled','active','open_import','overdue','returned']).optional(),limit})}),
]);

export function stockPeriod(start: string, end: string) {
  const a=Date.parse(start), b=Date.parse(end);
  return Number.isFinite(a) && Number.isFinite(b) && b>a && b-a<=90*86_400_000 ? {start:a,end:b} : null;
}
function baliDay(now:number) {
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=(key:string)=>parts.find(p=>p.type===key)?.value;
  return [part('year'),part('month'),part('day')].join('-');
}

// No free-form SQL, schema names, fields or ordering may come from a caller.
// Views below are explicit projections: no customer or payment data.
export async function runWerigoRead(client:Pick<PoolClient,'query'>, request:z.infer<typeof readRequest>, now=Date.now()) {
  if (request.tool === 'list_bookings') {
    const a=request.args;
    const {rows}=await client.query(`WITH booking AS (
      SELECT booking_code AS reference,'website'::text AS source,status::text AS status,
        start_at AS starts_at,end_at AS ends_at,vehicle_model::text AS model,quantity,created_at
      FROM public.bookings
      UNION ALL
      SELECT code,'ops',status,to_timestamp(start_at/1000.0),to_timestamp(end_at/1000.0),NULL,
        jsonb_array_length(unit_ids::jsonb),to_timestamp(created_at/1000.0)
      FROM ops.bookings WHERE id NOT LIKE 'web:%'
    ) SELECT reference,source,status,starts_at,ends_at,model,quantity FROM booking
      WHERE ($1::text IS NULL OR upper(reference)=$1) AND ($2::text IS NULL OR status=$2)
        AND ($3::text IS NULL OR source=$3)
      ORDER BY created_at DESC,reference LIMIT $4`,[a.reference??null,a.status??null,a.source??null,a.limit]);
    return {bookings:rows};
  }
  if (request.tool === 'check_stock') {
    const a=request.args;
    const period=stockPeriod(a.start,a.end);
    if(!period) throw new RangeError('invalid_dates');
    const {rows}=await client.query(`SELECT m.model,
      (SELECT count(*)::int FROM ops.units u WHERE u.model=m.model AND u.usage='rental') AS rental_units,
      (SELECT count(*)::int FROM ops.available_units(m.model,'',$2::bigint,$1::bigint)) AS available
      FROM (VALUES ('bees'),('victory'),('athena'),('edpower')) m(model)
      WHERE ($3::text IS NULL OR m.model=$3) ORDER BY m.model`,[period.start,period.end,a.model??null]);
    return {starts_at:new Date(period.start).toISOString(),ends_at:new Date(period.end).toISOString(),stock:rows};
  }
  const a=request.args;
  const {rows}=await client.query(`WITH rental AS (
    SELECT code AS reference,CASE WHEN id LIKE 'web:%' THEN 'website' ELSE 'ops' END AS source,
      CASE WHEN status='completed' THEN 'returned' WHEN status='confirmed' THEN 'scheduled'
        WHEN end_at<$3::bigint THEN 'overdue' ELSE 'active' END AS status,
      to_char(to_timestamp(start_at/1000.0) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS starts_at,
      to_char(to_timestamp(end_at/1000.0) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ends_at,
      'timestamp' AS date_precision,updated_at
    FROM ops.bookings WHERE status IN ('confirmed','active','completed')
    UNION ALL
    SELECT 'R-'||upper(substr(md5(id),1,12)), 'imported',
      CASE WHEN source_status='Done' OR followup_state='returned' THEN 'returned'
        WHEN start_date>$4 THEN 'scheduled'
        WHEN coalesce(nullif(operational_end_date,''),end_date) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND coalesce(nullif(operational_end_date,''),end_date)<$4 THEN 'overdue'
        ELSE 'open_import' END,
      CASE WHEN start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN start_date ELSE NULL END,
      CASE WHEN coalesce(nullif(operational_end_date,''),end_date) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN coalesce(nullif(operational_end_date,''),end_date) ELSE NULL END,
      'date_only',updated_at
    FROM ops.rental_records
  ) SELECT reference,source,status,starts_at,ends_at,date_precision FROM rental
    WHERE ($1::text IS NULL OR upper(reference)=$1) AND ($2::text IS NULL OR status=$2)
    ORDER BY updated_at DESC,reference LIMIT $5`,[a.reference??null,a.status??null,now,baliDay(now),a.limit]);
  return {rentals:rows};
}
