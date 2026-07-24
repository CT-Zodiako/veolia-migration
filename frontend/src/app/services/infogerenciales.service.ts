import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiEnvelope } from '../models/proyecciones.models';

@Injectable({ providedIn: 'root' })
export class InfoGerencialService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/infogerencial`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  private envelope<T>(obs: Observable<ApiEnvelope<T>>): Observable<ApiEnvelope<T>> {
    return obs;
  }

  detcostos(anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/detcostos`, { anno, mes }, { headers: this.getHeaders() }));
  }

  detsubaporte(anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/detsubaporte`, { anno, mes }, { headers: this.getHeaders() }));
  }

  infoapsemprdivi(aps: number, anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/infoapsemprdivi`, { aps, anno, mes }, { headers: this.getHeaders() }));
  }

  infoemprdivi(aps: number, anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/infoemprdivi`, { aps, anno, mes }, { headers: this.getHeaders() }));
  }

  infoapsrelleno(aps: number, anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/infoapsrelleno`, { aps, anno, mes }, { headers: this.getHeaders() }));
  }

  getDashBoardGerencial(anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/getDashBoardGerencial`, { anno, mes }, { headers: this.getHeaders() }));
  }

  costoPoda(aps: number): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/costoPoda`, { aps }, { headers: this.getHeaders() }));
  }

  getApsDesCost(aps: number, anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/getapsDesCost`, { aps, anno, mes }, { headers: this.getHeaders() }));
  }

  getApsDesCostUnico(id: number, aps: number, anno: number, mes: number, isNew: boolean): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/getapsDesCostUnico`, { id, aps, anno, mes, isNew }, { headers: this.getHeaders() }));
  }

  setApsDesCost(aps: number, anno: number, mes: number, id: number, valor: number): Observable<ApiEnvelope<unknown>> {
    return this.envelope(this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/setapsDesCost`, { aps, anno, mes, id, valor }, { headers: this.getHeaders() }));
  }

  uptApsDesCost(aps: number, anno: number, mes: number, id: number, valor: number): Observable<ApiEnvelope<unknown>> {
    return this.envelope(this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/uptapsDesCost`, { aps, anno, mes, id, valor }, { headers: this.getHeaders() }));
  }
}
