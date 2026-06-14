import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SetReversionRequest {
  aps: number;
  anno: number;
  mes: number;
  motivo: string;
}

export interface ReversionResponse {
  ok: boolean;
  message?: string | null;
  reversionId?: number | null;
}

export interface ReversionHistoryItem {
  id: number;
  aps: number;
  anno: number;
  mes: number;
  motivo: string;
  fecha: string;
  usuario: string;
  nombreAps: string;
}

@Injectable({ providedIn: 'root' })
export class SuministrosService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/suministros`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  setReversion(payload: SetReversionRequest): Observable<ReversionResponse> {
    return this.http.post<ReversionResponse>(`${this.baseUrl}/setReversion`, payload, { headers: this.getHeaders() });
  }

  getReversion(): Observable<ReversionHistoryItem[]> {
    return this.http.get<ReversionHistoryItem[]>(`${this.baseUrl}/getReversion`, { headers: this.getHeaders() });
  }
}
