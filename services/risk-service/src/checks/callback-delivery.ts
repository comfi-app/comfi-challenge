import { randomUUID } from 'node:crypto';
import type { CheckCompletedEvent } from './check';

/** Delays before each retry; the first attempt is immediate. */
export const RETRY_DELAYS_MS = [1_000, 3_000, 9_000] as const;
const ATTEMPT_TIMEOUT_MS = 10_000;

export type Fetch = (url: string, init: RequestInit) => Promise<Pick<Response, 'status'>>;

export interface DeliveryDeps {
  fetch: Fetch;
  sleep: (ms: number) => Promise<void>;
  newDeliveryId?: () => string;
}

export interface DeliveryAttempt {
  deliveryId: string;
  /** HTTP status of the receiver's response, or `null` when the request itself failed. */
  status: number | null;
}

export interface DeliveryResult {
  delivered: boolean;
  attempts: DeliveryAttempt[];
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * POSTs the event as JSON to `url`. Any 2xx response counts as delivered; anything
 * else (including network errors and timeouts) is retried after each of
 * {@link RETRY_DELAYS_MS}.
 */
export async function deliverCallback(
  url: string,
  event: CheckCompletedEvent,
  { fetch, sleep, newDeliveryId = () => `dlv_${randomUUID().replaceAll('-', '')}` }: DeliveryDeps,
): Promise<DeliveryResult> {
  const body = JSON.stringify(event);
  const attempts: DeliveryAttempt[] = [];

  for (const delay of [0, ...RETRY_DELAYS_MS]) {
    if (delay > 0) await sleep(delay);
    const deliveryId = newDeliveryId();
    const status = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Comfi-Risk-Callbacks/1.0',
        'X-Risk-Delivery-Id': deliveryId,
        'X-Risk-Check-Id': event.check.id,
      },
      body,
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    }).then(
      (response) => response.status,
      () => null,
    );
    attempts.push({ deliveryId, status });
    if (status !== null && status >= 200 && status < 300) return { delivered: true, attempts };
  }

  return { delivered: false, attempts };
}
