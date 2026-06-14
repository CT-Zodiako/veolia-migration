import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponseEnvelope,
  CalculartarifasResponse,
  CertificarTarifasResponse,
  ComportaClusItem,
  CostoClusItem,
  CostoItem,
  CostosRequest,
  RunPrechecksResponse,
  ValidapreactualizaResponse
} from '../models/costos.models';

@Injectable({ providedIn: 'root' })
export class CostosService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/costos`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  private unwrap<T>(action: string) {
    return (source: Observable<ApiResponseEnvelope<T>>) =>
      source.pipe(
        map((resp) => resp.data),
        catchError(this.handleError(action))
      );
  }

  private handleError(action: string) {
    return (error: HttpErrorResponse) => {
      const backendMessage = String(error?.error?.message || error?.error?.data || '').trim();
      const oraCode = String(error?.error?.oraCode || '').toUpperCase();
      const normalized = backendMessage.toLowerCase();

      let message: string;
      if (error.status === 0 || oraCode === 'ORA-03135') {
        message = `Error de conexión con Oracle al ${action}. Verificá conectividad e intentá nuevamente.`;
      } else if (error.status === 409 && normalized.includes('certific')) {
        message = 'El período ya se encuentra certificado.';
      } else if (error.status === 409 && normalized.includes('calcul')) {
        message = 'El período ya se encuentra calculado para APS/mes/año.';
      } else if (error.status === 412 || normalized.includes('precheck') || normalized.includes('validación previa')) {
        message = 'Precondición no cumplida: ejecutá verificación y prechecks antes de continuar.';
      } else if (backendMessage) {
        message = backendMessage;
      } else {
        message = `No fue posible ${action}. Intentalo nuevamente.`;
      }

      return throwError(() => new Error(message));
    };
  }

  validapreactualiza(aps: number, mes: number, anno: number, usuario: number): Observable<ValidapreactualizaResponse> {
    const payload: CostosRequest = { aps, mes, anno, usuario };
    return this.unwrap<ValidapreactualizaResponse>('validar preactualización')(
      this.http.post<ApiResponseEnvelope<ValidapreactualizaResponse>>(`${this.baseUrl}/validapreactualiza`, payload, {
        headers: this.getHeaders()
      })
    );
  }

  calculartarifas(aps: number, mes: number, anno: number, usuario: number): Observable<CalculartarifasResponse> {
    const payload: CostosRequest = { aps, mes, anno, usuario };
    return this.unwrap<CalculartarifasResponse>('calcular tarifas')(
      this.http.post<ApiResponseEnvelope<CalculartarifasResponse>>(`${this.baseUrl}/calculartarifas`, payload, {
        headers: this.getHeaders()
      })
    );
  }

  runPrechecks(aps: number, mes: number, anno: number, usuario: number): Observable<RunPrechecksResponse> {
    const payload: CostosRequest = { aps, mes, anno, usuario };
    return this.unwrap<RunPrechecksResponse>('ejecutar prechecks')(
      this.http.post<ApiResponseEnvelope<RunPrechecksResponse>>(`${this.baseUrl}/prechecks`, payload, {
        headers: this.getHeaders()
      })
    );
  }

  certificarTarifas(aps: number, mes: number, anno: number, usuario: number): Observable<CertificarTarifasResponse> {
    const payload: CostosRequest = { aps, mes, anno, usuario };
    return this.unwrap<CertificarTarifasResponse>('certificar tarifas')(
      this.http.post<ApiResponseEnvelope<CertificarTarifasResponse>>(`${this.baseUrl}/certificarTarifas`, payload, {
        headers: this.getHeaders()
      })
    );
  }

  consultarCostos(aps: number, mes: number, anno: number): Observable<CostoItem[]> {
    const payload = { aps, mes, anno };
    return this.unwrap<CostoItem[]>('consultar costos')(
      this.http.post<ApiResponseEnvelope<CostoItem[]>>(`${this.baseUrl}/consultar`, payload, {
        headers: this.getHeaders()
      })
    );
  }

  consultarCostosClus(aps: number, mes: number, anno: number): Observable<CostoClusItem[]> {
    const payload = { aps, mes, anno };
    return this.unwrap<CostoClusItem[]>('consultar costos por clúster')(
      this.http.post<ApiResponseEnvelope<CostoClusItem[]>>(`${this.baseUrl}/cosclus`, payload, {
        headers: this.getHeaders()
      })
    );
  }

  consultarComportaClus(aps: number, mes: number, anno: number): Observable<ComportaClusItem[]> {
    const payload = { aps, mes, anno };
    return this.unwrap<ComportaClusItem[]>('consultar comportamiento clúster')(
      this.http.post<ApiResponseEnvelope<ComportaClusItem[]>>(`${this.baseUrl}/comportaclus`, payload, {
        headers: this.getHeaders()
      })
    );
  }
}
