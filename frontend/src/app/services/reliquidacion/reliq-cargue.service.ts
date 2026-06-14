import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import {
  ApiEnvelope,
  CompararCostos,
  CompararTarifas,
  ReliInfoAdicional,
  ReliInfoAps,
  ReliInfoEmpresa,
  ReliInfoRelleno,
  ReliInfoUsuarios
} from '../../models/reliquidacion.model';

@Injectable({ providedIn: 'root' })
export class ReliqCargueService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/reliqCargue`;

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

  compararCostos(reliq: number): Observable<ApiEnvelope<CompararCostos[]>> {
    return this.http.post<ApiEnvelope<CompararCostos[]>>(`${this.baseUrl}/compararCostos`, { reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  compararTarifas(reliq: number): Observable<ApiEnvelope<CompararTarifas[]>> {
    return this.http.post<ApiEnvelope<CompararTarifas[]>>(`${this.baseUrl}/compararTarifas`, { reliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resumenCompararTarifas(reliq: number, aps: number, anno: number, mes: number): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/resumenCompararTarifas`, { reliq, apsaId: aps, anno, mes }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  getReliInfoUsuarios(idReliq: number): Observable<ApiEnvelope<ReliInfoUsuarios[]>> {
    return this.http.post<ApiEnvelope<ReliInfoUsuarios[]>>(`${this.baseUrl}/getReliInfoUsuarios`, { idReliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  getResumenEmpresa(idReliq: number): Observable<ApiEnvelope<ReliInfoEmpresa[]>> {
    return this.http.post<ApiEnvelope<ReliInfoEmpresa[]>>(`${this.baseUrl}/getResumenEmpresa`, { idReliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  getResumenAps(idReliq: number): Observable<ApiEnvelope<ReliInfoAps[]>> {
    return this.http.post<ApiEnvelope<ReliInfoAps[]>>(`${this.baseUrl}/getResumenAPS`, { idReliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  getResumenRelleno(idReliq: number): Observable<ApiEnvelope<ReliInfoRelleno[]>> {
    return this.http.post<ApiEnvelope<ReliInfoRelleno[]>>(`${this.baseUrl}/getResumenRelleno`, { idReliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  getReliInfoAdicional(idReliq: number): Observable<ApiEnvelope<ReliInfoAdicional[]>> {
    return this.http.post<ApiEnvelope<ReliInfoAdicional[]>>(`${this.baseUrl}/getReliInfoAdicional`, { idReliq }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  updateReliInfoUsuarios(data: ReliInfoUsuarios[]): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/updateReliInfoUsuarios`, { data }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  updateResumenEmpresa(data: ReliInfoEmpresa[]): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/updateResumenEmpresa`, { data }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  updateResumenAps(data: ReliInfoAps[]): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/updateResumenAPS`, { data }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  updateResumenRelleno(data: ReliInfoRelleno[]): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/updateResumenRellno`, { data }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  updateResumenAdicional(data: ReliInfoAdicional[]): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/updateResumenAdicional`, { data }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }
}
