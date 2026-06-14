import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmpresaItem {
  EMPR_EMPR: number;
  EMPR_NOMBRE: string;
  EMPR_ESTADO: number;
  EMPR_PROPIA: number;
  EMPR_NUAP?: string | null;
}

export interface EmpresaMutationPayload {
  nombre: string;
  estado: number;
  propia: number;
  nuap: string | null;
}

@Injectable({ providedIn: 'root' })
export class EmpresasService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/empresas`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  getEmpresas(): Observable<EmpresaItem[]> {
    return this.http.get<EmpresaItem[]>(this.baseUrl, { headers: this.getHeaders() });
  }

  newEmpr(payload: EmpresaMutationPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/crear`, payload, { headers: this.getHeaders() });
  }

  getEmpresasPropias(aps: number, propia: number): Observable<EmpresaItem[]> {
    return this.http.post<EmpresaItem[]>(`${this.baseUrl}/consultarpropias`, { aps, propia }, { headers: this.getHeaders() });
  }

  getEmprbyId(empr: number): Observable<EmpresaItem[]> {
    return this.http.post<EmpresaItem[]>(`${this.baseUrl}/consultaempr`, { empr }, { headers: this.getHeaders() });
  }

  updtEmpr(id: number, payload: EmpresaMutationPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/editar/${id}`, payload, { headers: this.getHeaders() });
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/eliminar/${id}`, { headers: this.getHeaders() });
  }

  toggleEstado(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/toggle-estado/${id}`, {}, { headers: this.getHeaders() });
  }
}
