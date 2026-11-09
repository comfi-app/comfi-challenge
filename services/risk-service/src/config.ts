import { z } from 'zod';

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65_535).default(4100),
    RISK_MIN_DELAY_MS: z.coerce.number().int().min(0).default(2_000),
    RISK_MAX_DELAY_MS: z.coerce.number().int().min(0).default(10_000),
    RISK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  })
  .refine((env) => env.RISK_MIN_DELAY_MS <= env.RISK_MAX_DELAY_MS, {
    message: 'RISK_MIN_DELAY_MS must not exceed RISK_MAX_DELAY_MS',
    path: ['RISK_MIN_DELAY_MS'],
  })
  .transform((env) => ({
    port: env.PORT,
    minDelayMs: env.RISK_MIN_DELAY_MS,
    maxDelayMs: env.RISK_MAX_DELAY_MS,
    failureRate: env.RISK_FAILURE_RATE,
  }));

/** Runtime configuration, read once from the environment at startup. */
export abstract class RiskConfig {
  abstract readonly port: number;
  abstract readonly minDelayMs: number;
  abstract readonly maxDelayMs: number;
  abstract readonly failureRate: number;
}

export function loadConfig(env: NodeJS.ProcessEnv): RiskConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  return result.data;
}
