import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponseEnvelope,
  DetaFacturacionResponse,
  FacturacionClusResponse,
  FacturacionDincResponse,
  FacturacionElectronicaResponse,
  FacturacionRequest,
  FacturacionResponse
} from '../models/facturacion.models';

@Injectable({ providedIn: 'root' })
export class FacturacionService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/facturacion`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || localStorage.getItem('token') || '';
    return new HttpHeaders({ 'Content-Type': 'application/json', 'x-access-token': token });
  }

  private unwrap<T>(action: string) {
    return (source: Observable<ApiResponseEnvelope<T>>) =>
      source.pipe(
        map((resp) => resp.data),
        catchError((err) => this.handleError(action, err))
      );
  }

  private handleError(action: string, error: HttpErrorResponse) {
    const backendMessage = String(error?.error?.message || '').trim();
    if (backendMessage) return throwError(() => new Error(backendMessage));
    return throwError(() => new Error(`No fue posible ${action}.`));
  }

  facturacion(payload: FacturacionRequest): Observable<FacturacionResponse> {
    return this.unwrap<FacturacionResponse>('consultar facturación')(
      this.http.post<ApiResponseEnvelope<FacturacionResponse>>(`${this.baseUrl}/facturacion`, payload, { headers: this.getHeaders() })
    );
  }

  detafacturacion(payload: FacturacionRequest): Observable<DetaFacturacionResponse> {
    return this.unwrap<DetaFacturacionResponse>('consultar detalle facturación')(
      this.http.post<ApiResponseEnvelope<DetaFacturacionResponse>>(`${this.baseUrl}/detafacturacion`, payload, { headers: this.getHeaders() })
    );
  }

  facturacionclus(payload: FacturacionRequest): Observable<FacturacionClusResponse> {
    return this.unwrap<FacturacionClusResponse>('consultar facturación clúster')(
      this.http.post<ApiResponseEnvelope<FacturacionClusResponse>>(`${this.baseUrl}/facturacionclus`, payload, { headers: this.getHeaders() })
    );
  }

  facturaciondinc(payload: FacturacionRequest): Observable<FacturacionDincResponse> {
    return this.unwrap<FacturacionDincResponse>('consultar facturación DINC')(
      this.http.post<ApiResponseEnvelope<FacturacionDincResponse>>(`${this.baseUrl}/facturaciondinc`, payload, { headers: this.getHeaders() })
    );
  }

  facturacionelectronica(payload: FacturacionRequest): Observable<FacturacionElectronicaResponse> {
    return this.unwrap<FacturacionElectronicaResponse>('consultar facturación electrónica')(
      this.http.post<ApiResponseEnvelope<FacturacionElectronicaResponse>>(`${this.baseUrl}/facturacionelectronica`, payload, { headers: this.getHeaders() })
    );
  }
}
