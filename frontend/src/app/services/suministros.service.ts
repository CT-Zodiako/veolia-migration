import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SetReversionRequest {
  aps: number;
  anno: number;
  mes: number;
  motivo: string;
}

export interface ReversionResponse {
  ok: boolean;
  message?: string | null;
  reversionId?: number | null;
}

export interface ReversionHistoryItem {
  id: number;
  aps: number;
  anno: number;
  mes: number;
  motivo: string;
  fecha: string;
  usuario: string;
  nombreAps: string;
}

export interface PodaItem {
  EMPR_NOMBRE: string;
  CPTE_VALORSUI: number;
  CPTE_VALORFACT: number;
  CPTE_TIPINGRESO: number;
  EMPR_EMPR: number;
}

export interface PodaEmpresa {
  EMPR_EMPR: number;
  EMPR_NOMBRE: string;
}

export interface DataEnvelope<T> {
  data: T;
}

export interface ProductividadCargueRow {
  [key: string]: unknown;
  'COD APS': number;
  APS: string;
  'COD EMPRESA': number;
  EMPRESA: string;
  ANNO: number;
  MES: number;
  CCS: number | null;
  CBLS: number | null;
  CLUS: number | null;
  CRT: number | null;
  CDF: number | null;
  CTL: number | null;
}

export interface ProductividadCargueGuardarItem {
  COD_APS: number;
  APS: string;
  COD_EMPRESA: number;
  EMPRESA: string;
  ANNO: number;
  MES: number;
  CCS: number | null;
  CBLS: number | null;
  CLUS: number | null;
  CRT: number | null;
  CDF: number | null;
  CTL: number | null;
}

@Injectable({ providedIn: 'root' })
export class SuministrosService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/suministros`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  setReversion(payload: SetReversionRequest): Observable<ReversionResponse> {
    return this.http.post<ReversionResponse>(`${this.baseUrl}/setReversion`, payload, { headers: this.getHeaders() });
  }

  getReversion(): Observable<ReversionHistoryItem[]> {
    return this.http.get<ReversionHistoryItem[]>(`${this.baseUrl}/getReversion`, { headers: this.getHeaders() });
  }

  cenrtificarEditar(aps: number, anno: number, mes: number): Observable<DataEnvelope<string | null>> {
    return this.http.post<DataEnvelope<string | null>>(`${this.baseUrl}/cenrtificarEditar`, { aps, anno, mes }, { headers: this.getHeaders() });
  }

  getPoda(aps: number, anno: number, mes: number): Observable<DataEnvelope<PodaItem[]>> {
    return this.http.post<DataEnvelope<PodaItem[]>>(`${this.baseUrl}/getPoda`, { aps, anno, mes }, { headers: this.getHeaders() });
  }

  consultaCostoPoda(aps: number): Observable<DataEnvelope<PodaEmpresa[]>> {
    return this.http.post<DataEnvelope<PodaEmpresa[]>>(`${this.baseUrl}/consultaCostoPoda`, { aps }, { headers: this.getHeaders() });
  }

  newCostoPoda(datos: { EMPR_EMPR: number; EMPR_NOMBRE: string; valor: number }[], aps: number, anno: number, mes: number): Observable<DataEnvelope<string>> {
    return this.http.post<DataEnvelope<string>>(`${this.baseUrl}/newCostoPoda`, { datos, aps, anno, mes }, { headers: this.getHeaders() });
  }

  registrarPoda(emprEmpr: number, valorSui: number, aps: number, anno: number, mes: number): Observable<DataEnvelope<string>> {
    return this.http.post<DataEnvelope<string>>(
      `${this.baseUrl}/registrarPoda`,
      { EMPR_EMPR: emprEmpr, CPTE_VALORSUI: valorSui, apsa_id: aps, cpte_anno: anno, cpte_mes: mes },
      { headers: this.getHeaders() }
    );
  }

  cargueProductividad(anno: number, mes: number): Observable<DataEnvelope<{ propios: ProductividadCargueRow[]; terceros: ProductividadCargueRow[] }>> {
    return this.http.post<DataEnvelope<{ propios: ProductividadCargueRow[]; terceros: ProductividadCargueRow[] }>>(
      `${this.baseUrl}/cargueProductividad`,
      { anno, mes },
      { headers: this.getHeaders() }
    );
  }

  guardarProductividad(dataPropios: ProductividadCargueGuardarItem[], dataTerceros: ProductividadCargueGuardarItem[]): Observable<DataEnvelope<string>> {
    return this.http.post<DataEnvelope<string>>(
      `${this.baseUrl}/guardarProductividad`,
      { dataPropios, dataTerceros },
      { headers: this.getHeaders() }
    );
  }
}
