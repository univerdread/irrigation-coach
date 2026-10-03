// Basic-phone gateway: the same engine behind USSD and SMS, for farmers without a smartphone.
// The farmer needs no data bundle and no app: only GSM coverage, which reaches far more of rural
// Kenya than mobile internet. This is the one part of the system that runs on a server (a
// basic phone cannot compute), so it stores the minimum, with consent, and deletes on request.
//
// Run:   npm run serve -w channels           (PORT=4650 by default)
// Wire:  Africa's Talking USSD callback  -> POST /ussd      (form: sessionId, phoneNumber, serviceCode, text)
//        Africa's Talking incoming SMS   -> POST /sms       (form: from, to, text, date, id)
//        Scheduler at 06:00              -> POST /morning   (sends today's message to everyone)
//        Dealer / extension officer app  -> POST /register  (JSON profile, requires AGENT_TOKEN)
// Send:  set AT_USERNAME and AT_API_KEY (sandbox username is "sandbox") to send real SMS;
//        otherwise outgoing messages are appended to the outbox file for inspection.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFao56DeficitSource, type PlanOptions } from '@irrigation-coach/engine';
import { handleUssd } from './ussd';
import { handleSms, morningMessages } from './sms';
import type { Profile, ProfileStore } from './store';

const here = dirname(fileURLToPath(import.meta.url));

export class FileStore implements ProfileStore {
  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
  }
  private read(): Record<string, Profile> {
    return existsSync(this.path) ? (JSON.parse(readFileSync(this.path, 'utf8')) as Record<string, Profile>) : {};
  }
  private write(d: Record<string, Profile>) {
    writeFileSync(this.path, JSON.stringify(d, null, 1));
  }
  get(phone: string) {
    return this.read()[phone] ?? null;
  }
  put(p: Profile) {
    const d = this.read();
    d[p.phone] = p;
    this.write(d);
  }
  all() {
    return Object.values(this.read());
  }
  delete(phone: string) {
    const d = this.read();
    delete d[phone];
    this.write(d);
  }
}

export type Sender = (to: string, message: string) => Promise<void>;

export function africasTalkingSender(username: string, apiKey: string, sandbox = username === 'sandbox'): Sender {
  const url = sandbox ? 'https://api.sandbox.africastalking.com/version1/messaging' : 'https://api.africastalking.com/version1/messaging';
  return async (to, message) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', apiKey },
      body: new URLSearchParams({ username, to, message }),
    });
    if (!res.ok) throw new Error(`Africa's Talking ${res.status}: ${await res.text()}`);
  };
}

export function outboxSender(path: string): Sender {
  return async (to, message) => {
    appendFileSync(path, JSON.stringify({ to, message, at: new Date().toISOString() }) + '\n');
  };
}

async function body(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

export interface GatewayOptions {
  store: ProfileStore;
  send: Sender;
  agentToken?: string;
  now?: () => Date;
  /** Same deficit source as the smartphone app (FAO-56 on the area pack's climatology). */
  planOptions?: PlanOptions;
}

/** FAO-56 deficit source from an area pack's climatology (contracts/schemas/area-pack.schema.json). */
export function planOptionsFromPack(path: string): PlanOptions {
  const pack = JSON.parse(readFileSync(path, 'utf8')) as { climatology: { lat: number; tmax_c: number[]; tmin_c: number[] } };
  const c = pack.climatology;
  return { deficitSource: createFao56DeficitSource({ lat_deg: c.lat, tmax_c: c.tmax_c, tmin_c: c.tmin_c }) };
}

export function createGateway({ store, send, agentToken, now = () => new Date(), planOptions = {} }: GatewayOptions) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const reply = (code: number, text: string, type = 'text/plain') => {
      res.writeHead(code, { 'Content-Type': `${type}; charset=utf-8` });
      res.end(text);
    };
    try {
      const url = new URL(req.url ?? '/', 'http://local');
      if (req.method === 'GET' && url.pathname === '/health') return reply(200, 'ok');
      if (req.method !== 'POST') return reply(405, 'method not allowed');
      const raw = await body(req);
      if (url.pathname === '/ussd') {
        const f = new URLSearchParams(raw);
        return reply(200, handleUssd({ sessionId: f.get('sessionId') ?? '', serviceCode: f.get('serviceCode') ?? '', phoneNumber: f.get('phoneNumber') ?? '', text: f.get('text') ?? '' }, now(), store, planOptions));
      }
      if (url.pathname === '/sms') {
        const f = new URLSearchParams(raw);
        const from = f.get('from') ?? '';
        const text = handleSms(from, f.get('text') ?? '', now(), store, planOptions);
        await send(from, text);
        return reply(200, 'ok');
      }
      if (url.pathname === '/morning') {
        if (!agentToken || req.headers.authorization !== `Bearer ${agentToken}`) return reply(401, 'unauthorized');
        const msgs = morningMessages(store, now(), planOptions);
        for (const m of msgs) await send(m.phone, m.text);
        return reply(200, JSON.stringify({ sent: msgs.length }), 'application/json');
      }
      if (url.pathname === '/register') {
        if (!agentToken || req.headers.authorization !== `Bearer ${agentToken}`) return reply(401, 'unauthorized');
        const p = JSON.parse(raw) as Profile;
        if (!p.phone || !p.farm || !p.consent_at) return reply(400, 'phone, farm and consent_at are required');
        store.put({ phone: p.phone, locale: p.locale === 'en' ? 'en' : 'sw', farm: p.farm, consent_at: p.consent_at });
        return reply(201, 'registered');
      }
      if (url.pathname === '/forget') {
        // Farmer's right to erasure: their dealer/officer (or the farmer via support) removes them.
        if (!agentToken || req.headers.authorization !== `Bearer ${agentToken}`) return reply(401, 'unauthorized');
        store.delete((JSON.parse(raw) as { phone: string }).phone);
        return reply(200, 'deleted');
      }
      return reply(404, 'not found');
    } catch (e) {
      return reply(500, String(e));
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dataDir = process.env.DATA_DIR ?? join(here, '..', 'data');
  const store = new FileStore(join(dataDir, 'profiles.json'));
  const send = process.env.AT_USERNAME && process.env.AT_API_KEY ? africasTalkingSender(process.env.AT_USERNAME, process.env.AT_API_KEY) : outboxSender(join(dataDir, 'outbox.jsonl'));
  const port = Number(process.env.PORT ?? 4650);
  const pack = process.env.AREA_PACK ?? join(here, '..', '..', 'app', 'src', 'demo', 'packs', 'ke-kajiado-kimana-demo.json');
  createGateway({ store, send, planOptions: planOptionsFromPack(pack), ...(process.env.AGENT_TOKEN ? { agentToken: process.env.AGENT_TOKEN } : {}) }).listen(port, () =>
    console.log(`basic-phone gateway on :${port} (${process.env.AT_API_KEY ? "Africa's Talking" : 'outbox file'})`),
  );
}
