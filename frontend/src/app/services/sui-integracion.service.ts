import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponseEnvelope,
  SuiComplementoRequest,
  SuiComplementoResponse,
  SuiConsultaRequest,
  SuiExistenArchivosResponse,
  SuiFormatoResponse,
  SuiPrecheckResponse,
  SuiProcesarRequest,
  SuiProcesarResponse
} from '../models/sui-integracion.models';

@Injectable({ providedIn: 'root' })
export class SuiIntegracionService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/sui`;

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

  consuformu19(payload: SuiConsultaRequest): Observable<SuiFormatoResponse> {
    return this.unwrap<SuiFormatoResponse>('consultar F19')(
      this.http.post<ApiResponseEnvelope<SuiFormatoResponse>>(`${this.baseUrl}/consuformu19`, payload, { headers: this.getHeaders() })
    );
  }
  consuformu23(payload: SuiConsultaRequest): Observable<SuiFormatoResponse> {
    return this.unwrap<SuiFormatoResponse>('consultar F23')(
      this.http.post<ApiResponseEnvelope<SuiFormatoResponse>>(`${this.baseUrl}/consuformu23`, payload, { headers: this.getHeaders() })
    );
  }
  consuforma24(payload: SuiConsultaRequest): Observable<SuiFormatoResponse> {
    return this.unwrap<SuiFormatoResponse>('consultar F24')(
      this.http.post<ApiResponseEnvelope<SuiFormatoResponse>>(`${this.baseUrl}/consuforma24`, payload, { headers: this.getHeaders() })
    );
  }
  consuforma35(payload: SuiConsultaRequest): Observable<SuiFormatoResponse> {
    return this.unwrap<SuiFormatoResponse>('consultar F35')(
      this.http.post<ApiResponseEnvelope<SuiFormatoResponse>>(`${this.baseUrl}/consuforma35`, payload, { headers: this.getHeaders() })
    );
  }
  consuforma36(payload: SuiConsultaRequest): Observable<SuiFormatoResponse> {
    return this.unwrap<SuiFormatoResponse>('consultar F36')(
      this.http.post<ApiResponseEnvelope<SuiFormatoResponse>>(`${this.baseUrl}/consuforma36`, payload, { headers: this.getHeaders() })
    );
  }
  getcanCertificate(payload: SuiConsultaRequest): Observable<SuiPrecheckResponse> {
    return this.unwrap<SuiPrecheckResponse>('prevalidar SUI')(
      this.http.post<ApiResponseEnvelope<SuiPrecheckResponse>>(`${this.baseUrl}/getcanCertificate`, payload, { headers: this.getHeaders() })
    );
  }
  procesar(payload: SuiProcesarRequest): Observable<SuiProcesarResponse> {
    return this.unwrap<SuiProcesarResponse>('procesar SUI')(
      this.http.post<ApiResponseEnvelope<SuiProcesarResponse>>(`${this.baseUrl}/Procesar`, payload, { headers: this.getHeaders() })
    );
  }
  setCargueInfComplemento(payload: SuiComplementoRequest): Observable<SuiComplementoResponse> {
    return this.unwrap<SuiComplementoResponse>('guardar complemento')(
      this.http.post<ApiResponseEnvelope<SuiComplementoResponse>>(`${this.baseUrl}/setCargueInfComplemento`, payload, { headers: this.getHeaders() })
    );
  }
  existenArchivosGenerados(payload: SuiConsultaRequest): Observable<SuiExistenArchivosResponse> {
    return this.unwrap<SuiExistenArchivosResponse>('verificar archivos generados')(
      this.http.post<ApiResponseEnvelope<SuiExistenArchivosResponse>>(`${this.baseUrl}/existenArchivosGenerados`, payload, { headers: this.getHeaders() })
    );
  }
}
