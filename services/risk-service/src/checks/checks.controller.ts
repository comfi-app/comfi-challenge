import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ErrorDto } from '../error.dto';
import { ValidationFailedException } from '../http-error.filter';
import { RETRY_DELAYS_MS } from './callback-delivery';
import { CheckCompletedEventDto, CheckDto } from './check.dto';
import { ChecksService } from './checks.service';
import {
  MAX_FILE_SIZE_BYTES,
  SubmitTradeLicenceCheckDto,
  parseTradeLicenceCheckRequest,
} from './submit-trade-licence-check.dto';

const exampleCheck = {
  id: 'chk_8f14e45fceea167a5a36dedd',
  type: 'trade_licence',
  reference: 'customer-1042',
  submitted: {
    companyName: 'Falcon Trading LLC',
    licenceNumber: 'CN-4815162',
    fileName: 'trade-licence.pdf',
    mimeType: 'application/pdf',
    size: 917,
  },
  createdAt: '2026-11-08T10:15:00.000Z',
} satisfies Partial<CheckDto>;

const extracted = { companyName: 'Falcon Trading LLC', licenceNumber: 'CN-4815162', expiryDate: '2028-02-28' };
const completedAt = '2026-11-08T10:15:04.512Z';

const checkExamples = {
  pending: {
    summary: 'Pending',
    value: { ...exampleCheck, status: 'pending', reasons: [], extracted: null, completedAt: null },
  },
  approved: {
    summary: 'Approved',
    value: { ...exampleCheck, status: 'approved', reasons: [], extracted, completedAt },
  },
  rejected: {
    summary: 'Rejected',
    value: {
      ...exampleCheck,
      status: 'rejected',
      reasons: [{ code: 'licence_expired', message: 'The licence expired on 2025-06-30.' }],
      extracted: { ...extracted, expiryDate: '2025-06-30' },
      completedAt,
    },
  },
  manualReview: {
    summary: 'Manual review',
    value: {
      ...exampleCheck,
      status: 'manual_review',
      reasons: [
        {
          code: 'document_unreadable',
          message: 'The licence details could not be read from the document. A reviewer will check it manually.',
        },
      ],
      extracted: null,
      completedAt,
    },
  },
} satisfies Record<string, { summary: string; value: CheckDto }>;

@ApiTags('Checks')
@ApiExtraModels(CheckCompletedEventDto)
@Controller('v1/checks')
export class ChecksController {
  constructor(private readonly checks: ChecksService) {}

  @Post('trade-licence')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 } }))
  @ApiOperation({
    operationId: 'createTradeLicenceCheck',
    summary: 'Submit a trade licence check',
    description:
      'Uploads a trade licence document together with the details it should match. ' +
      'The check is created in `pending` status and processed asynchronously: poll `GET /v1/checks/{id}` ' +
      'or provide `callbackUrl` to be notified when it completes.',
    callbacks: {
      checkCompleted: {
        '{$request.body#/callbackUrl}': {
          post: {
            summary: 'check.completed',
            description:
              `Sent once the check reaches a terminal status. Delivery is at-least-once: non-2xx responses, ` +
              `timeouts (10 s) and network errors are retried up to ${RETRY_DELAYS_MS.length} more times ` +
              `(after ${RETRY_DELAYS_MS.map((ms) => `${ms / 1000} s`).join(', ')}). Deduplicate by \`check.id\`.`,
            parameters: [
              {
                name: 'X-Risk-Delivery-Id',
                in: 'header',
                required: true,
                description: 'Unique per delivery attempt.',
                schema: { type: 'string', example: 'dlv_3974175c5e624bb7bf4aef17e13f064c' },
              },
              {
                name: 'X-Risk-Check-Id',
                in: 'header',
                required: true,
                description: 'Identifier of the completed check; same as `check.id` in the body.',
                schema: { type: 'string', example: 'chk_8f14e45fceea167a5a36dedd' },
              },
            ],
            requestBody: {
              required: true,
              content: { 'application/json': { schema: { $ref: getSchemaPath(CheckCompletedEventDto) } } },
            },
            responses: {
              '2XX': { description: 'Delivery acknowledged. Any 2xx status is accepted; the body is ignored.' },
              default: { description: 'Any other response is treated as a failed attempt and retried.' },
            },
          },
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SubmitTradeLicenceCheckDto })
  @ApiAcceptedResponse({
    type: CheckDto,
    description: 'Check accepted for processing. `Location` points to the check.',
    headers: { Location: { description: 'URL of the created check.', schema: { type: 'string' } } },
    examples: { pending: checkExamples.pending },
  })
  @ApiBadRequestResponse({
    type: ErrorDto,
    description: 'Invalid input. `errors` lists every offending field.',
    example: {
      statusCode: 400,
      message: 'Request validation failed',
      errors: [
        { field: 'licenceNumber', message: 'licenceNumber is required' },
        { field: 'file', message: 'file must be one of application/pdf, image/png, image/jpeg; got text/plain' },
      ],
    } satisfies ErrorDto,
  })
  @ApiPayloadTooLargeResponse({
    type: ErrorDto,
    description: '`file` exceeds 10 MB.',
    example: { statusCode: 413, message: 'File too large' } satisfies ErrorDto,
  })
  @ApiServiceUnavailableResponse({
    type: ErrorDto,
    description: 'Temporary outage. No check was created; retry the request later.',
    example: { statusCode: 503, message: 'Service temporarily unavailable' } satisfies ErrorDto,
  })
  submitTradeLicence(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): CheckDto {
    if (this.checks.shouldSimulateOutage()) throw new ServiceUnavailableException('Service temporarily unavailable');

    const parsed = parseTradeLicenceCheckRequest(body, file);
    if (!parsed.success) throw new ValidationFailedException(parsed.errors);

    const check = this.checks.submitTradeLicence(parsed.data);
    res.location(`/v1/checks/${check.id}`);
    return check;
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getCheck',
    summary: 'Retrieve a check',
    description: 'Returns the current state of a check. Poll until `status` is no longer `pending`.',
  })
  @ApiParam({ name: 'id', description: 'Check identifier returned on submission.', example: exampleCheck.id })
  @ApiOkResponse({ type: CheckDto, examples: checkExamples })
  @ApiNotFoundResponse({
    type: ErrorDto,
    description: 'No check with this identifier.',
    example: { statusCode: 404, message: `Check ${exampleCheck.id} not found` } satisfies ErrorDto,
  })
  getCheck(@Param('id') id: string): CheckDto {
    return this.checks.get(id);
  }
}
