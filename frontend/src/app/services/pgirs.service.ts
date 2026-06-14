import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiEnvelope } from '../models/proyecciones.models';

@Injectable({ providedIn: 'root' })
export class PgirsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/pgirs`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  getResumen(apsId: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/resumen`, { apsId }, { headers: this.getHeaders() });
  }

  getInformeVariables(apsId: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/informe-variables`, { apsId }, { headers: this.getHeaders() });
  }

  getBarrido(apsId: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/barrido`, { apsId }, { headers: this.getHeaders() });
  }

  getVariables(apsId: number, anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/variables`, { apsId, anno, mes }, { headers: this.getHeaders() });
  }

  actualizarVariable(variables: any[]): Observable<ApiEnvelope<boolean>> {
    return this.http.post<ApiEnvelope<boolean>>(`${this.baseUrl}/actualizar-variable`, { variables }, { headers: this.getHeaders() });
  }

  guardarVariables(data: any): Observable<ApiEnvelope<boolean>> {
    return this.http.post<ApiEnvelope<boolean>>(`${this.baseUrl}/guardar`, data, { headers: this.getHeaders() });
  }
}
