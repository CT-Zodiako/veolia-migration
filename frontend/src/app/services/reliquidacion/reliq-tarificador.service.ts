import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import { ApiEnvelope } from '../../models/reliquidacion.model';

@Injectable({ providedIn: 'root' })
export class ReliqTarificadorService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/reliqTarificador`;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.state.token() || localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({ 'Content-Type': 'application/json', 'x-access-token': token });
  }

  private handleError(error: unknown): Observable<never> {
    return throwError(() => error);
  }

  resumenUsuarios(reliq: number): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/resumenUsuarios`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resumenEmpresa(reliq: number): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/resumenEmpresa`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resumenAdicional(reliq: number): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/resumenAdicional`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resumenRelleno(reliq: number): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/resumenRelleno`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resumenAps(reliq: number): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/resumenAPS`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  aprobarReliquidacion(reliq: number): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/aprobarReliquidacion`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  estadoReliquidacion(reliq: number): Observable<ApiEnvelope<{ ok: boolean; estado: string; puedeAprobar: boolean }>> {
    return this.http.post<ApiEnvelope<{ ok: boolean; estado: string; puedeAprobar: boolean }>>(`${this.baseUrl}/estadoReliquidacion`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }
}
