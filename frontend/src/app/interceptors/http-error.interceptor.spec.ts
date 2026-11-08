import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { httpErrorInterceptor } from './http-error.interceptor';
import { NotificationService } from '../services/notification.service';
import { SupportErrorLogService } from '../services/support-error-log.service';

describe('httpErrorInterceptor', () => {
  const detail = {
    operacion: 'PK_LIQUIDAR.fauco_calculartarifas',
    oraCode: 'ORA-00001',
    constraint: 'VEOLIA.PK_AUCO_TARIFAS',
    oracleMessage: 'ORA-00001: unique constraint (VEOLIA.PK_AUCO_TARIFAS) violated'
  };

  function setup(esSoporte: boolean) {
    localStorage.setItem('usuario', JSON.stringify({ esSoporte }));
    const notification = { error: vi.fn(), success: vi.fn(), warn: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notification }
      ]
    });
    return {
      http: TestBed.inject(HttpClient),
      backend: TestBed.inject(HttpTestingController),
      notification,
      supportLog: TestBed.inject(SupportErrorLogService)
    };
  }

  afterEach(() => localStorage.removeItem('usuario'));

  function fail(status: number, body: object, esSoporte = false) {
    const ctx = setup(esSoporte);
    ctx.http.post('/api/v1/costos/calculartarifas', {}).subscribe({ error: () => undefined });
    ctx.backend.expectOne('/api/v1/costos/calculartarifas').flush(body, { status, statusText: 'x' });
    return ctx;
  }

  it('appends the support code (traceId) to server error toasts', () => {
    const { notification } = fail(500, { status: 'error', message: 'Oracle rechazó datos duplicados.', traceId: '0HN8:00000002' });

    expect(notification.error).toHaveBeenCalledWith('Oracle rechazó datos duplicados. Código de soporte: 0HN8:00000002');
  });

  it('keeps the toast unchanged when the server sent no traceId', () => {
    const { notification } = fail(500, { status: 'error', message: 'Oracle rechazó datos duplicados.' });

    expect(notification.error).toHaveBeenCalledWith('Oracle rechazó datos duplicados.');
  });

  it('keeps business (4xx) toasts unchanged even with a traceId', () => {
    const { notification } = fail(409, { status: 'error', message: 'El período ya se encuentra certificado.', traceId: '0HN8:00000003' });

    expect(notification.error).toHaveBeenCalledWith('El período ya se encuentra certificado.');
  });

  it('stores traceId and the Oracle detail in the support log for support users', () => {
    const { supportLog } = fail(
      500,
      { status: 'error', message: 'Oracle rechazó datos duplicados.', traceId: '0HN8:00000002', oraCode: 'ORA-00001', detail },
      true
    );

    expect(supportLog.logs()).toHaveLength(1);
    expect(supportLog.logs()[0]).toMatchObject({
      method: 'POST',
      url: '/api/v1/costos/calculartarifas',
      status: 500,
      message: 'Oracle rechazó datos duplicados.',
      oraCode: 'ORA-00001',
      traceId: '0HN8:00000002',
      detalle: detail,
      origen: 'db'
    });
  });

  it('does not store anything in the support log for regular users', () => {
    const { supportLog } = fail(500, { status: 'error', message: 'x', traceId: '0HN8:00000002', detail });

    expect(supportLog.logs()).toHaveLength(0);
  });
});
