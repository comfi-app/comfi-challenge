import { randomBytes } from 'node:crypto';
import { Injectable, Logger, NotFoundException, type OnApplicationShutdown } from '@nestjs/common';
import { RiskConfig } from '../config';
import { deliverCallback, sleep } from './callback-delivery';
import type { Check } from './check';
import type { TradeLicenceCheckRequest } from './submit-trade-licence-check.dto';
import { evaluateTradeLicence, readTradeLicence, uaeToday } from './trade-licence-rules';

@Injectable()
export class ChecksService implements OnApplicationShutdown {
  private readonly logger = new Logger(ChecksService.name);
  private readonly checks = new Map<string, Check>();
  private readonly timers = new Set<NodeJS.Timeout>();

  constructor(private readonly config: RiskConfig) {}

  /** Whether this request should simulate an outage, per `RISK_FAILURE_RATE`. */
  shouldSimulateOutage(): boolean {
    return Math.random() < this.config.failureRate;
  }

  submitTradeLicence(request: TradeLicenceCheckRequest): Check {
    const check: Check = {
      id: `chk_${randomBytes(12).toString('hex')}`,
      type: 'trade_licence',
      status: 'pending',
      reasons: [],
      reference: request.reference ?? null,
      submitted: {
        companyName: request.companyName,
        licenceNumber: request.licenceNumber,
        fileName: request.file.originalname,
        mimeType: request.file.mimetype,
        size: request.file.size,
      },
      extracted: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.checks.set(check.id, check);

    const extracted = readTradeLicence(request.file.buffer);
    const { minDelayMs, maxDelayMs } = this.config;
    const delay = minDelayMs + Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1));
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      const verdict = evaluateTradeLicence({ submitted: check.submitted, extracted, today: uaeToday() });
      const completed: Check = { ...check, ...verdict, extracted, completedAt: new Date().toISOString() };
      this.checks.set(check.id, completed);
      this.logger.log(`Check ${check.id} completed: ${completed.status}`);
      if (request.callbackUrl) void this.notify(request.callbackUrl, completed);
    }, delay);
    this.timers.add(timer);

    return check;
  }

  get(id: string): Check {
    const check = this.checks.get(id);
    if (!check) throw new NotFoundException(`Check ${id} not found`);
    return check;
  }

  onApplicationShutdown(): void {
    for (const timer of this.timers) clearTimeout(timer);
  }

  private async notify(url: string, check: Check): Promise<void> {
    const { delivered, attempts } = await deliverCallback(url, { event: 'check.completed', check }, { fetch, sleep });
    const summary = attempts.map((attempt) => attempt.status ?? 'network error').join(', ');
    if (delivered) this.logger.log(`Callback for ${check.id} delivered after ${attempts.length} attempt(s) [${summary}]`);
    else this.logger.warn(`Callback for ${check.id} failed after ${attempts.length} attempts [${summary}]`);
  }
}
