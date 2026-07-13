import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageClientService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{ fileName: string; url: string; path: string }> {
    try {
      const ext = path.extname(originalName) || '.bin';
      const fileName = `${randomUUID()}${ext}`;
      const filePath = path.join(this.uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      const url = `/uploads/${fileName}`;

      return { fileName, url, path: filePath };
    } catch (error) {
      throw new ServiceUnavailableException(
        `Failed to save file locally: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
