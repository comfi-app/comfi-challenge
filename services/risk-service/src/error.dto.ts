import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';

export interface FieldError {
  field: string;
  message: string;
}

@ApiSchema({ name: 'FieldError' })
export class FieldErrorDto implements FieldError {
  @ApiProperty({ description: 'Name of the offending form field.', example: 'licenceNumber' })
  field!: string;

  @ApiProperty({ example: 'licenceNumber is required' })
  message!: string;
}

@ApiSchema({ name: 'Error' })
export class ErrorDto {
  @ApiProperty({ description: 'HTTP status code, repeated for convenience.', example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Request validation failed' })
  message!: string;

  @ApiPropertyOptional({
    type: [FieldErrorDto],
    description: 'Per-field validation errors. Present on `400` responses caused by invalid input.',
  })
  errors?: FieldErrorDto[];
}
