import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IndiceValorPayload {
  id: number;
  val: number;
}

export interface IndicesPayload {
  anno: number;
  mes: number;
  valores: IndiceValorPayload[];
}

export interface ApiEnvelope<T> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
}

@Injectable({ providedIn: 'root' })
export class IndicesCraService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/indices`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  consultar(anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/consulta`, { anno, mes }, { headers: this.getHeaders() });
  }

  listar(): Observable<ApiEnvelope<any[]>> {
    return this.http.get<ApiEnvelope<any[]>>(this.baseUrl, { headers: this.getHeaders() });
  }

  obtenerPorId(id: number): Observable<ApiEnvelope<any>> {
    return this.http.get<ApiEnvelope<any>>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }

  crear(data: IndicesPayload): Observable<ApiEnvelope<any>> {
    return this.http.post<ApiEnvelope<any>>(`${this.baseUrl}/crear`, data, { headers: this.getHeaders() });
  }

  editar(data: IndicesPayload): Observable<ApiEnvelope<any>> {
    return this.http.put<ApiEnvelope<any>>(`${this.baseUrl}/editar`, data, { headers: this.getHeaders() });
  }

  eliminar(id: number, anno: number, mes: number): Observable<ApiEnvelope<{ id: number; deleted: boolean }>> {
    return this.http.delete<ApiEnvelope<{ id: number; deleted: boolean }>>(`${this.baseUrl}/eliminar/${id}?anno=${anno}&mes=${mes}`, {
      headers: this.getHeaders()
    });
  }
}
