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

export interface FormularioRow {
  FORMATO: string;
  SECCION: string;
  FIELD: string;
  HEADER_TXT: string;
  BACKGROUND_COLOR: string;
  FILTER_FLAG: string;
  FORMATO_DATO: string;
  DECIMALES: number | null;
  ALINEACION: string;
  TOOLTIP: string | null;
  MOSTRAR_HEADER: string;
  INCLUIR_DATA: string;
  ORDEN_HEADER: number | null;
  ORDEN_DATA: number | null;
}

export interface DriveSheet {
  sheetId: number;
  title: string;
  index: number;
  rowCount: number;
  columnCount: number;
}

export interface CargaDriveRequest {
  sheetId: string;
  sheetTitle: string;
  owner: 'SUI';
  tableName: string;
  previewOnly: boolean;
  selectedColumns?: string[];
}

export interface CargaDrivePreview {
  driveHeaders: string[];
  tableColumns: { COLUMN_NAME: string; DATA_TYPE: string; COLUMN_ID: number }[];
  commonColumns: string[];
}

export interface CargaDriveResult {
  insertResult: { inserted: number };
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

  tablasSui(): Observable<LegacyEnvelope<string[]>> {
    return this.http.post<LegacyEnvelope<string[]>>(`${this.baseUrl}/tablasSui`, {}, { headers: this.getHeaders() });
  }

  listarHojasDrive(sheetId: string): Observable<LegacyEnvelope<{ sheets: DriveSheet[] }>> {
    return this.http.post<LegacyEnvelope<{ sheets: DriveSheet[] }>>(`${this.baseUrl}/listarHojasDrive`, { sheetId }, { headers: this.getHeaders() });
  }

  cargaDriveDinamica(request: CargaDriveRequest & { previewOnly: true }): Observable<LegacyEnvelope<CargaDrivePreview>>;
  cargaDriveDinamica(request: CargaDriveRequest & { previewOnly: false }): Observable<LegacyEnvelope<CargaDriveResult>>;
  cargaDriveDinamica(request: CargaDriveRequest): Observable<LegacyEnvelope<CargaDrivePreview | CargaDriveResult>> {
    return this.http.post<LegacyEnvelope<CargaDrivePreview | CargaDriveResult>>(`${this.baseUrl}/cargaDriveDinamica`, { ...request, owner: 'SUI' }, { headers: this.getHeaders() });
  }

  truncateTable(tableName: string): Observable<LegacyEnvelope<unknown>> {
    return this.http.post<LegacyEnvelope<unknown>>(`${this.baseUrl}/truncateTable`, { owner: 'SUI', tableName, confirm: true }, { headers: this.getHeaders() });
  }

  getFormularios(): Observable<LegacyEnvelope<FormularioRow[]>> {
    return this.http.post<LegacyEnvelope<FormularioRow[]>>(`${this.baseUrl}/getFormularios`, {}, { headers: this.getHeaders() });
  }

  updateFormulario(row: FormularioRow): Observable<LegacyEnvelope<FormularioRow>> {
    return this.http.post<LegacyEnvelope<FormularioRow>>(`${this.baseUrl}/updateFormulario`, row, { headers: this.getHeaders() });
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
