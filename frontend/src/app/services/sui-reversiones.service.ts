import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type SuiReversionRow = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class SuiReversionesService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/sui`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  getReversionesF19(aps: number): Observable<SuiReversionRow[]> {
    return this.http.post<SuiReversionRow[]>(`${this.baseUrl}/reversionesF19`, { aps }, { headers: this.getHeaders() });
  }

  getReversionesF23(aps: number): Observable<SuiReversionRow[]> {
    return this.http.post<SuiReversionRow[]>(`${this.baseUrl}/reversionesF23`, { aps }, { headers: this.getHeaders() });
  }

  getReversionesF24(aps: number): Observable<SuiReversionRow[]> {
    return this.http.post<SuiReversionRow[]>(`${this.baseUrl}/reversionesF24`, { aps }, { headers: this.getHeaders() });
  }

  getReversionesF35(aps: number): Observable<SuiReversionRow[]> {
    return this.http.post<SuiReversionRow[]>(`${this.baseUrl}/reversionesF35`, { aps }, { headers: this.getHeaders() });
  }

  getReversionesF36(aps: number): Observable<SuiReversionRow[]> {
    return this.http.post<SuiReversionRow[]>(`${this.baseUrl}/reversionesF36`, { aps }, { headers: this.getHeaders() });
  }
}
