import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiEnvelope, CdftRow, Formato2Response } from '../models/sui853-cft.model';

// Los 12 (+15) endpoints de Formato2 no reciben body — el código de formato
// SUI está hardcodeado en el backend (ver Sui853CftController.cs). Ver
// doc migracion/modules/sui853/CFT.md para el contrato real por pantalla.
// cdft usa un controller/base url distinta (api/v1/sui853/cdft) y sí recibe
// body ({ anno }), por eso se agrega su propio helper `postCdft()` en vez de
// forzarlo por `post()` (que asume la base fija de `cft` y siempre manda `{}`).
@Injectable({ providedIn: 'root' })
export class Sui853CftService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/sui853/cft`;
  private readonly baseUrlCdft = `${environment.apiBaseUrl}/api/v1/sui853/cdft`;

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtOken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token || ''
    });
  }

  private post(path: string): Observable<ApiEnvelope<Formato2Response>> {
    return this.http.post<ApiEnvelope<Formato2Response>>(`${this.baseUrl}/${path}`, {}, { headers: this.getHeaders() });
  }

  // cft.vue — /cft (SEG1) — F853S105
  getCft(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cft');
  }

  // cft.vue — /cft (SEG2) — F853S209
  getCftSeg2(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cft-seg2');
  }

  // cft.vue — /cft (SEG3) — F853S306
  getCftSeg3(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cft-seg3');
  }

  // cssAprovechamientoC.vue — /cssaprovechamiento (SEG1) — F853001
  getCssAprovechamiento(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('css-aprovechamiento');
  }

  // cssAprovechamientoC.vue — /cssaprovechamiento (SEG2) — F853S201
  getCssAprovechamientoSeg2(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('css-aprovechamiento-seg2');
  }

  // cssAprovechamientoC.vue — /cssaprovechamiento (SEG3) — F853S301
  getCssAprovechamientoSeg3(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('css-aprovechamiento-seg3');
  }

  // crlus.vue — /crlus — F853002
  getCrlus(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crlus');
  }

  // cbls.vue — /cbls — F853003
  getCbls(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cbls');
  }

  // cblusMinimo.vue — /cblusMinimo — F853S202
  getCblusMinimo(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cblus-minimo');
  }

  // cblusMaximo.vue — /cblusMaximo — F853S203
  getCblusMaximo(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cblus-maximo');
  }

  // cblus.vue — /cblus — F853S204
  getCblus(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cblus');
  }

  // cbicsmaxmin.vue — /cbicsmaxmin (SEG3) — F853S208
  getCbicsMaxmin(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cbics-maxmin');
  }

  // crtsMinimo.vue — /crtsMinimo (SEG1/SEG2/SEG3)
  getCrtsMinimo(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crts-minimo');
  }

  getCrtsMinimoSeg2(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crts-minimo-seg2');
  }

  getCrtsMinimoSeg3(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crts-minimo-seg3');
  }

  // crtsMaximo.vue — /crtsMaximo (SEG1/SEG2/SEG3)
  getCrtsMaximo(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crts-maximo');
  }

  getCrtsMaximoSeg2(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crts-maximo-seg2');
  }

  getCrtsMaximoSeg3(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crts-maximo-seg3');
  }

  // crt.vue — /crt (SEG1/SEG2/SEG3)
  getCrt(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crt');
  }

  getCrtSeg2(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crt-seg2');
  }

  getCrtSeg3(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('crt-seg3');
  }

  // cvna.vue — /cvna (SEG1/SEG2/SEG3)
  getCvna(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cvna');
  }

  getCvnaSeg2(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cvna-seg2');
  }

  getCvnaSeg3(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cvna-seg3');
  }

  // cva.vue — /cva (SEG1/SEG2/SEG3)
  getCva(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cva');
  }

  getCvaSeg2(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cva-seg2');
  }

  getCvaSeg3(): Observable<ApiEnvelope<Formato2Response>> {
    return this.post('cva-seg3');
  }

  // cdft.vue — /cdft — base url distinta (api/v1/sui853/cdft), recibe { anno }.
  getCdft(anno: number): Observable<ApiEnvelope<CdftRow[]>> {
    return this.http.post<ApiEnvelope<CdftRow[]>>(`${this.baseUrlCdft}/cdft`, { anno }, { headers: this.getHeaders() });
  }
}
