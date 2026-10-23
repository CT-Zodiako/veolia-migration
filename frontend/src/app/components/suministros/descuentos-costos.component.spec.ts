import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { DescuentosCostosComponent } from './descuentos-costos.component';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';

function setup() {
  const service = { getApsDesCost: vi.fn(() => of({ status: 'success', data: [{ PARA_NOMBRE: 'CBL', DESC_VALOR: 0.123456 }] })) };
  TestBed.configureTestingModule({
    imports: [DescuentosCostosComponent],
    providers: [{ provide: InfoGerencialService, useValue: service }]
  });
  TestBed.overrideComponent(DescuentosCostosComponent, {
    set: { imports: [CommonModule, FormsModule, TablaAvanzadaComponent], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(DescuentosCostosComponent);
  const component = fixture.componentInstance;
  component.onAnnoChange(2026);
  component.onMesChange(1);
  component.onApsChange(5);
  fixture.detectChanges();
  const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
  return { fixture, component, service, tabla };
}

describe('DescuentosCostosComponent (304) — legacy views/suministros/DescuentosDos.vue', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  afterAll(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });
  beforeEach(() => localStorage.clear());

  // Legacy DescuentosDos.vue (consultarData): getapsDesCost(aps, selected month - 1); DESC_VALOR shown with redondeo(valor, 4).
  it('queries the previous month and rounds DESC_VALOR to 4 decimals', () => {
    const { component, service, tabla } = setup();

    expect(service.getApsDesCost).toHaveBeenLastCalledWith(5, 2025, 12);
    expect(component.rows()).toEqual([{ PARA_NOMBRE: 'CBL', DESC_VALOR: 0.1235 }]);
    expect(tabla.columnas.map((c) => c.field)).toEqual(['PARA_NOMBRE', 'DESC_VALOR']);
  });

  // Legacy DescuentosDos.vue:15-30 headers COSTO / DESCUENTO.
  it('uses the legacy headers COSTO / DESCUENTO', () => {
    const { tabla } = setup();

    expect(tabla.columnas.map((c) => c.header)).toEqual(['COSTO', 'DESCUENTO']);
  });
});
