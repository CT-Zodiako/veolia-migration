import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsuarioPromedioResponse, UsuariosGraficoEnvelope, UsuariosGraficoRequest } from '../models/usuarios-grafico.models';

@Injectable({ providedIn: 'root' })
export class UsuariosGraficoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/usuarios`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token
    });
  }

  getUsuagraf(aps: number, anno: number, mes: number): Observable<UsuarioPromedioResponse[]> {
    const payload: UsuariosGraficoRequest = { aps, anno, mes };
    return this.http
      .post<UsuariosGraficoEnvelope<UsuarioPromedioResponse[]>>(`${this.baseUrl}/usuagraf`, payload, { headers: this.getHeaders() })
      .pipe(map((resp) => resp.data ?? []));
  }
}
