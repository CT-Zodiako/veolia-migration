import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type SuiDashboardRow = Record<string, unknown>;

export interface SuiDashboardResponse {
  filas: SuiDashboardRow[];
}

interface ApiEnvelope<T> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
  errorCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SuiDashboardService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/sui`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  getDashboard(anno: number, mes: number): Observable<SuiDashboardRow[]> {
    return this.http.post<ApiEnvelope<SuiDashboardResponse>>(`${this.baseUrl}/dashboard`, { anno, mes }, { headers: this.getHeaders() })
      .pipe(map(response => response.data?.filas ?? []));
  }
}
