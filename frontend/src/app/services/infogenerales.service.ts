import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiEnvelope } from '../models/proyecciones.models';

@Injectable({ providedIn: 'root' })
export class InfoGeneralesService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/infogenerales`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  consultaEnergia(apsaId: number, proyId: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/consultaenergia`, { apsaId, proyId }, { headers: this.getHeaders() });
  }

  consultaAcueducto(apsaId: number, proyId: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/consultaacueducto`, { apsaId, proyId }, { headers: this.getHeaders() });
  }

  consultaCostos(apsaId: number, proyId: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/consultacostos`, { apsaId, proyId }, { headers: this.getHeaders() });
  }

  consultaTarifas(apsaId: number, proyId: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/consultatarifas`, { apsaId, proyId }, { headers: this.getHeaders() });
  }

  consultaHistorialCertificaciones(anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/consultaHistorialCertificaciones`, { anno, mes }, { headers: this.getHeaders() });
  }

  consultaHistorialProductividad(anno: number, mes: number): Observable<ApiEnvelope<any[]>> {
    return this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/consultaHistorialProductividad`, { anno, mes }, { headers: this.getHeaders() });
  }
}
