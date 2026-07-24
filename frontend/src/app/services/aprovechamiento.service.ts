import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AprovechamientoItem {
  apsId: number;
  aproAnno: number;
  aproMes: number;
  aproActivar: number;
}

export interface ApiEnvelope<T> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
}

@Injectable({ providedIn: 'root' })
export class AprovechamientoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/aprovechamiento`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  consultar(payload: { aps: number; anno: number; mes: number }): Observable<ApiEnvelope<AprovechamientoItem | null>> {
    return this.http.post<ApiEnvelope<AprovechamientoItem | null>>(`${this.baseUrl}/consulta`, payload, { headers: this.getHeaders() });
  }

  actualizar(payload: { aps: number; anno: number; mes: number; activar: boolean }): Observable<ApiEnvelope<null>> {
    return this.http.post<ApiEnvelope<null>>(`${this.baseUrl}/actualizar`, payload, { headers: this.getHeaders() });
  }
}
