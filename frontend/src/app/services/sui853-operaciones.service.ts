import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type OperacionesRow = Record<string, unknown>;
export interface OperacionesEnvelope<T> { status: string; data: T; message?: string; }
export interface ResiduosRequest { apsId: string; year: number; month: number; }

@Injectable({ providedIn: 'root' })
export class Sui853OperacionesService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/sui853/operaciones`;
  constructor(private readonly http: HttpClient) {}

  detail(request: ResiduosRequest) {
    return this.http.post<OperacionesEnvelope<OperacionesRow[]>>(`${this.baseUrl}/residuosGenerados`, request, { headers: this.headers() });
  }

  summary() {
    return this.http.post<OperacionesEnvelope<OperacionesRow | null>>(`${this.baseUrl}/resumenResiduosGenerados`, {}, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': localStorage.getItem('jwtOken') || '' });
  }
}
