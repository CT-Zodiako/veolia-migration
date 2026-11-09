import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { DescuentosCostosComponent } from './descuentos-costos.component';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { MessageService } from 'primeng/api';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';
import { DescuentoCostosDialogComponent } from '../shared/descuento-costos-dialog.component';

const catalogo = [
  { PARA_PARA: 20, PARA_NOMBRE: 'CBL', DESC_VALOR: 7 },
  { PARA_PARA: 21, PARA_NOMBRE: 'CLUS', DESC_VALOR: 0 }
];

function setup(data: Record<string, unknown>[] = [{ PARA_NOMBRE: 'CBL', DESC_VALOR: 0.123456 }]) {
  const service = {
    getApsDesCost: vi.fn(() => of({ status: 'success', data })),
    getApsDesCostUnico: vi.fn(() => of({ status: 'success', data: catalogo })),
    setApsDesCost: vi.fn(() => of({ status: 'success', data: {}, message: 'OK' })),
    uptApsDesCost: vi.fn(() => of({ status: 'success', data: {}, message: 'OK' }))
  };
  TestBed.configureTestingModule({
    imports: [DescuentosCostosComponent],
    providers: [{ provide: InfoGerencialService, useValue: service }]
  });
  TestBed.overrideComponent(DescuentosCostosComponent, {
    set: { imports: [CommonModule, FormsModule, TablaAvanzadaComponent, DescuentoCostosDialogComponent], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(DescuentosCostosComponent);
  const component = fixture.componentInstance;
  component.onAnnoChange(2026);
  component.onMesChange(1);
  component.onApsChange(5);
  fixture.detectChanges();
  const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
  const messages = fixture.debugElement.injector.get(MessageService);
  vi.spyOn(messages, 'add');
  return { fixture, component, service, tabla, messages };
}

describe('DescuentosCostosComponent — design/suministros-pantallas/15 (versión actual mejorada)', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  beforeAll(() => {
    globalThis.ResizeObserver ??= class { observe(): void {} unobserve(): void {} disconnect(): void {} } as unknown as typeof ResizeObserver;
  });
  afterAll(() => { globalThis.ResizeObserver = originalResizeObserver; });

  it('titles the card and explains the value', () => {
    const { fixture } = setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.desc-titulo')?.textContent?.trim()).toBe('Descuentos por costo');
    expect(el.querySelector('.desc-ayuda')?.textContent).toContain('0 significa sin descuento');
    expect(el.querySelector('.desc-ayuda')?.textContent).not.toContain('Agregar');
  });

  it('summarises the rows in the footer', () => {
    const vacio = setup([{ PARA_NOMBRE: 'CBLs', DESC_VALOR: 0 }, { PARA_NOMBRE: 'CRT', DESC_VALOR: 0 }]);
    expect((vacio.fixture.nativeElement as HTMLElement).querySelector('.desc-pie')?.textContent?.trim()).toBe('2 costos · todos en 0 (sin descuento aplicado)');
    TestBed.resetTestingModule();

    const con = setup([{ PARA_NOMBRE: 'CBLs', DESC_VALOR: 0.5 }, { PARA_NOMBRE: 'CRT', DESC_VALOR: 0 }]);
    expect((con.fixture.nativeElement as HTMLElement).querySelector('.desc-pie')?.textContent?.trim()).toBe('2 costos · 1 con descuento');
  });

  it('shows the full name under each known cost code', () => {
    const { component } = setup();
    expect(component.descripcionCosto('CBLs')).toBe('Barrido y limpieza');
    expect(component.descripcionCosto('CRT')).toBe('Recolección y transporte');
    expect(component.descripcionCosto('OTRO')).toBe('');
  });
});

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

  // S4: 304 must let the user enter and edit discounts (same flow as 605 / legacy Descuentos.vue), with no tarifa check.
  // User choice (verbatim option): "Sacar Agregar y Editar (dejarla solo de consulta) — Que la pantalla sea solo para ver
  // los descuentos, como el legacy de este menú (304); la edición queda en otra pantalla." Legacy DescuentosDos.vue is
  // display-only: no Agregar, no row actions, no add/edit dialog, and no write calls.
  it('is read-only like legacy DescuentosDos.vue: no Agregar, no edit actions, no dialog', () => {
    const { fixture, service, tabla } = setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('p-button[label="Agregar"]')).toBeNull();
    expect(el.querySelector('button[aria-label^="Editar"]')).toBeNull();
    expect(fixture.debugElement.query(By.directive(DescuentoCostosDialogComponent))).toBeNull();
    expect(tabla.accionesTemplate).toBeUndefined();
    expect(service.getApsDesCostUnico).not.toHaveBeenCalled();
    expect(service.setApsDesCost).not.toHaveBeenCalled();
    expect(service.uptApsDesCost).not.toHaveBeenCalled();
  });
});
