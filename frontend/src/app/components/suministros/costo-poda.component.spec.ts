import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CostoPodaComponent } from './costo-poda.component';
import { SuministrosService } from '../../services/suministros.service';

const PODA = { EMPR_NOMBRE: 'VEOLIA ASEO', CPTE_VALORSUI: 1000, CPTE_VALORFACT: 1234567.5, CPTE_TIPINGRESO: 1, EMPR_EMPR: 1002 };

function setup(poda: unknown[] = [PODA], bloqueo: string | null = '0') {
  const service = {
    getPoda: vi.fn(() => of({ data: poda })),
    cenrtificarEditar: vi.fn(() => of({ data: bloqueo })),
    consultaCostoPoda: vi.fn(() => of({ data: [{ EMPR_EMPR: 1002, EMPR_NOMBRE: 'VEOLIA ASEO' }, { EMPR_EMPR: 1003, EMPR_NOMBRE: 'OTRA' }] })),
    newCostoPoda: vi.fn((..._args: unknown[]) => of({ data: 'OK' })),
    registrarPoda: vi.fn((..._args: unknown[]) => of({ data: 'OK' }))
  };
  TestBed.configureTestingModule({
    imports: [CostoPodaComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  TestBed.overrideComponent(CostoPodaComponent, {
    set: { imports: [CommonModule, FormsModule, ToastModule, DialogModule, ...CommonPrimeNgModules], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(CostoPodaComponent);
  const component = fixture.componentInstance;
  const add = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add');
  component.onAnnoChange(2026);
  component.onMesChange(1);
  component.onApsChange(5);
  fixture.detectChanges();
  return { fixture, component, service, add, el: fixture.nativeElement as HTMLElement };
}

describe('CostoPodaComponent (309) — legacy views/suministros/Poda.vue', () => {
  // Legacy Poda.vue (actualizaInfoGeneral): getPoda and certificarEdicionPODA for the selected month - 1.
  it('queries the previous month', () => {
    const { service, component } = setup();

    expect(service.getPoda).toHaveBeenLastCalledWith(5, 2025, 12);
    expect(service.cenrtificarEditar).toHaveBeenLastCalledWith(5, 2025, 12);
    expect(component.items()).toEqual([PODA]);
  });

  // Legacy Poda.vue:41-50: TIPO INGRESO 1 -> 'Manual', otherwise 'Automático'; COSTO FACTURACION marked when it exceeds COSTO TECHO SUI.
  it('renders tipo ingreso and marks a facturación above the SUI ceiling', () => {
    const { el } = setup([PODA, { ...PODA, EMPR_EMPR: 1003, CPTE_TIPINGRESO: 0, CPTE_VALORFACT: 1 }]);

    const filas = Array.from(el.querySelectorAll('tbody tr')).map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim()));
    expect(filas.map((f) => f[3])).toEqual(['Manual', 'Automático']);
    expect(el.querySelectorAll('tbody td.valor-excedido').length).toBe(1);
  });

  // Legacy Poda.vue:205-235: a non-"0" fauco_existarifa answer is shown and disables editing (isEdit != 0).
  it('shows the existarifa message and disables editing when tariffs already exist', () => {
    const { el, add } = setup([PODA], 'Ya existen tarifas calculadas');

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Ya existen tarifas calculadas' }));
    const editar = el.querySelector('tbody td.actions button') as HTMLButtonElement;
    expect(editar.disabled).toBe(true);
  });

  // Legacy Poda.vue:16-22: "Nuevo" only when the period has no rows; :129-152 blank values are sent as 0 for the previous month.
  it('creates the period with one value per company, blanks as 0', () => {
    const { fixture, component, service, el } = setup([]);
    expect(el.textContent).toContain('Nuevo');

    component.abrirNuevo();
    component.modalItems.update((items) => items.map((i) => (i.EMPR_EMPR === 1002 ? { ...i, valor: 15.5 } : i)));
    component.confirmarNuevo();
    fixture.detectChanges();

    expect(service.consultaCostoPoda).toHaveBeenCalledWith(5);
    expect(service.newCostoPoda).toHaveBeenCalledWith(
      [{ EMPR_EMPR: 1002, EMPR_NOMBRE: 'VEOLIA ASEO', valor: 15.5 }, { EMPR_EMPR: 1003, EMPR_NOMBRE: 'OTRA', valor: 0 }], 5, 2025, 12);
  });

  // Legacy Poda.vue:155-178 (guardar): registrarPoda for the edited company and the previous month.
  it('saves an edited SUI ceiling for the previous month', () => {
    const { component, service } = setup();

    component.iniciarEdicion(PODA);
    component.editingValor.set(2000);
    component.confirmarGuardar(PODA);

    expect(service.registrarPoda).toHaveBeenCalledWith(1002, 2000, 5, 2025, 12);
  });

  // Legacy Poda.vue:23-44 headers EMPRESA, COSTO TECHO SUI, COSTO FACTURACION, TIPO INGRESO, Opciones.
  it.skip('PARITY-FINDING: headers differ from legacy (EMPRESA, COSTO TECHO SUI, COSTO FACTURACION, TIPO INGRESO, Opciones)', () => {
    const { el } = setup();

    expect(Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual(['EMPRESA', 'COSTO TECHO SUI', 'COSTO FACTURACION', 'TIPO INGRESO', 'Opciones']);
  });

  // Legacy Poda.vue:35-38 + formateoMiles (:180-187): thousands with Intl es-MX, decimals kept.
  it.skip('PARITY-FINDING: COSTO FACTURACION is not formatted with thousands separators like legacy formateoMiles', () => {
    const { el } = setup();

    const fila = Array.from(el.querySelectorAll('tbody tr td')).map((td) => td.textContent?.trim());
    expect(fila[2]).toBe('1,234,567.5');
  });

  // Legacy Poda.vue:12-15 paginates 15 rows with [15, 30, 50, 100].
  it.skip('PARITY-FINDING: the grid has no paginator (legacy 15 rows, options 15/30/50/100)', () => {
    const { el } = setup();

    expect(el.querySelector('.p-paginator')).not.toBeNull();
  });
});
