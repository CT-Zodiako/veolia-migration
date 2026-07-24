import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponseEnvelope, InformeCostosResponse } from '../models/sui-integracion.models';

@Injectable({ providedIn: 'root' })
export class InformesService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/informes`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || localStorage.getItem('token') || '';
    return new HttpHeaders({ 'Content-Type': 'application/json', 'x-access-token': token });
  }

  private handleError(action: string, error: HttpErrorResponse) {
    const backendMessage = String(error?.error?.message || '').trim();
    if (backendMessage) return throwError(() => new Error(backendMessage));
    return throwError(() => new Error(`No fue posible ${action}.`));
  }

  getCostosJson(aps: number, anno: number, mes: number): Observable<InformeCostosResponse> {
    return this.http
      .get<ApiResponseEnvelope<InformeCostosResponse>>(`${this.baseUrl}/costos`, {
        headers: this.getHeaders(),
        params: { aps: String(aps), anno: String(anno), mes: String(mes) }
      })
      .pipe(
        map((resp) => resp.data),
        catchError((err) => this.handleError('consultar resumen de variables', err))
      );
  }
}
