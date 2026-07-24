import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductividadItem {
  apsaId: number;
  prodAnno: number;
  prodMes: number;
  prodValor: number;
}

export interface ProductividadPayload {
  aps: number;
  anno: number;
  mes: number;
  valor: number;
}

export interface ApiEnvelope<T> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductividadService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/productividad`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  consultar(payload: { aps: number; anno: number; mes: number }): Observable<ApiEnvelope<ProductividadItem | null>> {
    return this.http.post<ApiEnvelope<ProductividadItem | null>>(`${this.baseUrl}/consulta`, payload, { headers: this.getHeaders() });
  }

  crear(payload: ProductividadPayload): Observable<ApiEnvelope<null>> {
    return this.http.post<ApiEnvelope<null>>(`${this.baseUrl}/crear`, payload, { headers: this.getHeaders() });
  }

  editar(payload: ProductividadPayload): Observable<ApiEnvelope<null>> {
    return this.http.put<ApiEnvelope<null>>(`${this.baseUrl}/editar`, payload, { headers: this.getHeaders() });
  }
}
