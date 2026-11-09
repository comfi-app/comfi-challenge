import { HttpException, HttpStatus } from "@nestjs/common";
import type { ApiErrorBody, PublishIssue } from "@comfi/kyb-contracts";

/** HttpException whose body is already shaped as `ApiErrorBody`. */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly body: ApiErrorBody,
  ) {
    super(body, status);
  }

  static fieldErrors(message: string, fieldErrors: Record<string, string>) {
    return new ApiException(HttpStatus.BAD_REQUEST, { statusCode: HttpStatus.BAD_REQUEST, message, fieldErrors });
  }

  static issues(message: string, issues: PublishIssue[]) {
    return new ApiException(HttpStatus.BAD_REQUEST, { statusCode: HttpStatus.BAD_REQUEST, message, issues });
  }
}
