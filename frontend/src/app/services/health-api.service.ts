import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface HealthResponse {
  status: string;
  message?: string;
  target?: string;
  service?: string;
}

@Injectable({ providedIn: 'root' })
export class HealthApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getAppHealth() {
    return this.http.get<HealthResponse>(`${this.baseUrl}/api/health`);
  }

  getDbHealth() {
    return this.http.get<HealthResponse>(`${this.baseUrl}/api/health/db`);
  }
}
