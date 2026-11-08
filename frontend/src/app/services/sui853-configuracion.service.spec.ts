import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Sui853ConfiguracionService } from './sui853-configuracion.service';
import { KEEP_ERROR_BODY } from '../interceptors/http-context.tokens';

describe('Sui853ConfiguracionService Drive loads', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    return { service: TestBed.inject(Sui853ConfiguracionService), backend: TestBed.inject(HttpTestingController) };
  }

  // The Drive load screens read the row detail (file, sheet, row) from the error body.
  it.each([
    ['cargueResiduos', (s: Sui853ConfiguracionService) => s.cargueResiduos(7, 2024)],
    ['cargueFacturacion', (s: Sui853ConfiguracionService) => s.cargueFacturacion(7, 2024, 'Marzo')]
  ] as const)('%s asks the error interceptor to keep the error body', (ruta, call) => {
    const { service, backend } = setup();
    call(service).subscribe();
    const req = backend.expectOne((r) => r.url.endsWith(`/${ruta}`));
    expect(req.request.context.get(KEEP_ERROR_BODY)).toBe(true);
  });

  it('leaves other requests with the default error handling', () => {
    const { service, backend } = setup();
    service.tcfgAps().subscribe();
    const req = backend.expectOne((r) => r.url.endsWith('/tcfgAps'));
    expect(req.request.context.get(KEEP_ERROR_BODY)).toBe(false);
  });
});
