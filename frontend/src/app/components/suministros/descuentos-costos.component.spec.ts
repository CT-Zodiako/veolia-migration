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
  const dialog = fixture.debugElement.query(By.directive(DescuentoCostosDialogComponent)).componentInstance as DescuentoCostosDialogComponent;
  const messages = fixture.debugElement.injector.get(MessageService);
  vi.spyOn(messages, 'add');
  return { fixture, component, service, tabla, dialog, messages };
}

function botonAgregar(fixture: ReturnType<typeof setup>['fixture']): HTMLElement & { disabled: boolean } {
  return fixture.nativeElement.querySelector('p-button[label="Agregar"]');
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

  // S4: 304 must let the user enter and edit discounts (same flow as 605 / legacy Descuentos.vue), with no tarifa check.
  describe('add / edit (S4)', () => {
    // Descuentos.vue:226-238 setapsDesCost(aps, month-1, PARA_PARA, valor), then close and reload (:257-258).
    it('adds a discount in the previous month and reloads the grid', () => {
      const { fixture, component, service, dialog } = setup();

      component.abrirNuevo();
      fixture.detectChanges();
      expect(service.getApsDesCostUnico).toHaveBeenLastCalledWith(0, 5, 2025, 12, true);
      expect(dialog.catalogoOptions()).toEqual(catalogo);
      expect(dialog.visible()).toBe(true);
      expect(dialog.esNuevo()).toBe(true);

      dialog.seleccion.set(21);
      dialog.valor.set(12.5);
      const consultasPrevias = service.getApsDesCost.mock.calls.length;
      dialog.guardar();

      expect(service.setApsDesCost).toHaveBeenCalledWith(5, 2025, 12, 21, 12.5);
      expect(service.uptApsDesCost).not.toHaveBeenCalled();
      expect(dialog.visible()).toBe(false);
      expect(service.getApsDesCost).toHaveBeenCalledTimes(consultasPrevias + 1);
      expect(service.getApsDesCost).toHaveBeenLastCalledWith(5, 2025, 12);
    });

    // Descuentos.vue:182-209 getapsDesCostUnico(DESC_ID, aps, month-1, false) preselects PARA_COSTO20010;
    // :239-250 uptapsDesCost(aps, month-1, PARA_PARA, valor).
    it('edits a discount preselecting its PARA_COSTO20010 and saves with uptApsDesCost', () => {
      const { fixture, component, service, dialog } = setup();

      component.abrirEdicion({ DESC_ID: 55, PARA_COSTO20010: 20, PARA_NOMBRE: 'CBL', DESC_VALOR: 7 });
      fixture.detectChanges();

      expect(service.getApsDesCostUnico).toHaveBeenLastCalledWith(55, 5, 2025, 12, false);
      expect(dialog.esNuevo()).toBe(false);
      expect(dialog.seleccion()).toBe(20);
      expect(dialog.valor()).toBe(7);

      dialog.valor.set(9.75);
      const consultasPrevias = service.getApsDesCost.mock.calls.length;
      dialog.guardar();

      expect(service.uptApsDesCost).toHaveBeenCalledWith(5, 2025, 12, 20, 9.75);
      expect(service.setApsDesCost).not.toHaveBeenCalled();
      expect(dialog.visible()).toBe(false);
      expect(service.getApsDesCost).toHaveBeenCalledTimes(consultasPrevias + 1);
    });

    // Descuentos.vue:252-258: alert "debe seleccionar un descuento!!", reload and close the dialog.
    it('saving without a cost warns "debe seleccionar un descuento!!", saves nothing, reloads and closes', () => {
      const { fixture, component, service, dialog, messages } = setup();
      component.abrirNuevo();
      fixture.detectChanges();
      const consultasPrevias = service.getApsDesCost.mock.calls.length;

      dialog.guardar();

      expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn', detail: 'debe seleccionar un descuento!!' }));
      expect(service.setApsDesCost).not.toHaveBeenCalled();
      expect(service.uptApsDesCost).not.toHaveBeenCalled();
      expect(dialog.visible()).toBe(false);
      expect(service.getApsDesCost).toHaveBeenCalledTimes(consultasPrevias + 1);
    });

    // S4: with no discounts yet (tarifas not calculated) the grid is empty and Agregar must stay enabled.
    it('keeps Agregar enabled with an empty grid and opens the new-discount dialog', () => {
      const { fixture, component, dialog } = setup([]);

      expect(component.rows()).toEqual([]);
      const boton = botonAgregar(fixture);
      expect(boton).not.toBeNull();
      expect(boton.disabled).toBe(false);

      boton.dispatchEvent(new CustomEvent('onClick'));
      fixture.detectChanges();
      expect(dialog.visible()).toBe(true);
      expect(dialog.esNuevo()).toBe(true);
    });

    it('disables Agregar until APS, año and mes are selected', () => {
      const { fixture, component } = setup();

      component.onApsChange(null);
      fixture.detectChanges();

      expect(botonAgregar(fixture).disabled).toBe(true);
    });
  });
});
