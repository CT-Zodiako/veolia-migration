import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DetalleResponse, QaResponse, QrtResponse, ToneladasEnvelope, ToneladasRequest } from '../models/toneladas.models';

@Injectable({ providedIn: 'root' })
export class ToneladasService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/toneladas`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  private payload(aps: number, anno: number, mes: number): ToneladasRequest {
    return { aps, anno, mes };
  }

  getQrt(aps: number, anno: number, mes: number): Observable<QrtResponse[]> {
    return this.http
      .post<ToneladasEnvelope<QrtResponse[]>>(`${this.baseUrl}/qrt`, this.payload(aps, anno, mes), { headers: this.getHeaders() })
      .pipe(map((resp) => resp.data ?? []));
  }

  getQa(aps: number, anno: number, mes: number): Observable<QaResponse[]> {
    return this.http
      .post<ToneladasEnvelope<QaResponse[]>>(`${this.baseUrl}/qa`, this.payload(aps, anno, mes), { headers: this.getHeaders() })
      .pipe(map((resp) => resp.data ?? []));
  }

  getDetalle(aps: number, anno: number, mes: number): Observable<DetalleResponse[]> {
    return this.http
      .post<ToneladasEnvelope<DetalleResponse[]>>(`${this.baseUrl}/detalle`, this.payload(aps, anno, mes), { headers: this.getHeaders() })
      .pipe(map((resp) => resp.data ?? []));
  }
}
