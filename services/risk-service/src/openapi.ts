import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { RETRY_DELAYS_MS } from './checks/callback-delivery';
import type { RiskConfig } from './config';

const description = (config: RiskConfig) => `
Verify company documents against the details your customer provided.
This is the **sandbox** environment: verdicts are deterministic, no authentication is required and no data leaves the service.

## How a check works

1. **Submit** a document with \`POST /v1/checks/trade-licence\`. You get \`202 Accepted\` with a check in \`pending\` status.
2. **Wait** — the check is processed asynchronously.
3. **Get the result** — poll \`GET /v1/checks/{id}\` until \`status\` is no longer \`pending\`, or pass a \`callbackUrl\` and receive a \`check.completed\` event.

## Statuses

| Status | Meaning |
| --- | --- |
| \`pending\` | Submitted and still processing. |
| \`approved\` | The document matches the submitted details and is valid. |
| \`rejected\` | The document contradicts the submitted details or has expired. \`reasons\` lists every problem found. |
| \`manual_review\` | The document could not be verified automatically and needs a human decision. |

\`approved\`, \`rejected\` and \`manual_review\` are terminal: once reached, a check never changes.

## Reason codes

| Code | Status | Meaning |
| --- | --- | --- |
| \`document_unreadable\` | \`manual_review\` | No licence details could be read from the document (for example, a photo or scan). |
| \`licence_number_mismatch\` | \`rejected\` | The licence number on the document differs from \`licenceNumber\`. Compared case-insensitively, ignoring spaces. |
| \`company_name_mismatch\` | \`rejected\` | The company name on the document differs from \`companyName\`. Compared case-insensitively, ignoring punctuation and extra whitespace. |
| \`licence_expired\` | \`rejected\` | The licence expiry date is in the past (UAE time). A licence is valid through its expiry date. |

Codes are stable; \`message\` is for humans and may change. New codes may be added over time.

## Callbacks

When a check with a \`callbackUrl\` completes, the service sends:

\`\`\`http
POST {callbackUrl}
Content-Type: application/json
X-Risk-Delivery-Id: dlv_…   (unique per attempt)
X-Risk-Check-Id: chk_…

{ "event": "check.completed", "check": { …Check } }
\`\`\`

- Any \`2xx\` response acknowledges the delivery. Respond quickly; requests time out after 10 seconds.
- Anything else is retried up to ${RETRY_DELAYS_MS.length} more times, after ${RETRY_DELAYS_MS.map((ms) => `${ms / 1000} s`).join(', ')}.
- Delivery is **at-least-once**: the same event can arrive more than once. Make your receiver idempotent by \`check.id\`.
- Callbacks are a convenience. \`GET /v1/checks/{id}\` is always the source of truth.

## Errors

Every error has the shape \`{ statusCode, message, errors? }\`. \`400\` responses list each invalid field in \`errors\`.
\`503\` means no check was created — retry the request with backoff.

## Sandbox behaviour

The sandbox reads text-based PDFs only. It looks for these lines on the document:

\`\`\`text
Licence No: CN-4815162
Company: Falcon Trading LLC
Expiry date: 2028-02-28
\`\`\`

Images (PNG, JPEG) and PDFs without all three lines end in \`manual_review\` with \`document_unreadable\`.
Checks are kept in memory and are lost when the service restarts.

| Variable | Default | This instance | Effect |
| --- | --- | --- | --- |
| \`RISK_MIN_DELAY_MS\` | \`2000\` | \`${config.minDelayMs}\` | Minimum processing time per check. |
| \`RISK_MAX_DELAY_MS\` | \`10000\` | \`${config.maxDelayMs}\` | Maximum processing time per check; the actual delay is random in between. |
| \`RISK_FAILURE_RATE\` | \`0\` | \`${config.failureRate}\` | Share of submissions (0–1) answered with \`503\` to simulate outages. |
| \`PORT\` | \`4100\` | \`${config.port}\` | HTTP port. |
`;

export function buildOpenApiDocument(app: INestApplication, config: RiskConfig): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle('Comfi Risk API')
    .setVersion('1.0.0')
    .addServer(`http://localhost:${config.port}`, 'Local sandbox')
    .setDescription(description(config).trim())
    .addTag('Checks', 'Submit documents for verification and retrieve verdicts.')
    .addTag('Health', 'Service status.')
    .build();
  const document = SwaggerModule.createDocument(app, builder);
  typeNullableReferences(document);
  return document;
}

/**
 * OpenAPI 3.0 ignores `nullable` unless `type` is set, but Nest emits nullable
 * object references as `{ nullable: true, allOf: [{ $ref }] }` without a type.
 */
function typeNullableReferences(document: OpenAPIObject): void {
  for (const schema of Object.values(document.components?.schemas ?? {})) {
    if ('$ref' in schema) continue;
    for (const property of Object.values(schema.properties ?? {})) {
      if (!('$ref' in property) && property.nullable && property.allOf && !property.type) property.type = 'object';
    }
  }
}
