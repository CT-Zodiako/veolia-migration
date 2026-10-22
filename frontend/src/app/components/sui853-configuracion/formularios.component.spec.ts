import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError } from 'rxjs';
import { Table } from 'primeng/table';
import { FormulariosComponent } from './formularios.component';
import { FormularioRow, Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';
import { LayoutComponent } from '../layout/layout.component';

// Legacy sui853/views/configuracion/formularios.vue <Column field/header> order (+ "Acciones").
const LEGACY_COLUMNS = ['FORMATO', 'SECCION', 'FIELD', 'HEADER_TXT', 'BACKGROUND_COLOR', 'FILTER_FLAG', 'FORMATO_DATO', 'DECIMALES',
  'ALINEACION', 'TOOLTIP', 'MOSTRAR_HEADER', 'INCLUIR_DATA', 'ORDEN_HEADER', 'ORDEN_DATA'];

const row = (extra: Partial<FormularioRow> = {}): FormularioRow => ({
  FORMATO: 'F853S105', SECCION: 'SIN_MOVIMIENTO', FIELD: 'VALOR', HEADER_TXT: 'Valor', BACKGROUND_COLOR: 'R', FILTER_FLAG: 'S',
  FORMATO_DATO: 'numero', DECIMALES: null, ALINEACION: 'der', TOOLTIP: 'Ayuda', MOSTRAR_HEADER: 'N', INCLUIR_DATA: 'S',
  ORDEN_HEADER: 1, ORDEN_DATA: 2, ...extra
});

function setup(rows: FormularioRow[] = [row()], update: (r: FormularioRow) => Observable<unknown> = r => of({ status: 200, data: r })) {
  const service = {
    getFormularios: vi.fn(() => of({ status: 200, data: rows })),
    updateFormulario: vi.fn(update)
  };
  TestBed.configureTestingModule({
    imports: [FormulariosComponent],
    providers: [{ provide: Sui853ConfiguracionService, useValue: service }]
  });
  const fixture = TestBed.createComponent(FormulariosComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service, element: fixture.nativeElement as HTMLElement };
}

describe('FormulariosComponent (30003, legacy sui853/views/configuracion/formularios.vue)', () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver; the PrimeNG table observes its size.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  // formularios.vue:mounted → loadRows(): getFormularios once; the 14 SUI.CFG_COLUMNA columns in legacy order + Acciones.
  it('loads SUI.CFG_COLUMNA once and shows the legacy columns in order', () => {
    const { service, component, element } = setup();

    expect(service.getFormularios).toHaveBeenCalledTimes(1);
    expect(component.columns.map(c => [c.field, c.header])).toEqual(LEGACY_COLUMNS.map(c => [c, c]));
    const headerText = element.querySelector('thead')?.textContent ?? '';
    for (const column of [...LEGACY_COLUMNS, 'Acciones']) expect(headerText).toContain(column);
  });

  // formularios.vue BACKGROUND_COLORLabel / FILTER_FLAGLabel / FORMATO_DATOLabel / ALINEACIONLabel / MOSTRAR_HEADERLabel /
  // INCLUIR_DATALabel: R→Rojo, S→Sí, N→No, numero→Número, der→Derecha.
  it('renders the legacy catalog labels in read mode', () => {
    const { element } = setup();
    const body = element.querySelector('tbody')?.textContent ?? '';

    for (const label of ['Rojo', 'Número', 'Derecha', 'Sí', 'No', 'F853S105', 'Valor', 'Ayuda']) expect(body).toContain(label);
  });

  // formularios.vue displayDecimales: número/porcentaje with DECIMALES null read as 0; other formats show "—".
  it.skip('PARITY-FINDING: a "numero" row with DECIMALES null shows "—"; legacy displayDecimales shows 0 for número/porcentaje', () => {
    const { component } = setup();

    expect(component.display('DECIMALES', component.rows[0].DECIMALES)).toBe(0);
  });

  // formularios.vue startEdit + onFormatoDatoChange: DECIMALES defaults to 0 for número/porcentaje and becomes null otherwise.
  it('edits with the legacy DECIMALES rules', () => {
    const { component } = setup();

    component.edit(component.rows[0]);
    expect(component.draft?.DECIMALES).toBe(0);
    component.setCatalog('FORMATO_DATO', 'texto');
    expect(component.draft?.DECIMALES).toBeNull();
    component.setCatalog('FORMATO_DATO', 'porcentaje');
    expect(component.draft?.DECIMALES).toBe(0);
  });

  // formularios.vue save(): updateFormulario(merged row) with numeric ORDEN_* and DECIMALES; the saved row replaces it.
  it('saves the merged row and shows the reloaded row', () => {
    const { component, service } = setup(undefined, r => of({ status: 200, data: { ...r, HEADER_TXT: 'Guardado en BD' } }));

    component.edit(component.rows[0]);
    component.draft!.HEADER_TXT = 'Nuevo';
    component.draft!.DECIMALES = 3;
    component.save();

    expect(service.updateFormulario).toHaveBeenCalledWith(row({ HEADER_TXT: 'Nuevo', DECIMALES: 3 }));
    expect(component.rows[0].HEADER_TXT).toBe('Guardado en BD');
    expect(component.draft).toBeNull();
  });

  // formularios.vue isDraftValid / validRequerido: HEADER_TXT is "Requerido." — an invalid draft is never saved.
  it('does not save a draft without HEADER_TXT', () => {
    const { component, service } = setup();

    component.edit(component.rows[0]);
    component.draft!.HEADER_TXT = '  ';
    component.save();

    expect(component.valid).toBe(false);
    expect(service.updateFormulario).not.toHaveBeenCalled();
  });

  // formularios.vue <DataTable :rows="10" :rowsPerPageOptions="[10, 30, 50, 100]">.
  it.skip('PARITY-FINDING: paginator offers [10, 20, 50] instead of legacy [10, 30, 50, 100]', () => {
    const { fixture } = setup();
    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;

    expect(table.rows).toBe(10);
    expect(table.rowsPerPageOptions).toEqual([10, 30, 50, 100]);
  });

  // formularios.vue save(): toast { summary: "Guardado", detail: "Cambios aplicados." }.
  it.skip('PARITY-FINDING: save success shows "Cambios guardados." instead of legacy toast "Guardado" / "Cambios aplicados."', () => {
    const { component, fixture, element } = setup();

    component.edit(component.rows[0]);
    component.save();
    fixture.detectChanges();

    expect(element.textContent).toContain('Cambios aplicados.');
  });

  // formularios.vue save() catch: restores the previous row, closes nothing and toasts "No se pudo guardar. Intenta de nuevo.".
  it.skip('PARITY-FINDING: save error shows "No se pudo guardar. El borrador se conserva; ..." instead of legacy "No se pudo guardar. Intenta de nuevo."', () => {
    const { component, fixture, element } = setup(undefined, () => throwError(() => new Error('500')));

    component.edit(component.rows[0]);
    component.draft!.HEADER_TXT = 'Nuevo';
    component.save();
    fixture.detectChanges();

    expect(element.textContent).toContain('No se pudo guardar. Intenta de nuevo.');
    expect(component.rows[0].HEADER_TXT).toBe('Valor');
  });

  // Approved: the legacy <h2 class="page-title">Formularios</h2> is the top-bar title (parity-review-all L20).
  it('shows the legacy "Formularios" title in the top bar', () => {
    expect(LayoutComponent.prototype.getPageTitle.call({ router: { url: '/formularios' } } as unknown as LayoutComponent)).toBe('Formularios');
  });
});
