import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, of, throwError } from 'rxjs';
import { Sui853FacComponent } from './sui853-fac.component';
import { Sui853FacService } from '../../services/sui853-fac.service';
import { Sui853Formato2TablaComponent } from '../shared/sui853-formato2-tabla.component';
import { LayoutComponent } from '../layout/layout.component';

// F853GR01 as rendered by SUI.f_render_formato2 plus meta.dialogHeader (legacy General/controller.js:7-56).
const FAC = {
  title: 'FAC',
  meta: { dialogHeader: 'F853GR01 | FAC | Facturación general', other: true },
  SIN_MOVIMIENTO: { tableTitle: 'SIN_MOVIMIENTO', tableColor: 'aliceblue', headers: [{ field: 'NOMAPS', header: 'APS', formato: 'texto', decimal: null, alineacion: 'izq', backgroundColor: 'G', filter: true, mouse_over: '' }] },
  CON_MOVIMIENTO: null,
  data: [{ NOMAPS: 'APS Norte' }, { NOMAPS: 'APS Sur' }]
};

function setup(response: Observable<unknown>) {
  const service = { load: vi.fn(() => response) };
  TestBed.configureTestingModule({
    imports: [Sui853FacComponent],
    providers: [{ provide: Sui853FacService, useValue: service }]
  });
  const fixture = TestBed.createComponent(Sui853FacComponent);
  fixture.detectChanges();
  const tabla = () => fixture.debugElement.query(By.directive(Sui853Formato2TablaComponent))?.componentInstance as Sui853Formato2TablaComponent | undefined;
  return { fixture, service, tabla, element: fixture.nativeElement as HTMLElement };
}

describe('Sui853FacComponent (40001, legacy sui853/views/General/fac.vue)', () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver; PrimeNG tabs observe their size.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  // fac.vue:4-11 — a single <TabPanel header="General"> (SEG 2/3 commented out) fed by svc.cfa() in mounted() (fac.vue:66-70).
  it('loads FAC once and shows it in the single legacy "General" tab', () => {
    const { service, tabla, element } = setup(of({ status: 'success', data: FAC, message: '' }));

    expect(service.load).toHaveBeenCalledTimes(1);
    expect(Array.from(element.querySelectorAll('p-tab')).map(tab => tab.textContent?.trim())).toEqual(['General']);
    expect(tabla()?.loading).toBe(false);
    expect(tabla()?.data?.data).toEqual(FAC.data);
    expect(tabla()?.data?.['SIN_MOVIMIENTO']).toEqual(FAC.SIN_MOVIMIENTO);
  });

  // general.js:26-29 — the table header is meta.dialogHeader ("CODIGO | NOMBRE | DESCRIPCION"), "" when missing;
  // the rendered meta is kept (General/controller.js:47-50 spreads the existing meta).
  it('titles the table with meta.dialogHeader and keeps the rendered metadata', () => {
    const { tabla } = setup(of({ status: 'success', data: FAC, message: '' }));

    expect(tabla()?.data?.title).toBe('F853GR01 | FAC | Facturación general');
    expect(tabla()?.data?.meta).toEqual(FAC.meta);
  });

  // general.js:12-23 — POST sui853General/fac with an empty body and the x-access-token header.
  it('posts {} with the session token to the FAC endpoint', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    localStorage.setItem('jwtOken', 'token-123');
    const http = TestBed.inject(HttpTestingController);

    TestBed.inject(Sui853FacService).load().subscribe();

    const request = http.expectOne(r => r.url.endsWith('/api/v1/sui853/general/fac'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(request.request.headers.get('x-access-token')).toBe('token-123');
    request.flush({ status: 'success', data: FAC, message: '' });
    http.verify();
    localStorage.removeItem('jwtOken');
  });

  // Approved: the legacy <h1>FAC</h1> (fac.vue:3) is the layout top-bar title (parity-review-all L20).
  it('shows the legacy FAC title in the top bar', () => {
    expect(LayoutComponent.prototype.getPageTitle.call({ router: { url: '/fac' } } as unknown as LayoutComponent)).toBe('SUI 853 - FAC');
  });

  // fac.vue:73-86 + general.js:30-33 — a failed call is logged and the tab renders the empty config (no message).
  it('renders the empty table in the "General" tab without a message when the FAC call fails', () => {
    const { tabla, element } = setup(throwError(() => new Error('500')));

    expect(tabla()).toBeDefined();
    expect(element.textContent).not.toContain('No se pudo cargar la información de FAC.');
  });
});
