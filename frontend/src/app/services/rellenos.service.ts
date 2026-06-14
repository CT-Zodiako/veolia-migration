import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CrearRellenoRequest, EditarRellenoRequest, RellenoItem, RellenoRequest } from '../models/rellenos.models';

@Injectable({ providedIn: 'root' })
export class RellenosService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/rellenos`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  getRellenos(): Observable<RellenoItem[]> {
    return this.http.get<RellenoItem[]>(this.baseUrl, { headers: this.getHeaders() });
  }

  consultarRelleno(request: RellenoRequest): Observable<RellenoItem[]> {
    return this.http.post<RellenoItem[]>(`${this.baseUrl}/consultarrelleno`, request, { headers: this.getHeaders() });
  }

  crearRelleno(payload: CrearRellenoRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/crear`, payload, { headers: this.getHeaders() });
  }

  editarRelleno(id: number, payload: EditarRellenoRequest): Observable<any> {
    return this.http.put(`${this.baseUrl}/editar/${id}`, payload, { headers: this.getHeaders() });
  }

  eliminarRelleno(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/eliminar/${id}`, { headers: this.getHeaders() });
  }
}
