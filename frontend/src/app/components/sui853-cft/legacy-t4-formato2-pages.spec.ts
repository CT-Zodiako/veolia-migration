import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, Subject, of } from 'rxjs';
import { Sui853CftService } from '../../services/sui853-cft.service';
import { Sui853Formato2TablaComponent } from '../shared/sui853-formato2-tabla.component';
import { LayoutComponent } from '../layout/layout.component';
import { CbicsMaxminPageComponent } from './cbics-maxmin-page.component';
import { CblsPageComponent } from './cbls-page.component';
import { CblusMaximoPageComponent } from './cblus-maximo-page.component';
import { CblusMinimoPageComponent } from './cblus-minimo-page.component';
import { CblusPageComponent } from './cblus-page.component';
import { CftPageComponent } from './cft-page.component';
import { CrlusPageComponent } from './crlus-page.component';
import { CrtPageComponent } from './crt-page.component';
import { CrtsMaximoPageComponent } from './crts-maximo-page.component';
import { CrtsMinimoPageComponent } from './crts-minimo-page.component';
import { CssAprovechamientoPageComponent } from './css-aprovechamiento-page.component';
import { CvaPageComponent } from './cva-page.component';
import { CvnaPageComponent } from './cvna-page.component';

interface LegacyPage {
  view: string;
  page: Type<unknown>;
  route: string;
  legacyTitle: string;
  // [tab label, service method feeding that tab] in tab order.
  tabs: [string, string][];
}

// Legacy front-tarificador/src/sui853/views/{CFT,CVNA,CVA}/*.vue: <h1> text, the <TabPanel> rendered and the
// service call whose result feeds each panel (:config="segN" ← svc.xxx() in mounted()). The new service methods
// post to the route whose format code is pinned by backend Sui853CftContractTests (legacy CFT/CVNA/CVA routes.js).
const PAGES: LegacyPage[] = [
  // cft.vue:3-29,69-71 — cft (F853S105), cftSEG2 (F853S209), cftSEG3 (F853S306)
  { view: 'cft.vue', page: CftPageComponent, route: '/cft', legacyTitle: 'CFT',
    tabs: [['SEG 1', 'getCft'], ['SEG 2', 'getCftSeg2'], ['SEG 3', 'getCftSeg3']] },
  // cssAprovechamientoC.vue:3-30,70-72 — cssAprovechamiento (F853001), SEG2 (F853S201), SEG3 (F853S301)
  { view: 'cssAprovechamientoC.vue', page: CssAprovechamientoPageComponent, route: '/cssaprovechamiento', legacyTitle: 'Estimación CSS',
    tabs: [['SEG 1', 'getCssAprovechamiento'], ['SEG 2', 'getCssAprovechamientoSeg2'], ['SEG 3', 'getCssAprovechamientoSeg3']] },
  // crlus.vue:3-11,53 — only SEG 1 is rendered, fed by crlus (F853002)
  { view: 'crlus.vue', page: CrlusPageComponent, route: '/crlus', legacyTitle: 'CRLUS', tabs: [['SEG 1', 'getCrlus']] },
  // cbls.vue:3-11,53 — <h1>CFT</h1>; only SEG 1, fed by cbls (F853003)
  { view: 'cbls.vue', page: CblsPageComponent, route: '/cbls', legacyTitle: 'CFT', tabs: [['SEG 1', 'getCbls']] },
  // cblusMinimo.vue:3-15,56 — only SEG 2, fed by cblusMinimoSEG2 (F853S202)
  { view: 'cblusMinimo.vue', page: CblusMinimoPageComponent, route: '/cblusMinimo', legacyTitle: 'CBLUS MINIMO', tabs: [['SEG 2', 'getCblusMinimo']] },
  // cblusMaximo.vue:3-15,56 — only SEG 2, fed by cblusMaximoSEG2 (F853S203)
  { view: 'cblusMaximo.vue', page: CblusMaximoPageComponent, route: '/cblusMaximo', legacyTitle: 'CBLUS MAXIMO', tabs: [['SEG 2', 'getCblusMaximo']] },
  // cblus.vue:3-15,56 — only SEG 2, fed by cblusSEG2 (F853S204)
  { view: 'cblus.vue', page: CblusPageComponent, route: '/cblus', legacyTitle: 'CBLUS', tabs: [['SEG 2', 'getCblus']] },
  // cbicsmaxmin.vue:3-23,65 — SEG 2 commented out; SEG 3 fed by cbicsmaxminSEG3 (F853S208)
  { view: 'cbicsmaxmin.vue', page: CbicsMaxminPageComponent, route: '/cbicsmaxmin', legacyTitle: 'CBICS MINIMO Y MAXIMO', tabs: [['SEG 3', 'getCbicsMaxmin']] },
  // crtsMinimo.vue:3-29,69-71 — crtsMinimo (F853S102), SEG2 (F853S205), SEG3 (F853S302)
  { view: 'crtsMinimo.vue', page: CrtsMinimoPageComponent, route: '/crtsMinimo', legacyTitle: 'CRTs Mínimo',
    tabs: [['SEG 1', 'getCrtsMinimo'], ['SEG 2', 'getCrtsMinimoSeg2'], ['SEG 3', 'getCrtsMinimoSeg3']] },
  // crtsMaximo.vue:3-29,69-71 — crtsMaximo (F853S103), SEG2 (F853S206), SEG3 (F853S303)
  { view: 'crtsMaximo.vue', page: CrtsMaximoPageComponent, route: '/crtsMaximo', legacyTitle: 'CRTs Máximo',
    tabs: [['SEG 1', 'getCrtsMaximo'], ['SEG 2', 'getCrtsMaximoSeg2'], ['SEG 3', 'getCrtsMaximoSeg3']] },
  // crt.vue:3-27,69-71 — crt (F853S106), crtSEG2 (F853S211), crtSEG3 (F853S307)
  { view: 'crt.vue', page: CrtPageComponent, route: '/crt', legacyTitle: 'CRT',
    tabs: [['SEG 1', 'getCrt'], ['SEG 2', 'getCrtSeg2'], ['SEG 3', 'getCrtSeg3']] },
  // cvna.vue:3-27,69-71 — cvna (F853S107), cvnaSEG2 (F853S210), cvnaSEG3 (F853S305)
  { view: 'cvna.vue', page: CvnaPageComponent, route: '/cvna', legacyTitle: 'CVNA',
    tabs: [['SEG 1', 'getCvna'], ['SEG 2', 'getCvnaSeg2'], ['SEG 3', 'getCvnaSeg3']] },
  // cva.vue:3-29,69-71 — cva (F853S104), cvaSEG2 (F853S207), cvaSEG3 (F853S304)
  { view: 'cva.vue', page: CvaPageComponent, route: '/cva', legacyTitle: 'CVA',
    tabs: [['SEG 1', 'getCva'], ['SEG 2', 'getCvaSeg2'], ['SEG 3', 'getCvaSeg3']] }
];

