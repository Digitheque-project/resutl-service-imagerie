import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PatientClientService {
  private readonly logger = new Logger(PatientClientService.name);
  private readonly baseUrl: string;
  private readonly chuIdPatient: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('PATIENT_API_URL') ?? 'https://acceuil-back-production.up.railway.app';
    this.chuIdPatient = config.get<string>('PATIENT_CHU_ID_1') ?? '';
  }

  async getPatient(idPermanent: string): Promise<Record<string, unknown> | null> {
    try {
      const url = `${this.baseUrl}/accueil/patients/${idPermanent}?chuId=${this.chuIdPatient}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`GET ${url} → ${res.status}`);
        return null;
      }
      const text = await res.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch (err) {
      this.logger.error(`Patient API error: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }
}
