import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { CreateFlowBody, SaveDraftBody } from "@comfi/kyb-contracts";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { FlowsService } from "./flows.service";

@Controller("admin/flows")
export class FlowsController {
  constructor(private readonly flows: FlowsService) {}

  @Get()
  list() {
    return this.flows.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(CreateFlowBody)) body: CreateFlowBody) {
    return this.flows.create(body);
  }

  @Get(":flowId")
  get(@Param("flowId", ParseUUIDPipe) flowId: string) {
    return this.flows.get(flowId);
  }

  @Put(":flowId/draft")
  saveDraft(
    @Param("flowId", ParseUUIDPipe) flowId: string,
    @Body(new ZodValidationPipe(SaveDraftBody)) body: SaveDraftBody,
  ) {
    return this.flows.saveDraft(flowId, body.definition);
  }

  @Post(":flowId/validate")
  @HttpCode(200)
  validate(@Param("flowId", ParseUUIDPipe) flowId: string) {
    return this.flows.validate(flowId);
  }

  @Post(":flowId/publish")
  @HttpCode(200)
  publish(@Param("flowId", ParseUUIDPipe) flowId: string) {
    return this.flows.publish(flowId);
  }

  @Get(":flowId/versions/:version")
  version(@Param("flowId", ParseUUIDPipe) flowId: string, @Param("version", ParseIntPipe) version: number) {
    return this.flows.version(flowId, version);
  }

  @Post(":flowId/versions/:version/restore")
  @HttpCode(200)
  restoreVersion(@Param("flowId", ParseUUIDPipe) flowId: string, @Param("version", ParseIntPipe) version: number) {
    return this.flows.restoreVersion(flowId, version);
  }
}
