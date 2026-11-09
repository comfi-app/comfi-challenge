import { type ArgumentsHost, BadRequestException, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import type { ErrorDto, FieldError } from './error.dto';

export class ValidationFailedException extends BadRequestException {
  constructor(readonly errors: FieldError[]) {
    super('Request validation failed');
  }
}

/** Renders every HTTP error as `{ statusCode, message, errors? }`. */
@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const statusCode = exception.getStatus();
    const body: ErrorDto = { statusCode, message: exception.message };
    if (exception instanceof ValidationFailedException) body.errors = exception.errors;
    host.switchToHttp().getResponse<Response>().status(statusCode).json(body);
  }
}
