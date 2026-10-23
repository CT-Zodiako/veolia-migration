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
  LblItem,
  QaItem,
  QrtItem,
  RunPrechecksResponse,
  ValidapreactualizaResponse
} from '../models/costos.models';

// Legacy costos routes take the user from the token (req.SISU_ID); the body never carries it.
type CostosPeriodoRequest = { aps: number; mes: number; anno: number };

@Injectable({ providedIn: 'root' })
export class CostosService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/costos`;
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1`;

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

  validapreactualiza(aps: number, mes: number, anno: number): Observable<ValidapreactualizaResponse> {
    const payload: CostosPeriodoRequest = { aps, mes, anno };
    return this.unwrap<ValidapreactualizaResponse>('validar preactualización')(
      this.http.post<ApiResponseEnvelope<ValidapreactualizaResponse>>(`${this.baseUrl}/validapreactualiza`, payload, {
        headers: this.getHeaders()
      })
    );
  }

  calculartarifas(aps: number, mes: number, anno: number): Observable<CalculartarifasResponse> {
    const payload: CostosPeriodoRequest = { aps, mes, anno };
    return this.unwrap<CalculartarifasResponse>('calcular tarifas')(
      this.http.post<ApiResponseEnvelope<CalculartarifasResponse>>(`${this.baseUrl}/calculartarifas`, payload, {
        headers: this.getHeaders()
      })
    );
  }

  runPrechecks(aps: number, mes: number, anno: number): Observable<RunPrechecksResponse> {
    const payload: CostosPeriodoRequest = { aps, mes, anno };
    return this.unwrap<RunPrechecksResponse>('ejecutar prechecks')(
      this.http.post<ApiResponseEnvelope<RunPrechecksResponse>>(`${this.baseUrl}/prechecks`, payload, {
        headers: this.getHeaders()
      })
    );
  }

  certificarTarifas(aps: number, mes: number, anno: number): Observable<CertificarTarifasResponse> {
    const payload: CostosPeriodoRequest = { aps, mes, anno };
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

  // Legacy CostoService.getQrt/getQa (toneladas/qrt, toneladas/qa) and KilometrosService.getConsultalbl (kilometros/lbl).
  consultarQrt(aps: number, anno: number, mes: number): Observable<QrtItem[]> {
    return this.unwrap<QrtItem[]>('consultar QRT')(
      this.http.post<ApiResponseEnvelope<QrtItem[]>>(`${this.apiUrl}/toneladas/qrt`, { aps, anno, mes }, { headers: this.getHeaders() })
    );
  }

  consultarQa(aps: number, anno: number, mes: number): Observable<QaItem[]> {
    return this.unwrap<QaItem[]>('consultar Qa')(
      this.http.post<ApiResponseEnvelope<QaItem[]>>(`${this.apiUrl}/toneladas/qa`, { aps, anno, mes }, { headers: this.getHeaders() })
    );
  }

  consultarLbl(aps: number, anno: number, mes: number): Observable<LblItem[]> {
    return this.unwrap<LblItem[]>('consultar LBL')(
      this.http.post<ApiResponseEnvelope<LblItem[]>>(`${this.apiUrl}/kilometros/lbl`, { aps, anno, mes }, { headers: this.getHeaders() })
    );
  }
}
