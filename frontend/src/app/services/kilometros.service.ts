import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { KilometrosEnvelope, KilometrosRequest, LblResponse } from '../models/kilometros.models';

@Injectable({ providedIn: 'root' })
export class KilometrosService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/kilometros`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  private payload(aps: number, anno: number, mes: number): KilometrosRequest {
    return { aps, anno, mes };
  }

  getLbl(aps: number, anno: number, mes: number): Observable<LblResponse[]> {
    return this.http
      .post<KilometrosEnvelope<LblResponse[]>>(`${this.baseUrl}/lbl`, this.payload(aps, anno, mes), { headers: this.getHeaders() })
      .pipe(map((resp) => resp.data ?? []));
  }
}
