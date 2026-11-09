import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ChecksModule } from './checks/checks.module';
import { RiskConfig, loadConfig } from './config';
import { HealthController } from './health.controller';
import { HttpErrorFilter } from './http-error.filter';

@Global()
@Module({
  providers: [{ provide: RiskConfig, useFactory: () => loadConfig(process.env) }],
  exports: [RiskConfig],
})
class ConfigModule {}

@Module({
  imports: [ConfigModule, ChecksModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule {}
