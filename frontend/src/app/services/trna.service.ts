import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TrnaEnvelope, TrnaRequest, TrnaResponse } from '../models/trna.models';

@Injectable({ providedIn: 'root' })
export class TrnaService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/trna`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  getTrna(aps: number, anno: number, mes: number): Observable<TrnaResponse[]> {
    const payload: TrnaRequest = { aps, anno, mes };
    return this.http
      .post<TrnaEnvelope<TrnaResponse[]>>(`${this.baseUrl}/trna`, payload, { headers: this.getHeaders() })
      .pipe(map((resp) => resp.data ?? []));
  }
}
