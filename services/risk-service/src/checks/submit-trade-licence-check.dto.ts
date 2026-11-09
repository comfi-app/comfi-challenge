import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { z } from 'zod';
import type { FieldError } from '../error.dto';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

/** Multipart form of `POST /v1/checks/trade-licence`. Documents the request body. */
@ApiSchema({ name: 'TradeLicenceCheckRequest' })
export class SubmitTradeLicenceCheckDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Trade licence document: PDF, PNG or JPEG, up to 10 MB.',
  })
  file!: Express.Multer.File;

  @ApiProperty({ maxLength: 200, description: 'Legal company name as registered.', example: 'Falcon Trading LLC' })
  companyName!: string;

  @ApiProperty({ maxLength: 64, description: 'Trade licence number.', example: 'CN-4815162' })
  licenceNumber!: string;

  @ApiPropertyOptional({
    format: 'uri',
    description: 'HTTP(S) URL that receives a `check.completed` event when the check finishes.',
    example: 'https://example.com/callbacks/risk',
  })
  callbackUrl?: string;

  @ApiPropertyOptional({
    maxLength: 128,
    description: 'Your own identifier for this check. Echoed back as `reference`; not required to be unique.',
    example: 'customer-1042',
  })
  reference?: string;
}

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const fieldsSchema = z.object({
  companyName: z
    .string({ error: 'companyName is required' })
    .trim()
    .min(1, 'companyName is required')
    .max(200, 'companyName must be at most 200 characters'),
  licenceNumber: z
    .string({ error: 'licenceNumber is required' })
    .trim()
    .min(1, 'licenceNumber is required')
    .max(64, 'licenceNumber must be at most 64 characters'),
  callbackUrl: z.preprocess(
    emptyToUndefined,
    z.url({ protocol: /^https?$/, error: 'callbackUrl must be an absolute http or https URL' }).optional(),
  ),
  reference: z.preprocess(
    emptyToUndefined,
    z.string().max(128, 'reference must be at most 128 characters').optional(),
  ),
});

export type TradeLicenceCheckRequest = z.infer<typeof fieldsSchema> & {
  file: Pick<Express.Multer.File, 'originalname' | 'mimetype' | 'size' | 'buffer'>;
};

type ParseResult = { success: true; data: TradeLicenceCheckRequest } | { success: false; errors: FieldError[] };

export function parseTradeLicenceCheckRequest(body: unknown, file: Express.Multer.File | undefined): ParseResult {
  const fields = fieldsSchema.safeParse(body ?? {});
  const errors: FieldError[] = fields.success
    ? []
    : fields.error.issues.map((issue) => ({ field: String(issue.path[0] ?? 'body'), message: issue.message }));

  if (!file) {
    errors.push({ field: 'file', message: 'file is required' });
  } else if (!ACCEPTED_MIME_TYPES.some((type) => type === file.mimetype)) {
    errors.push({ field: 'file', message: `file must be one of ${ACCEPTED_MIME_TYPES.join(', ')}; got ${file.mimetype}` });
  } else if (file.size === 0) {
    errors.push({ field: 'file', message: 'file must not be empty' });
  }

  if (!fields.success || !file || errors.length > 0) return { success: false, errors };
  return { success: true, data: { ...fields.data, file } };
}
