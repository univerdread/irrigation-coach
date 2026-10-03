import type { AddressInfo } from 'node:net';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FarmInput } from '@irrigation-coach/engine';
import { createGateway } from '../src/server';
import { MemoryStore } from '../src/store';

const GOLDEN = join(import.meta.dirname, '..', '..', 'contracts', 'fixtures', 'golden');
const worked = JSON.parse(readFileSync(join(GOLDEN, readdirSync(GOLDEN).find((f) => f.startsWith('07'))!), 'utf8')).input as FarmInput;

describe("gateway speaks Africa's Talking's callback format", () => {
  const store = new MemoryStore();
  const sent: { to: string; message: string }[] = [];
  const server = createGateway({ store, send: async (to, message) => void sent.push({ to, message }), agentToken: 'secret', now: () => new Date('2026-10-03T06:00:00Z') });
  let base = '';
  beforeAll(async () => {
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  const form = (o: Record<string, string>) => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o) });

  it('register (agent token + consent required), USSD, SMS, morning, forget', async () => {
    expect((await fetch(`${base}/register`, { method: 'POST', body: '{}' })).status).toBe(401);
    const reg = await fetch(`${base}/register`, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
      body: JSON.stringify({ phone: '+254700000001', locale: 'sw', farm: worked, consent_at: '2026-10-03T05:00:00Z' }),
    });
    expect(reg.status).toBe(201);

    const ussd = await fetch(`${base}/ussd`, form({ sessionId: 's1', serviceCode: '*384*123#', phoneNumber: '+254700000001', networkCode: '63902', text: '1' }));
    expect(ussd.headers.get('content-type')).toContain('text/plain');
    expect(await ussd.text()).toMatch(/^END .*saa 4 na dakika 10/);

    await fetch(`${base}/sms`, form({ from: '+254700000001', to: '12345', text: 'MSAADA' }));
    expect(sent.at(-1)).toMatchObject({ to: '+254700000001' });
    expect(sent.at(-1)!.message).toContain('MVUA 5');

    const morning = await fetch(`${base}/morning`, { method: 'POST', headers: { Authorization: 'Bearer secret' } });
    expect(await morning.json()).toEqual({ sent: 1 });

    await fetch(`${base}/forget`, { method: 'POST', headers: { Authorization: 'Bearer secret' }, body: JSON.stringify({ phone: '+254700000001' }) });
    expect(store.get('+254700000001')).toBeNull();
  });
});
