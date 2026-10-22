import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { CostosService } from '../../services/costos.service';

// T1 (401): legacy costos routes take the user from the token (req.SISU_ID); the body never carries it.
describe('Cálculo de tarifas requests carry no usuario', () => {
  afterEach(() => localStorage.removeItem('usuario'));

  it.each([
    ['validapreactualiza', (s: CostosService): Observable<unknown> => s.validapreactualiza(5, 3, 2026)],
    ['calculartarifas', (s: CostosService): Observable<unknown> => s.calculartarifas(5, 3, 2026)],
    ['prechecks', (s: CostosService): Observable<unknown> => s.runPrechecks(5, 3, 2026)],
    ['certificarTarifas', (s: CostosService): Observable<unknown> => s.certificarTarifas(5, 3, 2026)]
  ])('%s sends only aps, mes and anno', (route, call) => {
    localStorage.setItem('usuario', JSON.stringify({ SISU_ID: 9 }));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);

    call(TestBed.inject(CostosService)).subscribe();

    const req = http.expectOne((r) => r.url.endsWith(`/api/v1/costos/${route}`));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ aps: 5, mes: 3, anno: 2026 });
    req.flush({ status: 'success', data: {}, message: '' });
    http.verify();
  });
});
