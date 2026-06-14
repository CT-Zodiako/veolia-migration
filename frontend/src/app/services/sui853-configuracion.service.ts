import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LegacyEnvelope<T> {
  status: number;
  data: T;
}

export interface VcfgApsEmpresaItem {
  TCFG_APS_ID: number;
  NOMAPS: string;
  NUAP: string;
  EMPRESA: string;
  CODSUI: string;
  DEPARTAMENTO: string;
  MUNICIPIO: string;
}

export interface VcfgApsDocumentoItem {
  NOMAPS: string;
  SEGMENTO: string;
  CODFORMATO: string;
  NOMFORMATO: string;
}

export interface TcfgApsItem {
  TCFG_APS_ID: number;
  NOMBRE_APS: string;
}

@Injectable({ providedIn: 'root' })
export class Sui853ConfiguracionService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/sui853Configuracion`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  vcfgApsEmpresa(): Observable<LegacyEnvelope<VcfgApsEmpresaItem[]>> {
    return this.http.post<LegacyEnvelope<VcfgApsEmpresaItem[]>>(`${this.baseUrl}/vcfgapsempresa`, {}, { headers: this.getHeaders() });
  }

  vcfgApsDocumento(): Observable<LegacyEnvelope<VcfgApsDocumentoItem[]>> {
    return this.http.post<LegacyEnvelope<VcfgApsDocumentoItem[]>>(`${this.baseUrl}/vcfgapsdocumento`, {}, { headers: this.getHeaders() });
  }

  tcfgAps(): Observable<LegacyEnvelope<TcfgApsItem[]>> {
    return this.http.post<LegacyEnvelope<TcfgApsItem[]>>(`${this.baseUrl}/tcfgAps`, {}, { headers: this.getHeaders() });
  }
}
