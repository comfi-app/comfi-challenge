import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SubmitStepBody } from "@comfi/kyb-contracts";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ApplicantService } from "./applicant.service";

const maxUploadBytes = 10 * 1024 * 1024;

@Controller("applicant/runs/:token")
export class ApplicantController {
  constructor(private readonly applicant: ApplicantService) {}

  @Get()
  view(@Param("token") token: string) {
    return this.applicant.view(token);
  }

  @Post("files")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: maxUploadBytes, files: 1 } }))
  upload(@Param("token") token: string, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Attach the file as multipart field "file"');
    return this.applicant.upload(token, {
      // Multer decodes multipart file names as latin1.
      fileName: Buffer.from(file.originalname, "latin1").toString("utf8"),
      mimeType: file.mimetype,
      content: file.buffer,
    });
  }

  @Post("applications/:applicationId/steps/:stepId/submit")
  @HttpCode(200)
  submitStep(
    @Param("token") token: string,
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Param("stepId") stepId: string,
    @Body(new ZodValidationPipe(SubmitStepBody)) body: SubmitStepBody,
  ) {
    return this.applicant.submitStep(token, applicationId, stepId, body.values);
  }
}
