import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PatientClientService {
  private readonly logger = new Logger(PatientClientService.name);
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly password: string;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: ConfigService) {
    this.baseUrl  = config.get<string>('PATIENT_API_URL') ?? 'https://prescription-sih-api-0yj3.onrender.com';
    this.email    = config.get<string>('PATIENT_API_EMAIL') ?? '';
    this.password = config.get<string>('PATIENT_API_PASSWORD') ?? '';
  }

  private async ensureToken(): Promise<string> {
    const cached = this.token;
    if (cached && Date.now() < this.tokenExpiresAt - 60_000) {
      return cached;
    }

    if (!this.email || !this.password) {
      this.logger.warn('PATIENT_API_EMAIL/PASSWORD not set, skipping auth');
      return '';
    }

    try {
      const { data } = await axios.post(`${this.baseUrl}/auth/login`, {
        email: this.email,
        password: this.password,
      });
      const t: string = data.access_token;
      this.token = t;
      this.tokenExpiresAt = Date.now() + 3600_000;
      return t;
    } catch (err) {
      this.logger.error(`Failed to obtain patient API token: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async getPatient(idPermanent: string): Promise<Record<string, unknown> | null> {
    try {
      const token = await this.ensureToken();
      if (!token) return null;

      const { data } = await axios.get(
        `${this.baseUrl}/patients/${idPermanent}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        this.logger.warn(`Patient not found: ${idPermanent}`);
        return null;
      }
      this.logger.error(`Patient API error: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }
}