// The pages whose top-bar title text differs from the legacy <h1> (see PARITY-FINDING below).
const TITLE_FINDINGS = ['cbls.vue', 'cblusMinimo.vue', 'cblusMaximo.vue', 'cbicsmaxmin.vue'];

// Legacy front-tarificador/src/sui853/services/{ccsAprovechamientoService,cvnaService,cvaService}.js post {} to
// sui853CFT|sui853CVNA|sui853CVA/<route>; the new service posts {} to api/v1/sui853/cft/<route> (same format code).
const SERVICE_ROUTES: [string, string][] = [
  ['getCft', 'cft'], ['getCftSeg2', 'cft-seg2'], ['getCftSeg3', 'cft-seg3'],
  ['getCssAprovechamiento', 'css-aprovechamiento'], ['getCssAprovechamientoSeg2', 'css-aprovechamiento-seg2'],
  ['getCssAprovechamientoSeg3', 'css-aprovechamiento-seg3'], ['getCrlus', 'crlus'], ['getCbls', 'cbls'],
  ['getCblusMinimo', 'cblus-minimo'], ['getCblusMaximo', 'cblus-maximo'], ['getCblus', 'cblus'], ['getCbicsMaxmin', 'cbics-maxmin'],
  ['getCrtsMinimo', 'crts-minimo'], ['getCrtsMinimoSeg2', 'crts-minimo-seg2'], ['getCrtsMinimoSeg3', 'crts-minimo-seg3'],
  ['getCrtsMaximo', 'crts-maximo'], ['getCrtsMaximoSeg2', 'crts-maximo-seg2'], ['getCrtsMaximoSeg3', 'crts-maximo-seg3'],
  ['getCrt', 'crt'], ['getCrtSeg2', 'crt-seg2'], ['getCrtSeg3', 'crt-seg3'],
  ['getCvna', 'cvna'], ['getCvnaSeg2', 'cvna-seg2'], ['getCvnaSeg3', 'cvna-seg3'],
  ['getCva', 'cva'], ['getCvaSeg2', 'cva-seg2'], ['getCvaSeg3', 'cva-seg3']
];

// Each service method answers a payload titled with its own name so the panel it reaches can be identified.
function serviceAnswering(answer: (method: string) => Observable<unknown>) {
  const calls: string[] = [];
  const service = new Proxy({}, {
    get: (_target, method: string) => () => {
      calls.push(method);
      return answer(method);
    }
  });
  return { service, calls };
}

const payload = (method: string) => ({
  status: 'success',
  message: '',
  data: { title: method, meta: { dialogHeader: `${method} | header` }, SIN_MOVIMIENTO: null, CON_MOVIMIENTO: null, data: [] }
});

