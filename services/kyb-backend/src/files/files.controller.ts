import { Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, StreamableFile } from "@nestjs/common";
import { Database } from "../db/database";

interface FileContentRow {
  file_name: string;
  mime_type: string;
  content: Buffer;
}

// Uploads carry a client-declared type; only types browsers render safely are shown inline.
const inlineTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]);

@Controller("files")
export class FilesController {
  constructor(private readonly db: Database) {}

  @Get(":fileId")
  @Header("X-Content-Type-Options", "nosniff")
  async download(@Param("fileId", ParseUUIDPipe) fileId: string): Promise<StreamableFile> {
    const { rows } = await this.db.query<FileContentRow>(
      "select file_name, mime_type, content from files where id = $1",
      [fileId],
    );
    const file = rows[0];
    if (!file) throw new NotFoundException("File not found");
    return new StreamableFile(file.content, {
      type: file.mime_type,
      length: file.content.length,
      disposition: `${inlineTypes.has(file.mime_type) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
    });
  }
}
