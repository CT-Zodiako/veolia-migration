import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type SuiResumenFormatosRow = Record<string, unknown>;

export interface SuiResumenFormatosResponse {
  formato: string;
  filas: SuiResumenFormatosRow[];
}

interface ApiEnvelope<T> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
  errorCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SuiResumenFormatosService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/sui`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  getResumenF19(aps: number): Observable<SuiResumenFormatosRow[]> {
    return this.http.post<ApiEnvelope<SuiResumenFormatosResponse>>(`${this.baseUrl}/resumenF19`, { aps }, { headers: this.getHeaders() })
      .pipe(map(response => response.data?.filas ?? []));
  }

  getResumenF23(aps: number): Observable<SuiResumenFormatosRow[]> {
    return this.http.post<ApiEnvelope<SuiResumenFormatosResponse>>(`${this.baseUrl}/resumenF23`, { aps }, { headers: this.getHeaders() })
      .pipe(map(response => response.data?.filas ?? []));
  }

  getResumenF24(aps: number): Observable<SuiResumenFormatosRow[]> {
    return this.http.post<ApiEnvelope<SuiResumenFormatosResponse>>(`${this.baseUrl}/resumenF24`, { aps }, { headers: this.getHeaders() })
      .pipe(map(response => response.data?.filas ?? []));
  }

  getResumenF35(aps: number): Observable<SuiResumenFormatosRow[]> {
    return this.http.post<ApiEnvelope<SuiResumenFormatosResponse>>(`${this.baseUrl}/resumenF35`, { aps }, { headers: this.getHeaders() })
      .pipe(map(response => response.data?.filas ?? []));
  }

  getResumenF36(aps: number): Observable<SuiResumenFormatosRow[]> {
    return this.http.post<ApiEnvelope<SuiResumenFormatosResponse>>(`${this.baseUrl}/resumenF36`, { aps }, { headers: this.getHeaders() })
      .pipe(map(response => response.data?.filas ?? []));
  }
}
