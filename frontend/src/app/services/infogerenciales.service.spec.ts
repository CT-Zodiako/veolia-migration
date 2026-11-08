import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InfoGerencialService } from './infogerenciales.service';
import { environment } from '../../environments/environment';

describe('InfoGerencialService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    localStorage.setItem('jwtOken', 'tok');
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.removeItem('jwtOken');
  });

  // odd/tasks/verificacion-promedio-semestre.md S1: promedio semestre anterior for the selected APS/año/mes.
  it('getVariablesAps posts aps, anno and mes to infogerencial/getvariablesaps with the token', () => {
    const service = TestBed.inject(InfoGerencialService);
    const backend = TestBed.inject(HttpTestingController);
    let data: unknown;

    service.getVariablesAps(1011, 2026, 8).subscribe((res) => (data = res.data));

    const req = backend.expectOne(`${environment.apiBaseUrl}/api/v1/infogerencial/getvariablesaps`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ aps: 1011, anno: 2026, mes: 8 });
    expect(req.request.headers.get('x-access-token')).toBe('tok');
    req.flush({ status: 'success', data: { aps: 1011, anno: 2026, mes: 8, variables: { qrt: 1 } }, message: 'OK' });
    expect(data).toEqual({ aps: 1011, anno: 2026, mes: 8, variables: { qrt: 1 } });
  });

  // Preserve: the sibling verificación query keeps its route and body.
  it('infoemprdivi still posts aps, anno and mes to infogerencial/infoemprdivi', () => {
    const service = TestBed.inject(InfoGerencialService);
    const backend = TestBed.inject(HttpTestingController);

    service.infoemprdivi(5, 2025, 3).subscribe();

    const req = backend.expectOne(`${environment.apiBaseUrl}/api/v1/infogerencial/infoemprdivi`);
    expect(req.request.body).toEqual({ aps: 5, anno: 2025, mes: 3 });
    req.flush({ status: 'success', data: [], message: 'OK' });
  });
});
