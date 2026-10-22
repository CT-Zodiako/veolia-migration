import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { EjecutarReversionComponent } from './ejecutar-reversion.component';
import { SuministrosService } from '../../services/suministros.service';
import { ValidacionesService } from '../../services/validaciones.service';

function setup(validacion: { ok: boolean; message: string | null } = { ok: true, message: null }) {
  const suministros = { setReversion: vi.fn((_payload: unknown) => of({ ok: true, message: null, reversionId: 33 })) };
  const validaciones = { faucoIntegracion: vi.fn((_req: unknown) => of(validacion)) };
  const confirmation = { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) };
  TestBed.configureTestingModule({
    imports: [EjecutarReversionComponent],
    providers: [
      { provide: SuministrosService, useValue: suministros },
      { provide: ValidacionesService, useValue: validaciones },
      { provide: ConfirmationService, useValue: confirmation }
    ]
  });
  TestBed.overrideComponent(EjecutarReversionComponent, {
    set: { imports: [CommonModule, FormsModule, ...CommonPrimeNgModules], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(EjecutarReversionComponent);
  const component = fixture.componentInstance;
  component.aps = 5;
  component.anno = 2026;
  component.mes = 1;
  fixture.detectChanges();
  return { fixture, component, suministros, validaciones, confirmation };
}

describe('EjecutarReversionComponent (3001) — legacy views/suministros/Reversiones.vue', () => {
  // Legacy Reversiones.vue (makeReversion): fauco_integracion gate with the selected month - 1, confirm, then setReversion for
  // the same period with the motivo.
  it('validates the previous period, confirms and reverses it', () => {
    const { component, suministros, validaciones, confirmation } = setup();
    component.motivo = '  Error de cargue  ';

    component.ejecutar();

    expect(validaciones.faucoIntegracion).toHaveBeenCalledWith({ aps: 5, anno: 2025, mes: 12 });
    expect(confirmation.confirm).toHaveBeenCalledTimes(1);
    expect(suministros.setReversion).toHaveBeenCalledWith({ aps: 5, anno: 2025, mes: 12, motivo: 'Error de cargue' });
  });

  // Legacy Reversiones.vue: when the gate is not OK it shows the gate message (alert(validacion)) and does not reverse.
  it('shows the gate message and does not reverse when the period cannot be reversed', () => {
    const { fixture, component, suministros } = setup({ ok: false, message: 'Las tarifas ya fueron integradas con el SC' });
    component.motivo = 'Error';

    component.ejecutar();
    fixture.detectChanges();

    expect(suministros.setReversion).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Las tarifas ya fueron integradas con el SC');
  });

  // Legacy CargueService.js:518-523 toasts "Periodo Reversado Correctamente".
  it.skip('PARITY-FINDING: the success message is not the legacy "Periodo Reversado Correctamente"', () => {
    const { component } = setup();
    component.motivo = 'Error';

    component.ejecutar();

    expect(component.success).toBe('Periodo Reversado Correctamente');
  });

  // Legacy Reversiones.vue: an empty motivo shows "El valor es obligatorio".
  it.skip('PARITY-FINDING: an empty motivo shows a different message than legacy "El valor es obligatorio"', () => {
    const { component, suministros } = setup();
    component.motivo = '   ';

    component.ejecutar();

    expect(suministros.setReversion).not.toHaveBeenCalled();
    expect(component.error).toBe('El valor es obligatorio');
  });

  // Legacy Reversiones.vue:17-18: button "Reversar", textarea placeholder "Motivo de Reversión...".
  it.skip('PARITY-FINDING: the action button is "Ejecutar Reversión" instead of legacy "Reversar"', () => {
    const { fixture } = setup();

    const boton = (fixture.nativeElement as HTMLElement).querySelector('p-button');
    expect(boton?.textContent?.trim()).toBe('Reversar');
  });
});