function render(page: Type<unknown>, service: object) {
  TestBed.configureTestingModule({ providers: [{ provide: Sui853CftService, useValue: service }] });
  const fixture = TestBed.createComponent(page);
  fixture.detectChanges();
  const tablas = fixture.debugElement.queryAll(By.directive(Sui853Formato2TablaComponent))
    .map(node => node.componentInstance as Sui853Formato2TablaComponent);
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, tablas, element };
}

const topBarTitle = (route: string) => LayoutComponent.prototype.getPageTitle.call({ router: { url: route } } as unknown as LayoutComponent);

describe('SUI853 Formato2 pages — legacy contract (T4)', () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver; PrimeNG tabs observe their size.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  it.each(PAGES.map(p => [p.view, p] as const))('%s feeds each legacy tab from the legacy service call', (_view, legacy) => {
    const { service, calls } = serviceAnswering(method => of(payload(method)));
    const { tablas, element } = render(legacy.page, service);

    const labels = Array.from(element.querySelectorAll('p-tab')).map(tab => tab.textContent?.trim());
    expect(labels).toEqual(legacy.tabs.map(([label]) => label));
    expect(tablas.map(tabla => tabla.data?.title)).toEqual(legacy.tabs.map(([, method]) => method));
    expect(tablas.map(tabla => tabla.loading)).toEqual(legacy.tabs.map(() => false));
    expect(calls).toEqual(expect.arrayContaining(legacy.tabs.map(([, method]) => method)));
  });

  // Legacy views show "Cargando información…" in every tab until its call resolves (v-else of isReady(segN)).
  it.each(PAGES.map(p => [p.view, p] as const))('%s keeps each tab loading until its call resolves', (_view, legacy) => {
    const pending = new Map<string, Subject<unknown>>();
    const { service } = serviceAnswering(method => {
      const subject = new Subject<unknown>();
      pending.set(method, subject);
      return subject;
    });
    const { fixture, tablas } = render(legacy.page, service);

    expect(tablas.map(tabla => tabla.loading)).toEqual(legacy.tabs.map(() => true));
    for (const [method, subject] of pending) subject.next(payload(method));
    fixture.detectChanges();
    expect(tablas.map(tabla => tabla.loading)).toEqual(legacy.tabs.map(() => false));
  });

  it.skip('PARITY-FINDING: loading text is "Cargando..." (shared sui853-formato2-tabla) instead of legacy "Cargando información…" (every Formato2 view, e.g. cft.vue:11); fix is shared/sui853-formato2-tabla.component.html:3, outside the T6e edit surface', () => {
    const { service } = serviceAnswering(() => new Subject<unknown>());
    const { element } = render(CftPageComponent, service);

    expect(element.textContent).toContain('Cargando información…');
  });

  // Approved: the legacy <h1> is shown as the layout top-bar title (parity-review-all L20, ad840cb); its text must match.
  it.each(PAGES.filter(p => !TITLE_FINDINGS.includes(p.view)).map(p => [p.view, p] as const))(
    '%s shows the legacy <h1> text in the top bar', (_view, legacy) => {
      expect(topBarTitle(legacy.route)).toBe(`SUI 853 - ${legacy.legacyTitle}`);
    });

  // cblusMinimo.vue:3, cblusMaximo.vue:3, cbicsmaxmin.vue:3 — the legacy <h1> text, upper-case without accents.
  it('cblusMinimo.vue, cblusMaximo.vue and cbicsmaxmin.vue show the legacy <h1> text in the top bar', () => {
    for (const legacy of PAGES.filter(p => TITLE_FINDINGS.includes(p.view) && p.view !== 'cbls.vue')) {
      expect(topBarTitle(legacy.route)).toBe(`SUI 853 - ${legacy.legacyTitle}`);
    }
  });

  // cbls.vue:3 shows <h1>CFT</h1>, a copy-paste bug of cft.vue.
  // Accepted deviation: legacy-characterization-tests S8/S9 (group D, legacy bug not replicated): /cbls is titled CBLS.
  it('cbls.vue keeps the CBLS top-bar title instead of the legacy copy-paste "CFT"', () => {
    expect(topBarTitle('/cbls')).toBe('SUI 853 - CBLS');
  });

  it.each(SERVICE_ROUTES)('Sui853CftService.%s posts {} to api/v1/sui853/cft/%s', (method, route) => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(Sui853CftService) as unknown as Record<string, () => Observable<unknown>>;
    const http = TestBed.inject(HttpTestingController);

    service[method]().subscribe();

    const request = http.expectOne(r => r.url.endsWith(`/api/v1/sui853/cft/${route}`));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(request.request.headers.has('x-access-token')).toBe(true);
    request.flush(payload(method));
    http.verify();
  });
});
