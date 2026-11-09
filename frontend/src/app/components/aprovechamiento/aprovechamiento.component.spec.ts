import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { AprovechamientoComponent } from './aprovechamiento.component';
import { AprovechamientoService } from '../../services/aprovechamiento.service';

function setup(aproActivar: number | null = 1) {
  const service = {
    consultar: vi.fn(() => of({ status: 'success', message: 'OK', data: aproActivar === null ? null : { apsId: 5, aproAnno: 2025, aproMes: 12, aproActivar } })),
    actualizar: vi.fn((_payload: unknown) => of({ status: 'success', message: 'OK', data: null }))
  };
  TestBed.configureTestingModule({
    imports: [AprovechamientoComponent],
    providers: [
      { provide: AprovechamientoService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  TestBed.overrideComponent(AprovechamientoComponent, {
    set: { imports: [CommonModule, FormsModule, ToastModule, ToggleSwitchModule, ...CommonPrimeNgModules], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(AprovechamientoComponent);
  const component = fixture.componentInstance;
  const add = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add');
  component.onAnnoChange(2026);
  component.onMesChange(1);
  component.onApsChange(5);
  fixture.detectChanges();
  return { fixture, component, service, add, el: fixture.nativeElement as HTMLElement };
}

describe('AprovechamientoComponent (308) — legacy views/suministros/ActAprovechamiento.vue', () => {
  // Legacy ActAprovechamiento.vue (actualizaInfoGeneral): getAprovechamiento(aps, previous month); checked = APROACTIVAR == 1.
  it('reads the previous month and reflects APROACTIVAR', () => {
    const { component, service, el } = setup(1);

    expect(service.consultar).toHaveBeenLastCalledWith({ aps: 5, anno: 2025, mes: 12 });
    expect(component.activar()).toBe(true);
    expect(el.textContent).toContain('Cobro de aprovechamiento sin tener QA');
    expect(el.textContent).toContain('Activado');
  });

  // design/suministros-pantallas/14-aprovechamiento-c-actual-mejorada.html: title, helper, current-state pill,
  // pending-change notice and Aceptar enabled only when the switch differs from the applied value.
  it('shows the section, the applied state and a pending-change notice until Aceptar', () => {
    const { fixture, component, el } = setup(0);
    const aceptar = () => el.querySelector('.aprov-footer button') as HTMLButtonElement;

    expect(el.querySelector('.aprov-titulo')?.textContent?.trim()).toBe('Cobro de aprovechamiento');
    expect(el.querySelector('.aprov-ayuda')?.textContent).toContain('aunque no se tenga QA');
    expect(el.querySelector('.aprov-pill')?.textContent?.trim()).toBe('Actual: Desactivado');
    expect(el.querySelector('.aprov-estado')?.textContent?.trim()).toBe('Sin cambios por aplicar.');
    expect(aceptar().disabled).toBe(true);

    component.activar.set(true);
    fixture.detectChanges();

    expect(el.querySelector('.aprov-estado')?.textContent?.trim()).toBe('Cambio sin aplicar: pasará a Activado al pulsar Aceptar.');
    expect(el.querySelector('.aprov-pill')?.textContent?.trim()).toBe('Actual: Desactivado');
    expect(aceptar().disabled).toBe(false);
  });

  // Legacy ActAprovechamiento.vue (makeOperation): postAprovechamiento for the previous month (January -> December).
  it('applies the switch for the previous month', () => {
    const { component, service } = setup(1);
    component.activar.set(false);

    component.confirmarAplicar();

    expect(service.actualizar).toHaveBeenCalledTimes(1);
    expect(service.actualizar.mock.calls[0][0]).toMatchObject({ aps: 5, anno: 2025, mes: 12 });
  });

  // Legacy ActAprovechamiento.vue:73-75 sends activar as 1 / 0 (SuministrosService.js:46-51).
  // Accepted deviation: legacy-characterization-tests S8/S9 (group D, request field shape consumed consistently by the API):
  // activar travels as a boolean.
  it('sends activar as a boolean (accepted deviation from legacy 1/0)', () => {
    const { component, service } = setup(0);
    component.activar.set(true);

    component.confirmarAplicar();

    expect((service.actualizar.mock.calls[0][0] as Record<string, unknown>)['activar']).toBe(true);
  });

  // Legacy ActAprovechamiento.vue:16-18: "Cobro de aprovechamiento sin tener QA: Activado" and button "Aceptar".
  it('shows the legacy label "...sin tener QA: Activado" and button "Aceptar"', () => {
    const { el } = setup(1);

    expect(el.textContent).toContain('Cobro de aprovechamiento sin tener QA: Activado');
    expect(Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim())).toContain('Aceptar');
  });

  // Legacy SuministrosService.js:58-63 toasts "Modificado Correctamente".
  it('toasts the legacy "Modificado Correctamente"', () => {
    const { component, add } = setup(1);

    component.confirmarAplicar();

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Modificado Correctamente' }));
  });
});
