import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClaseUsoItem {
  CLAS_CLASE: number;
  CLAS_NOMBRE: string;
  CLAS_DESCRIPCION: string;
  CLAS_FECHACREACION: string;
  USUA_USUA: number;
}

export interface ParametroCostoItem {
  PARA_PARA: number;
  PARA_NOMBRE: string;
}

/**
 * Servicio de catálogos transversales. Migración del legacy GeneralService.js.
 * Nota: el catálogo de índices (paraindices, CLAS_CLAS = 20011) NO se expone
 * aquí -- es un duplicado del catálogo ya servido por IndicesCraService/
 * GET /api/v1/indices/catalogo. Usar ese servicio para índices CRA.
 */
@Injectable({ providedIn: 'root' })
export class GeneralService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/general`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  getParaClases(): Observable<ClaseUsoItem[]> {
    return this.http.get<ClaseUsoItem[]>(`${this.baseUrl}/consultauso`, { headers: this.getHeaders() });
  }

  getParaCostos(): Observable<ParametroCostoItem[]> {
    return this.http.get<ParametroCostoItem[]>(`${this.baseUrl}/paracostos`, { headers: this.getHeaders() });
  }
}
