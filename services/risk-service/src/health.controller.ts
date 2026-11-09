import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiSchema, ApiTags } from '@nestjs/swagger';

@ApiSchema({ name: 'Health' })
class HealthDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe', operationId: 'getHealth' })
  @ApiOkResponse({ type: HealthDto })
  health(): HealthDto {
    return { status: 'ok' };
  }
}
