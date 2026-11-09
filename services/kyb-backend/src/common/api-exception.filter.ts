import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { ApiErrorBody } from "@comfi/kyb-contracts";
import type { Response } from "express";
import { ApiException } from "./api-exception";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const body = this.toBody(exception);
    if (body.statusCode >= 500) this.logger.error(exception);
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof ApiException) return exception.body;
    if (exception instanceof HttpException) {
      return { statusCode: exception.getStatus(), message: messageOf(exception) };
    }
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: "Internal server error" };
  }
}

/** Nest's built-in exceptions carry `message` as a string or a list of strings. */
function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === "string") return response;
  if ("message" in response) {
    const { message } = response;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join("; ");
  }
  return exception.message;
}
