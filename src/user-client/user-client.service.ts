import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UserClientService {
  private readonly logger = new Logger(UserClientService.name);
  private readonly baseUrl: string;
  private readonly jwtSecret: string;
  private token: string | null = null;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('USER_API_URL') ?? 'https://gateway-znhb.onrender.com';
    this.jwtSecret = config.get<string>('JWT_SECRET') ?? 'secret123';
  }

  private generateToken(): string {
    if (!this.token) {
      this.token = jwt.sign({}, this.jwtSecret, { expiresIn: '1h' });
    }
    return this.token!;
  }

  async getUser(userId: string): Promise<{ id?: string; firstname?: string; name?: string; job?: string } | null> {
    try {
      const token = this.generateToken();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${this.baseUrl}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`GET /users/${userId} -> ${res.status}`);
        return null;
      }
      const text = await res.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch (err) {
      this.logger.error(`User API error: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  async getUsersByChu(chuId: string): Promise<any[]> {
    try {
      const token = this.generateToken();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${this.baseUrl}/users/${chuId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`GET /users/${chuId} -> ${res.status}`);
        return [];
      }
      const text = await res.text();
      if (!text) return [];
      const body = JSON.parse(text);
      return Array.isArray(body) ? body : (body.data ?? [body].filter(Boolean));
    } catch (err) {
      this.logger.error(`User API error: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }
}
