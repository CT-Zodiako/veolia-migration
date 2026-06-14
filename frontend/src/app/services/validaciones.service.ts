import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ValidacionRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface ValidacionResponse {
  ok: boolean;
  message: string | null;
}

@Injectable({ providedIn: 'root' })
export class ValidacionesService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/validaciones`;

  constructor(private readonly http: HttpClient) {}

  /** 1. Validar existencia de tarifa calculada */
  faucoExistarifa(req: ValidacionRequest): Observable<ValidacionResponse> {
    return this.http.post<ValidacionResponse>(`${this.baseUrl}/certificarfauco_existarifa`, req);
  }

  /** 2. Validar SUI vs Facturación (costo poda) */
  faucoCpsuivsfact(req: ValidacionRequest): Observable<ValidacionResponse> {
    return this.http.post<ValidacionResponse>(`${this.baseUrl}/certificarFauco_cpsuivsfact`, req);
  }

  /** 3. Validar productividad vs período anterior */
  faucoCpproductividad(req: ValidacionRequest): Observable<ValidacionResponse> {
    return this.http.post<ValidacionResponse>(`${this.baseUrl}/certificarFauco_cpproductividad`, req);
  }

  /** 4. Validar cambio costo poda en enero */
  faucoCpenero(req: ValidacionRequest): Observable<ValidacionResponse> {
    return this.http.post<ValidacionResponse>(`${this.baseUrl}/certificarFauco_cpenero`, req);
  }

  /** 5. Validar integración con sistema facturación */
  faucoIntegracion(req: ValidacionRequest): Observable<ValidacionResponse> {
    return this.http.post<ValidacionResponse>(`${this.baseUrl}/certificarFauco_integracion`, req);
  }

  /** 6. Validar existencia de relleno */
  faucoExisterelleno(req: ValidacionRequest): Observable<ValidacionResponse> {
    return this.http.post<ValidacionResponse>(`${this.baseUrl}/certificarfauco_existerelleno`, req);
  }

  /** 7. Validar existencia de tarifa certificada */
  faucoExistarifacert(req: ValidacionRequest): Observable<ValidacionResponse> {
    return this.http.post<ValidacionResponse>(`${this.baseUrl}/certificarfauco_existarifacert`, req);
  }
}
