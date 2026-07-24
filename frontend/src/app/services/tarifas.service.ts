import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type TarifaRow = Record<string, unknown>;

export interface TarifaChartPoint {
  label: string;
  value: number;
}

@Injectable({ providedIn: 'root' })
export class TarifasService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/tarifas`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  getTarifa(aps: number, anno: number, mes: number): Observable<TarifaRow[]> {
    return this.http.post<TarifaRow[]>(this.baseUrl, { aps, anno, mes }, { headers: this.getHeaders() });
  }

  getchartTarifas(aps: number, anno: number, mes: number): Observable<TarifaChartPoint[]> {
    return this.getTarifa(aps, anno, mes).pipe(map(rows => this.toChartRows(rows)));
  }

  consultaGeneral(aps: number, anno: number, mes: number): Observable<TarifaRow[]> {
    return this.http.post<TarifaRow[]>(`${this.baseUrl}/consultageneral`, { aps, anno, mes }, { headers: this.getHeaders() });
  }

  getTarxCos(aps: number, anno: number, mes: number): Observable<TarifaRow[]> {
    return this.http
      .post<TarifaRow[]>(`${this.baseUrl}/tarxcom`, { aps, anno, mes }, { headers: this.getHeaders() })
      .pipe(map(rows => rows.map(row => this.roundNumericFields(row))));
  }

  getTarxCosGeneral(anno: number, mes: number): Observable<TarifaRow[]> {
    return this.http.post<TarifaRow[]>(`${this.baseUrl}/tarxcomgeneral`, { anno, mes }, { headers: this.getHeaders() });
  }

  private roundNumericFields(row: TarifaRow): TarifaRow {
    const output: TarifaRow = {};

    for (const [key, value] of Object.entries(row)) {
      output[key] = typeof value === 'number' && Number.isFinite(value) ? value.toFixed(6) : value;
    }

    return output;
  }

  private toChartRows(rows: TarifaRow[]): TarifaChartPoint[] {
    return rows.map((row, index) => {
      const entries = Object.entries(row);
      const label = this.findLabel(entries, index);
      const value = this.findNumericValue(entries);
      return { label, value };
    });
  }

  private findLabel(entries: Array<[string, unknown]>, index: number): string {
    const stringEntry = entries.find(([, value]) => typeof value === 'string' && value.trim().length > 0);
    if (stringEntry) {
      return String(stringEntry[1]);
    }

    const firstEntry = entries[0];
    if (!firstEntry) {
      return `Fila ${index + 1}`;
    }

    return `${firstEntry[0]}: ${String(firstEntry[1] ?? '')}`;
  }

  private findNumericValue(entries: Array<[string, unknown]>): number {
    const numberEntry = entries.find(([, value]) => typeof value === 'number' && Number.isFinite(value));
    return numberEntry ? Number(numberEntry[1]) : 0;
  }
}
