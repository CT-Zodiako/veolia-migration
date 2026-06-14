import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, filter, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponseEnvelope,
  ArchivoCargaResponse,
  CargueActual,
  ConfirmacionResponse,
  CrearCargueRequest,
  EjecucionEstado,
  EjecucionInicio,
  ErrorCargue,
  Municipio,
  PagedResult,
  ParseoResponse,
  Periodo,
  PlantillaResponse,
  Prestador,
  ResultadoCertificacion,
  ReversionResponse,
  ResumenCargue,
  TipoCargue,
  ValidacionEstado,
  ValidacionInicio
} from '../models/fase1-certificacion.models';

@Injectable({ providedIn: 'root' })
export class Fase1CertificacionService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/suministros/certificacion`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(isJson = true): HttpHeaders {
    const token = localStorage.getItem('jwtOken') || '';
    return isJson
      ? new HttpHeaders({ 'Content-Type': 'application/json', 'x-access-token': token })
      : new HttpHeaders({ 'x-access-token': token });
  }

  private unwrap<T>(action: string) {
    return (source: Observable<ApiResponseEnvelope<T>>) =>
      source.pipe(
        map((resp) => resp.data),
        catchError(this.handleError(action))
      );
  }

  private handleError(action: string) {
    return (error: HttpErrorResponse) => {
      const backendMessage = error?.error?.message || error?.error?.data;
      const message =
        backendMessage ||
        (error.status === 0 ? `No se pudo conectar al servidor para ${action}.` : `No fue posible ${action}. Intentalo nuevamente.`);
      return throwError(() => new Error(message));
    };
  }

  getPeriodos(vigencia?: number): Observable<Periodo[]> {
    const params = vigencia ? new HttpParams().set('vigencia', vigencia) : undefined;
    return this.unwrap<Periodo[]>('consultar periodos')(
      this.http.get<ApiResponseEnvelope<Periodo[]>>(`${this.baseUrl}/periodos`, { headers: this.getHeaders(), params })
    );
  }

  getMunicipios(departamentoId: number): Observable<Municipio[]> {
    const params = new HttpParams().set('departamentoId', departamentoId);
    return this.unwrap<Municipio[]>('consultar municipios')(
      this.http.get<ApiResponseEnvelope<Municipio[]>>(`${this.baseUrl}/municipios`, { headers: this.getHeaders(), params })
    );
  }

  getPrestadores(municipioId: number): Observable<Prestador[]> {
    const params = new HttpParams().set('municipioId', municipioId);
    return this.unwrap<Prestador[]>('consultar prestadores')(
      this.http.get<ApiResponseEnvelope<Prestador[]>>(`${this.baseUrl}/prestadores`, { headers: this.getHeaders(), params })
    );
  }

  getTiposCargue(): Observable<TipoCargue[]> {
    return this.unwrap<TipoCargue[]>('consultar tipos de cargue')(
      this.http.get<ApiResponseEnvelope<TipoCargue[]>>(`${this.baseUrl}/tipos-cargue`, { headers: this.getHeaders() })
    );
  }

  crearCargue(request: CrearCargueRequest): Observable<CargueActual> {
    return this.unwrap<CargueActual>('crear cargue')(
      this.http.post<ApiResponseEnvelope<CargueActual>>(`${this.baseUrl}/cargues`, request, { headers: this.getHeaders() })
    );
  }

  subirArchivo(cargueId: number, file: File): Observable<{ progress: number; data?: ArchivoCargaResponse }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiResponseEnvelope<ArchivoCargaResponse>>(`${this.baseUrl}/cargues/${cargueId}/archivo`, formData, {
        headers: this.getHeaders(false),
        observe: 'events',
        reportProgress: true
      })
      .pipe(
        filter((event: HttpEvent<ApiResponseEnvelope<ArchivoCargaResponse>>) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
        map((event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total ?? 1;
            return { progress: Math.round((event.loaded * 100) / total) };
          }
          return { progress: 100, data: event.body?.data };
        }),
        catchError(this.handleError('subir archivo'))
      );
  }

  parsearArchivo(cargueId: number, separador = ',', hoja = ''): Observable<ParseoResponse> {
    return this.unwrap<ParseoResponse>('parsear archivo')(
      this.http.post<ApiResponseEnvelope<ParseoResponse>>(`${this.baseUrl}/cargues/${cargueId}/parsear`, { separador, hoja }, { headers: this.getHeaders() })
    );
  }

  getResumen(cargueId: number): Observable<ResumenCargue> {
    return this.unwrap<ResumenCargue>('consultar resumen')(
      this.http.get<ApiResponseEnvelope<ResumenCargue>>(`${this.baseUrl}/cargues/${cargueId}/resumen`, { headers: this.getHeaders() })
    );
  }

  getErrores(cargueId: number, page = 1, size = 20): Observable<PagedResult<ErrorCargue>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.unwrap<PagedResult<ErrorCargue>>('consultar errores de cargue')(
      this.http.get<ApiResponseEnvelope<PagedResult<ErrorCargue>>>(`${this.baseUrl}/cargues/${cargueId}/errores`, {
        headers: this.getHeaders(),
        params
      })
    );
  }

  confirmarCargue(cargueId: number, usuario: string): Observable<ConfirmacionResponse> {
    return this.unwrap<ConfirmacionResponse>('confirmar cargue')(
      this.http.post<ApiResponseEnvelope<ConfirmacionResponse>>(`${this.baseUrl}/cargues/${cargueId}/confirmar`, { usuario }, { headers: this.getHeaders() })
    );
  }

  ejecutarValidaciones(cargueId: number, reglas: string[] = []): Observable<ValidacionInicio> {
    return this.unwrap<ValidacionInicio>('ejecutar validaciones')(
      this.http.post<ApiResponseEnvelope<ValidacionInicio>>(`${this.baseUrl}/validaciones/ejecutar`, { cargueId, reglas }, { headers: this.getHeaders() })
    );
  }

  getValidacion(validacionId: number): Observable<ValidacionEstado> {
    return this.unwrap<ValidacionEstado>('consultar validación')(
      this.http.get<ApiResponseEnvelope<ValidacionEstado>>(`${this.baseUrl}/validaciones/${validacionId}`, { headers: this.getHeaders() })
    );
  }

  ejecutarCertificacion(cargueId: number, usuario: string, forzar = false): Observable<EjecucionInicio> {
    return this.unwrap<EjecucionInicio>('ejecutar certificación')(
      this.http.post<ApiResponseEnvelope<EjecucionInicio>>(`${this.baseUrl}/ejecuciones`, { cargueId, usuario, forzar }, { headers: this.getHeaders() })
    );
  }

  getEjecucion(ejecucionId: number): Observable<EjecucionEstado> {
    return this.unwrap<EjecucionEstado>('consultar ejecución')(
      this.http.get<ApiResponseEnvelope<EjecucionEstado>>(`${this.baseUrl}/ejecuciones/${ejecucionId}`, { headers: this.getHeaders() })
    );
  }

  getResultados(cargueId: number): Observable<ResultadoCertificacion> {
    return this.unwrap<ResultadoCertificacion>('consultar resultados')(
      this.http.get<ApiResponseEnvelope<ResultadoCertificacion>>(`${this.baseUrl}/resultados/${cargueId}`, { headers: this.getHeaders() })
    );
  }

  revertirCargue(cargueId: number, motivo: string, usuario: string): Observable<ReversionResponse> {
    return this.unwrap<ReversionResponse>('revertir cargue')(
      this.http.post<ApiResponseEnvelope<ReversionResponse>>(
        `${this.baseUrl}/cargues/${cargueId}/revertir`,
        { motivo, usuario },
        { headers: this.getHeaders() }
      )
    );
  }

  getPlantilla(tipoCargueId: number): Observable<PlantillaResponse> {
    const params = new HttpParams().set('tipoCargueId', tipoCargueId);
    return this.unwrap<PlantillaResponse>('descargar plantilla')(
      this.http.get<ApiResponseEnvelope<PlantillaResponse>>(`${this.baseUrl}/plantilla`, { headers: this.getHeaders(), params })
    );
  }
}
