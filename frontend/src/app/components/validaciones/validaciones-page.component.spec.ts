import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ValidacionesPageComponent } from './validaciones-page.component';

// The page has no legacy screen (no MENU_ID, absent from front-tarificador MenuService.js); it drives the seven legacy
// validaciones routes (back-tarificador validaciones/routes.js:7-78), which read { aps, anno, mes } from the body.
const RUTAS = [
  'certificarfauco_existarifa',
  'certificarFauco_cpsuivsfact',
  'certificarFauco_cpproductividad',
  'certificarFauco_cpenero',
  'certificarFauco_integracion',
  'certificarfauco_existerelleno',
  'certificarfauco_existarifacert'
];

function setup() {
  TestBed.configureTestingModule({
    imports: [ValidacionesPageComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()]
  });
  TestBed.overrideComponent(ValidacionesPageComponent, {
    set: { imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TagModule, ToastModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(ValidacionesPageComponent);
  const component = fixture.componentInstance;
  component.aps.set(1031);
  component.anno.set(2025);
  component.mes.set(11);
  fixture.detectChanges();
  return { fixture, component, http: TestBed.inject(HttpTestingController) };
}

describe('ValidacionesPageComponent — legacy validaciones routes', () => {
  it('runs the seven legacy validation routes with { aps, anno, mes }', () => {
    const { component, http } = setup();

    component.ejecutarTodas();

    for (const ruta of RUTAS) {
      const req = http.expectOne((r) => r.url.endsWith(`/api/v1/validaciones/${ruta}`));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ aps: 1031, anno: 2025, mes: 11 });
      req.flush({ ok: true, message: null });
    }
    http.verify();
    expect(component.validaciones().map((v) => v.resultado?.ok)).toEqual([true, true, true, true, true, true, true]);
  });

  // Legacy validaciones/controller.js answers the raw function text; a failed check shows that text.
  it('shows the message of a failed check', () => {
    const { fixture, component, http } = setup();

    component.ejecutarUna(1);
    http.expectOne((r) => r.url.endsWith('/api/v1/validaciones/certificarFauco_cpsuivsfact')).flush({ ok: false, message: 'Poda facturación supera SUI' });
    fixture.detectChanges();

    expect(component.getResultadoTexto(component.validaciones()[1].resultado)).toBe('Poda facturación supera SUI');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Poda facturación supera SUI');
    http.verify();
  });
});
