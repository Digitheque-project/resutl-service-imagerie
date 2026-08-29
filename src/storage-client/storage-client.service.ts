import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageClientService {
  private readonly logger = new Logger(StorageClientService.name);
  private readonly storageServiceUrl: string | null;
  private readonly uploadDir: string;

  constructor() {
    this.storageServiceUrl = process.env.STORAGE_SERVICE_URL || null;
    this.uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{ fileName: string; url: string; path: string }> {
    if (this.storageServiceUrl) {
      try {
        return await this.uploadToStorageService(buffer, originalName, mimeType);
      } catch (error) {
        // Confirmé en conditions réelles : le service de stockage externe
        // répond 429 (quota épuisé côté fournisseur) et fait échouer TOUT
        // upload d'image, alors qu'un repli local existe déjà dans ce même
        // fichier et n'était jamais utilisé une fois STORAGE_SERVICE_URL
        // configuré. On bascule sur ce repli plutôt que de bloquer
        // durablement la validation des comptes rendus d'imagerie.
        this.logger.warn(
          `Stockage externe indisponible (${error instanceof Error ? error.message : 'erreur inconnue'}), repli sur le stockage local.`,
        );
        return this.uploadLocally(buffer, originalName, mimeType);
      }
    }
    return this.uploadLocally(buffer, originalName, mimeType);
  }

  private async uploadToStorageService(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{ fileName: string; url: string; path: string }> {
    try {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), originalName);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${this.storageServiceUrl}/files/upload`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Storage API responded ${res.status}`);
      }
      const data = await res.json();
      return {
        fileName: data.fileName,
        url: data.url,
        path: data.path,
      };
    } catch (error) {
      this.logger.error(`Failed to upload to storage service: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw new ServiceUnavailableException(
        `Failed to upload to storage service: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private uploadLocally(
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

      return Promise.resolve({ fileName, url, path: filePath });
    } catch (error) {
      throw new ServiceUnavailableException(
        `Failed to save file locally: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
