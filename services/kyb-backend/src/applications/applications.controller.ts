import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { type ApplicationStatus, applicationStatuses, DecisionBody, ReturnBody } from "@comfi/kyb-contracts";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ApplicationsService } from "./applications.service";

const StatusQuery = z.enum(applicationStatuses).optional();
// Approve and reject may be sent without a body.
const OptionalDecisionBody = DecisionBody.optional().transform((body) => body?.comment || null);

@Controller("admin/applications")
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  list(@Query("status", new ZodValidationPipe(StatusQuery)) status: ApplicationStatus | undefined) {
    return this.applications.list(status);
  }

  @Get(":applicationId")
  get(@Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return this.applications.get(applicationId);
  }

  @Post(":applicationId/approve")
  @HttpCode(200)
  approve(
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Body(new ZodValidationPipe(OptionalDecisionBody)) comment: string | null,
  ) {
    return this.applications.decide(applicationId, { kind: "approved", comment });
  }

  @Post(":applicationId/reject")
  @HttpCode(200)
  reject(
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Body(new ZodValidationPipe(OptionalDecisionBody)) comment: string | null,
  ) {
    return this.applications.decide(applicationId, { kind: "rejected", comment });
  }

  @Post(":applicationId/return")
  @HttpCode(200)
  return(
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Body(new ZodValidationPipe(ReturnBody)) body: ReturnBody,
  ) {
    return this.applications.decide(applicationId, { kind: "returned", comment: body.comment });
  }
}
