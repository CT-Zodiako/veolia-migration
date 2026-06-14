import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubContConsultaRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface SubContValorItem {
  id: number;
  val: number;
}

export interface SubContCrearRequest {
  aps: number;
  anno: number;
  mes: number;
  valores: SubContValorItem[];
}

export interface SubContEditarRequest {
  aps: number;
  anno: number;
  mes: number;
  valores: SubContValorItem[];
}

export interface SubContItem {
  sucoId: number;
  apsaId: number;
  emprEmpr: number;
  diviDivi: number;
  clasClase: number;
  sucoAnno: number;
  sucoMes: number;
  paraTippred20016: number;
  sucoValor: number;
  sucoEstado: number;
  sucoFechacreacion: string;
  usuaUsua: number;
}

export interface SubContAps {
  apsaId: number;
  apsaNombre: string;
}

export interface SubContResponse {
  success: boolean;
  message: string | null;
}

@Injectable({ providedIn: 'root' })
export class SubContService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/subcon`;

  constructor(private readonly http: HttpClient) {}

  consultar(req: SubContConsultaRequest): Observable<SubContItem[]> {
    return this.http.post<SubContItem[]>(`${this.baseUrl}/consulta`, req);
  }

  crear(req: SubContCrearRequest): Observable<SubContResponse> {
    return this.http.post<SubContResponse>(`${this.baseUrl}/crear`, req);
  }

  editar(req: SubContEditarRequest): Observable<SubContResponse> {
    return this.http.put<SubContResponse>(`${this.baseUrl}/editar`, req);
  }

  listarAps(): Observable<SubContAps[]> {
    return this.http.get<SubContAps[]>(this.baseUrl);
  }

  eliminar(id: number): Observable<SubContResponse> {
    return this.http.delete<SubContResponse>(`${this.baseUrl}/eliminar/${id}`);
  }
}
