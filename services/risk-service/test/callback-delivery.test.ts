import { describe, expect, it } from 'vitest';
import { type Fetch, deliverCallback } from '../src/checks/callback-delivery';
import type { CheckCompletedEvent } from '../src/checks/check';

const event: CheckCompletedEvent = {
  event: 'check.completed',
  check: {
    id: 'chk_1',
    type: 'trade_licence',
    status: 'approved',
    reasons: [],
    reference: null,
    submitted: { companyName: 'A', licenceNumber: 'B', fileName: 'a.pdf', mimeType: 'application/pdf', size: 1 },
    extracted: { companyName: 'A', licenceNumber: 'B', expiryDate: '2030-01-01' },
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: '2026-01-01T00:00:05.000Z',
  },
};

describe('deliverCallback', () => {
  it('retries with backoff until a 2xx and sends a fresh delivery id per attempt', async () => {
    const outcomes: (number | Error)[] = [500, new Error('ECONNREFUSED'), 204];
    const requests: RequestInit[] = [];
    const fetch: Fetch = async (_url, init) => {
      requests.push(init);
      const outcome = outcomes.shift();
      if (outcome === undefined || outcome instanceof Error) throw outcome ?? new Error('unexpected attempt');
      return { status: outcome };
    };
    const waits: number[] = [];
    let id = 0;

    const result = await deliverCallback('https://receiver.test/hook', event, {
      fetch,
      sleep: async (ms) => void waits.push(ms),
      newDeliveryId: () => `dlv_${++id}`,
    });

    expect(result).toEqual({
      delivered: true,
      attempts: [
        { deliveryId: 'dlv_1', status: 500 },
        { deliveryId: 'dlv_2', status: null },
        { deliveryId: 'dlv_3', status: 204 },
      ],
    });
    expect(waits).toEqual([1_000, 3_000]);
    const headers = requests.map((init) => new Headers(init.headers));
    expect(headers.map((h) => h.get('X-Risk-Delivery-Id'))).toEqual(['dlv_1', 'dlv_2', 'dlv_3']);
    expect(headers.every((h) => h.get('X-Risk-Check-Id') === 'chk_1')).toBe(true);
    expect(JSON.parse(String(requests[0]?.body))).toEqual(event);
  });

  it('gives up after four attempts', async () => {
    const waits: number[] = [];
    const result = await deliverCallback('https://receiver.test/hook', event, {
      fetch: async () => ({ status: 503 }),
      sleep: async (ms) => void waits.push(ms),
    });

    expect(result.delivered).toBe(false);
    expect(result.attempts).toHaveLength(4);
    expect(waits).toEqual([1_000, 3_000, 9_000]);
  });
});
