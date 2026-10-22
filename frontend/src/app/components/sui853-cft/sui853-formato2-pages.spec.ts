import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Sui853CftService } from '../../services/sui853-cft.service';
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

const SEG_1_2_3 = ['SEG 1', 'SEG 2', 'SEG 3'];

// Tab labels of each legacy view (front-tarificador/src/sui853/views/{CFT,CVNA,CVA}/*.vue <TabPanel header>).
const PAGES: [string, Type<unknown>, string[]][] = [
  ['cft.vue', CftPageComponent, SEG_1_2_3],
  ['cssAprovechamientoC.vue', CssAprovechamientoPageComponent, SEG_1_2_3],
  ['crlus.vue', CrlusPageComponent, ['SEG 1']],
  ['cbls.vue', CblsPageComponent, ['SEG 1']],
  ['cblusMinimo.vue', CblusMinimoPageComponent, ['SEG 2']],
  ['cblusMaximo.vue', CblusMaximoPageComponent, ['SEG 2']],
  ['cblus.vue', CblusPageComponent, ['SEG 2']],
  ['cbicsmaxmin.vue', CbicsMaxminPageComponent, ['SEG 3']],
  ['crtsMinimo.vue', CrtsMinimoPageComponent, SEG_1_2_3],
  ['crtsMaximo.vue', CrtsMaximoPageComponent, SEG_1_2_3],
  ['crt.vue', CrtPageComponent, SEG_1_2_3],
  ['cvna.vue', CvnaPageComponent, SEG_1_2_3],
  ['cva.vue', CvaPageComponent, SEG_1_2_3]
];

describe('SUI853 Formato2 pages', () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver; PrimeNG tabs observe their size.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    // Every getXxx() of the service answers with an empty Formato2 envelope ("data": null).
    const service = new Proxy({}, {
      get: () => () => of({ status: 'success', data: { title: null, SIN_MOVIMIENTO: null, CON_MOVIMIENTO: null, data: null }, message: '' })
    });
    TestBed.configureTestingModule({ providers: [{ provide: Sui853CftService, useValue: service }] });
  });

  it.each(PAGES)('%s uses the legacy tab labels and renders data:null as empty', (_legacy, page, labels) => {
    const fixture = TestBed.createComponent(page);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const tabs = Array.from(element.querySelectorAll('p-tab')).map((tab) => tab.textContent?.trim());
    expect(tabs).toEqual(labels);
    expect(element.textContent).toContain('Sin datos');
  });
});
