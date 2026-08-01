import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { EXPECTED_ERROR_STATUSES } from '../../interceptors/http-context.tokens';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import {
  ApiEnvelope,
  AprobarReliquidacionResponse,
  EstadoReliquidacion,
  ResumenTarificadorDto
} from '../../models/reliquidacion.model';

/** El backend envuelve cada resumen en `{ resumen: ... }` (ver ResumenResponseDto.cs). */
export type ResumenTarificadorEnvelope = ApiEnvelope<{ resumen: ResumenTarificadorDto | null }>;

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

  resumenUsuarios(reliq: number): Observable<ResumenTarificadorEnvelope> {
    return this.http.post<ResumenTarificadorEnvelope>(`${this.baseUrl}/resumenUsuarios`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resumenEmpresa(reliq: number): Observable<ResumenTarificadorEnvelope> {
    return this.http.post<ResumenTarificadorEnvelope>(`${this.baseUrl}/resumenEmpresa`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resumenAdicional(reliq: number): Observable<ResumenTarificadorEnvelope> {
    return this.http.post<ResumenTarificadorEnvelope>(`${this.baseUrl}/resumenAdicional`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resumenRelleno(reliq: number): Observable<ResumenTarificadorEnvelope> {
    return this.http.post<ResumenTarificadorEnvelope>(`${this.baseUrl}/resumenRelleno`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resumenAps(reliq: number): Observable<ResumenTarificadorEnvelope> {
    return this.http.post<ResumenTarificadorEnvelope>(`${this.baseUrl}/resumenAPS`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  aprobarReliquidacion(reliq: number): Observable<ApiEnvelope<AprobarReliquidacionResponse>> {
    return this.http.post<ApiEnvelope<AprobarReliquidacionResponse>>(`${this.baseUrl}/aprobarReliquidacion`, { reliqId: reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  estadoReliquidacion(reliq: number): Observable<ApiEnvelope<EstadoReliquidacion>> {
    return this.http.post<ApiEnvelope<EstadoReliquidacion>>(`${this.baseUrl}/estadoReliquidacion`, { reliqId: reliq }, { headers: this.getHeaders(), context: new HttpContext().set(EXPECTED_ERROR_STATUSES, [404]) })
      .pipe(catchError((error) => this.handleError(error)));
  }
}
