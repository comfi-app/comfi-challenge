import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { CreateCompanyBody, StartRunBody } from "@comfi/kyb-contracts";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { CompaniesService } from "./companies.service";

@Controller("admin/companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  list() {
    return this.companies.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(CreateCompanyBody)) body: CreateCompanyBody) {
    return this.companies.create(body.name, body.flowId);
  }

  @Get(":companyId")
  get(@Param("companyId", ParseUUIDPipe) companyId: string) {
    return this.companies.get(companyId);
  }

  @Post(":companyId/runs")
  startRun(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Body(new ZodValidationPipe(StartRunBody)) body: StartRunBody,
  ) {
    return this.companies.startRun(companyId, body.flowId);
  }
}
