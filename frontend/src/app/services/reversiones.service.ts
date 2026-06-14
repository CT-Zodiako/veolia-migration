import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ReversionDetalleRow = Record<string, unknown>;

export interface AutorizarReversionPayload {
  aps: number;
  anno: number;
  mes: number;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class ReversionesService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/reversiones`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  autorizarReversion(data: AutorizarReversionPayload): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/crearAutorizacion`, data, { headers: this.getHeaders() });
  }

  detalladoAutorizacion(): Observable<ReversionDetalleRow[]> {
    return this.http.get<ReversionDetalleRow[]>(`${this.baseUrl}/detalladoAutorizacion`, { headers: this.getHeaders() });
  }
}
