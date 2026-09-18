import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { FacEnvelope } from '../models/sui853-fac.models';

@Injectable({ providedIn: 'root' })
export class Sui853FacService {
  constructor(private readonly http: HttpClient) {}

  load() {
    return this.http.post<FacEnvelope>(`${environment.apiBaseUrl}/api/v1/sui853/general/fac`, {}, {
      headers: new HttpHeaders({ 'x-access-token': localStorage.getItem('jwtOken') || '' })
    });
  }
}
