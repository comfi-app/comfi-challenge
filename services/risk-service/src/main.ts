import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RiskConfig } from './config';
import { buildOpenApiDocument } from './openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.enableShutdownHooks();

  const config = app.get(RiskConfig);
  SwaggerModule.setup('docs', app, () => buildOpenApiDocument(app, config), {
    customSiteTitle: 'Comfi Risk API',
    swaggerOptions: { defaultModelsExpandDepth: 1, docExpansion: 'list' },
  });

  await app.listen(config.port);
  new Logger('Bootstrap').log(`Comfi Risk API listening on http://localhost:${config.port} (docs at /docs)`);
}

void bootstrap();
