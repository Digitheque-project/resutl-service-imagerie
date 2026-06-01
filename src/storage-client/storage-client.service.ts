import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class StorageClientService {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('STORAGE_SERVICE_URL') ?? 'http://localhost:3001';
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{ fileName: string; url: string; path: string }> {
    try {
      const form = new FormData();
      form.append('file', buffer, {
        filename: originalName,
        contentType: mimeType,
      });

      const { data } = await axios.post(`${this.baseUrl}/files/upload`, form, {
        headers: form.getHeaders(),
      });

      return data;
    } catch (error) {
      throw new ServiceUnavailableException(
        `Storage service unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
