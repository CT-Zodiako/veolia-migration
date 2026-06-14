import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiEnvelope,
  ApsOption,
  CrecimientoPayload,
  LineaTiempoRow,
  LineaTiempoUpsert,
  MutationResponse,
  Proyeccion,
  ProyeccionCreate,
  ProyeccionUpdate,
  SubcontConsulta,
  SubcontItem,
  SubcontUpsert
} from '../models/proyecciones.models';

@Injectable({ providedIn: 'root' })
export class ProyeccionesService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/proyecciones`;

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

  consulta(apsaId: number): Observable<ApiEnvelope<Proyeccion[]>> {
    return this.envelope(this.http.post<ApiEnvelope<Proyeccion[]>>(`${this.baseUrl}/consulta`, { apsaId }, { headers: this.getHeaders() }));
  }

  consultaGeneral(): Observable<ApiEnvelope<Proyeccion[]>> {
    return this.envelope(this.http.post<ApiEnvelope<Proyeccion[]>>(`${this.baseUrl}/consultageneral`, {}, { headers: this.getHeaders() }));
  }

  consultaProy(id: number): Observable<ApiEnvelope<Proyeccion>> {
    return this.envelope(this.http.post<ApiEnvelope<Proyeccion>>(`${this.baseUrl}/consultaproy`, { id }, { headers: this.getHeaders() }));
  }

  crear(data: ProyeccionCreate): Observable<ApiEnvelope<MutationResponse>> {
    return this.envelope(this.http.post<ApiEnvelope<MutationResponse>>(`${this.baseUrl}/crear`, data, { headers: this.getHeaders() }));
  }

  editar(id: number, data: ProyeccionUpdate): Observable<ApiEnvelope<MutationResponse>> {
    return this.envelope(this.http.put<ApiEnvelope<MutationResponse>>(`${this.baseUrl}/editar/${id}`, data, { headers: this.getHeaders() }));
  }

  eliminar(id: number): Observable<ApiEnvelope<MutationResponse>> {
    return this.envelope(this.http.delete<ApiEnvelope<MutationResponse>>(`${this.baseUrl}/eliminar/${id}`, { headers: this.getHeaders() }));
  }

  ultimasTarifas(apsaId: number): Observable<ApiEnvelope<any[]>> {
    return this.envelope(this.http.post<ApiEnvelope<any[]>>(`${this.baseUrl}/ultimastarifas`, { apsaId }, { headers: this.getHeaders() }));
  }

  registrarLineaTiempo(data: LineaTiempoUpsert): Observable<ApiEnvelope<MutationResponse>> {
    return this.envelope(this.http.post<ApiEnvelope<MutationResponse>>(`${this.baseUrl}/registrarlineatiempo`, data, { headers: this.getHeaders() }));
  }

  consultarCrecimiento(apsaId: number, proyId: number): Observable<ApiEnvelope<CrecimientoPayload>> {
    return this.envelope(this.http.post<ApiEnvelope<CrecimientoPayload>>(`${this.baseUrl}/consultarcrecimiento`, { apsaId, proyId }, { headers: this.getHeaders() }));
  }

  registrarCrecimientoUsuarios(data: any): Observable<ApiEnvelope<MutationResponse>> {
    return this.envelope(this.http.post<ApiEnvelope<MutationResponse>>(`${this.baseUrl}/registrarcrecimientousuarios`, data, { headers: this.getHeaders() }));
  }

  registrarCrecimientoInfPropia(data: any): Observable<ApiEnvelope<MutationResponse>> {
    return this.envelope(this.http.post<ApiEnvelope<MutationResponse>>(`${this.baseUrl}/registrarcrecimientoinfpropia`, data, { headers: this.getHeaders() }));
  }

  registrarCrecimientoInfTerceros(data: any): Observable<ApiEnvelope<MutationResponse>> {
    return this.envelope(this.http.post<ApiEnvelope<MutationResponse>>(`${this.baseUrl}/registrarcrecimientoinfterceros`, data, { headers: this.getHeaders() }));
  }

  registrarDescuento(data: any): Observable<ApiEnvelope<MutationResponse>> {
    return this.envelope(this.http.post<ApiEnvelope<MutationResponse>>(`${this.baseUrl}/registrardescuento`, data, { headers: this.getHeaders() }));
  }

  consultaSubcont(data: SubcontConsulta): Observable<ApiEnvelope<SubcontItem[]>> {
    return this.envelope(this.http.post<ApiEnvelope<SubcontItem[]>>(`${this.baseUrl}/consultasubcont`, data, { headers: this.getHeaders() }));
  }

  editarPorcSubCon(data: SubcontUpsert): Observable<ApiEnvelope<MutationResponse>> {
    return this.envelope(this.http.post<ApiEnvelope<MutationResponse>>(`${this.baseUrl}/editarPorcSubCon`, data, { headers: this.getHeaders() }));
  }

  ejecutarProyectar(apsaId: number, proyId: number): Observable<ApiEnvelope<{ success: boolean; resultado: string }>> {
    return this.envelope(this.http.post<ApiEnvelope<{ success: boolean; resultado: string }>>(`${this.baseUrl}/ejecutarproyectar`, { apsaId, proyId }, { headers: this.getHeaders() }));
  }

  listarAps(): Observable<ApsOption[]> {
    return this.http.get<ApsOption[]>(`${environment.apiBaseUrl}/api/v1/aps`, { headers: this.getHeaders() });
  }

  lineaTiempoByProyId(id: number): Observable<ApiEnvelope<LineaTiempoRow[]>> {
    return this.envelope(this.http.post<ApiEnvelope<LineaTiempoRow[]>>(`${this.baseUrl}/consultabyid`, { id }, { headers: this.getHeaders() }));
  }
}
