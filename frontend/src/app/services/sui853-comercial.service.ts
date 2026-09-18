import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ComercialEnvelope, ComercialRequest, ComercialRow, ComercialSummary } from '../models/sui853-comercial.models';

@Injectable({ providedIn: 'root' })
export class Sui853ComercialService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/sui853/comercial`;
  constructor(private readonly http: HttpClient) {}

  detail(request: ComercialRequest) {
    return this.http.post<ComercialEnvelope<ComercialRow[]>>(`${this.baseUrl}/residuosGeneradosInforme`, request, { headers: this.headers() });
  }

  summary() {
    return this.http.post<ComercialEnvelope<ComercialSummary | null>>(`${this.baseUrl}/resumenResiduosGenerados`, {}, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': localStorage.getItem('jwtOken') || '' });
  }
}
