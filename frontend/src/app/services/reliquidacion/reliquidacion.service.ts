import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import {
  ActualizarReliquidacionRequest,
  ApiEnvelope,
  CrearReliquidacionRequest,
  Reliquidacion
} from '../../models/reliquidacion.model';

@Injectable({ providedIn: 'root' })
export class ReliquidacionService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/reliqCrear`;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.state.token() || localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  private handleError(error: unknown): Observable<never> {
    return throwError(() => error);
  }

  getReliquidaciones(apsaId?: number): Observable<ApiEnvelope<Reliquidacion[]>> {
    const payload = apsaId && apsaId > 0 ? { apsaId } : {};
    return this.http
      .post<ApiEnvelope<Reliquidacion[]>>(`${this.baseUrl}/getReliquidaciones`, payload, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  crearReliquidacion(data: CrearReliquidacionRequest): Observable<ApiEnvelope<unknown>> {
    return this.http
      .post<ApiEnvelope<unknown>>(`${this.baseUrl}/crear`, data, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  editarReliquidacion(data: ActualizarReliquidacionRequest): Observable<ApiEnvelope<unknown>> {
    return this.http
      .post<ApiEnvelope<unknown>>(`${this.baseUrl}/update`, data, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  eliminarReliquidacion(relqid: number): Observable<ApiEnvelope<unknown>> {
    return this.http
      .post<ApiEnvelope<unknown>>(`${this.baseUrl}/delete`, { relqid }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  getReliquidacionByAps(apsaid: number): Observable<ApiEnvelope<Reliquidacion[]>> {
    return this.http
      .post<ApiEnvelope<Reliquidacion[]>>(`${this.baseUrl}/getReliquidacionByAps`, { apsaid }, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }
}
