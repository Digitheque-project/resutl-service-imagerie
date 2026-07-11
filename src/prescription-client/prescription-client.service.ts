import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrescriptionClientService {
  private readonly logger = new Logger(PrescriptionClientService.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('PRESCRIPTION_API_URL') ?? 'http://localhost:3002/api';
  }

  async getExamsByDateRange(dateFrom: string, dateTo: string, page = 1, limit = 1000): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/examens?dateFrom=${dateFrom}&dateTo=${dateTo}&page=${page}&limit=${limit}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`GET /examens → ${res.status}`);
        return [];
      }
      const body = await res.json();
      const items: any[] = body.data ?? [];
      const pagination = body.pagination;
      if (pagination && page < pagination.totalPages) {
        const next = await this.getExamsByDateRange(dateFrom, dateTo, page + 1, limit);
        return [...items, ...next];
      }
      return items;
    } catch (err) {
      this.logger.error(`Prescription API error: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }
}
