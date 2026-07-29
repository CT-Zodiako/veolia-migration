import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TafnaEnvelope, TafnaRequest, TafnaResponse } from '../models/tafna.models';

@Injectable({ providedIn: 'root' })
export class TafnaService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/tafna`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  getTafna(aps: number, anno: number, mes: number): Observable<TafnaResponse[]> {
    const payload: TafnaRequest = { aps, anno, mes };
    return this.http
      .post<TafnaEnvelope<TafnaResponse[]>>(`${this.baseUrl}/tafna`, payload, { headers: this.getHeaders() })
      .pipe(map((resp) => resp.data ?? []));
  }
}
