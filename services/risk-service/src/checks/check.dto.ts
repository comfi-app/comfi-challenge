import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import {
  CHECK_STATUSES,
  CHECK_TYPES,
  type Check,
  type CheckCompletedEvent,
  type CheckStatus,
  type CheckType,
  type SubmittedDocument,
} from './check';
import { type ExtractedLicence, REASON_CODES, type Reason, type ReasonCode } from './trade-licence-rules';

@ApiSchema({ name: 'Reason' })
export class ReasonDto implements Reason {
  @ApiProperty({
    enum: REASON_CODES,
    enumName: 'ReasonCode',
    description: 'Stable, machine-readable reason. New codes may be added; treat unknown codes as informational.',
    example: 'licence_expired',
  })
  code!: ReasonCode;

  @ApiProperty({
    description: 'Human-readable explanation. Wording may change; do not parse it.',
    example: 'The licence expired on 2025-06-30.',
  })
  message!: string;
}

@ApiSchema({ name: 'SubmittedDocument', description: 'Details submitted with the check.' })
export class SubmittedDocumentDto implements SubmittedDocument {
  @ApiProperty({ example: 'Falcon Trading LLC' })
  companyName!: string;

  @ApiProperty({ example: 'CN-4815162' })
  licenceNumber!: string;

  @ApiProperty({ description: 'Original file name of the upload.', example: 'trade-licence.pdf' })
  fileName!: string;

  @ApiProperty({ enum: ['application/pdf', 'image/png', 'image/jpeg'], example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes.', example: 917 })
  size!: number;
}

@ApiSchema({ name: 'ExtractedLicence', description: 'Licence fields read from the document.' })
export class ExtractedLicenceDto implements ExtractedLicence {
  @ApiProperty({ description: 'Company name as printed on the licence.', example: 'Falcon Trading LLC' })
  companyName!: string;

  @ApiProperty({ description: 'Licence number as printed on the licence.', example: 'CN-4815162' })
  licenceNumber!: string;

  @ApiProperty({ format: 'date', description: 'Licence expiry date.', example: '2028-02-28' })
  expiryDate!: string;
}

@ApiSchema({ name: 'Check', description: 'A document verification check.' })
export class CheckDto implements Check {
  @ApiProperty({ description: 'Unique check identifier.', example: 'chk_8f14e45fceea167a5a36dedd' })
  id!: string;

  @ApiProperty({ enum: CHECK_TYPES, enumName: 'CheckType', example: 'trade_licence' })
  type!: CheckType;

  @ApiProperty({
    enum: CHECK_STATUSES,
    enumName: 'CheckStatus',
    description: '`pending` until processing finishes, then one of the terminal statuses. Terminal statuses never change.',
    example: 'approved',
  })
  status!: CheckStatus;

  @ApiProperty({
    type: [ReasonDto],
    description: 'Why the check ended in its status. Empty while `pending` and for `approved` checks.',
  })
  reasons!: ReasonDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Your own identifier, echoed back exactly as submitted.',
    example: 'customer-1042',
  })
  reference!: string | null;

  @ApiProperty({ type: SubmittedDocumentDto, description: 'What you submitted.' })
  submitted!: SubmittedDocumentDto;

  @ApiProperty({
    type: ExtractedLicenceDto,
    nullable: true,
    description: 'Fields read from the document. `null` while `pending` or when the document could not be read.',
  })
  extracted!: ExtractedLicenceDto | null;

  @ApiProperty({ format: 'date-time', example: '2026-11-08T10:15:00.000Z' })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the check reached a terminal status. `null` while `pending`.',
    example: '2026-11-08T10:15:04.512Z',
  })
  completedAt!: string | null;
}

@ApiSchema({ name: 'CheckCompletedEvent', description: 'Callback payload sent when a check reaches a terminal status.' })
export class CheckCompletedEventDto implements CheckCompletedEvent {
  @ApiProperty({ enum: ['check.completed'], example: 'check.completed' })
  event!: 'check.completed';

  @ApiProperty({ type: CheckDto, description: 'The check in its terminal state.' })
  check!: CheckDto;
}
