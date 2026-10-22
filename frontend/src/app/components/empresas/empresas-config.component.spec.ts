import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { EmpresasConfigComponent } from './empresas-config.component';
import { EmpresaItem, EmpresasService } from '../../services/empresas.service';

function render(empresas: EmpresaItem[]) {
  const service = { getEmpresas: vi.fn(() => of(empresas)), toggleEstado: vi.fn(() => of({ rowsAffected: 1 })) };
  TestBed.configureTestingModule({
    imports: [EmpresasConfigComponent],
    providers: [
      { provide: EmpresasService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(EmpresasConfigComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

function columna(fixture: ReturnType<typeof render>['fixture'], index: number): string[] {
  const filas = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
  return Array.from(filas).map((tr) => tr.cells[index]?.textContent?.trim() ?? '');
}

const empresa = (id: number, nombre: string, estado: string | number): EmpresaItem =>
  ({ EMPR_EMPR: id, EMPR_NOMBRE: nombre, EMPR_ESTADO: estado, EMPR_PROPIA: 1, EMPR_NUAP: '0' });

describe('EmpresasConfigComponent', () => {
  // E2: EMPR_ESTADO is VARCHAR2 — Oracle returns "1"/"0"; legacy emprGrid.vue:83 used parseInt.
  it('shows Activa/Inactiva for string and number estados', () => {
    const { fixture } = render([empresa(1, 'A', '1'), empresa(2, 'B', '0'), empresa(3, 'C', 1), empresa(4, 'D', 0)]);

    expect(columna(fixture, 2)).toEqual(['Activa', 'Inactiva', 'Activa', 'Inactiva']);
  });

  it('toggles a string estado to the opposite string value', () => {
    const { fixture, component, service } = render([empresa(1, 'A', '1'), empresa(2, 'B', '0')]);

    component.toggleEstado(component.empresas[0]);
    component.toggleEstado(component.empresas[1]);
    fixture.detectChanges();

    expect(service.toggleEstado).toHaveBeenCalledWith(1);
    expect(component.empresas.map((e) => e.EMPR_ESTADO)).toEqual(['0', '1']);
    expect(columna(fixture, 2)).toEqual(['Inactiva', 'Activa']);
  });

  it('toggles a number estado to the opposite number value', () => {
    const { component } = render([empresa(1, 'A', 1), empresa(2, 'B', 0)]);

    component.toggleEstado(component.empresas[0]);
    component.toggleEstado(component.empresas[1]);

    expect(component.empresas.map((e) => e.EMPR_ESTADO)).toEqual([0, 1]);
  });

  // Grid parity with legacy emprGrid.vue:13-99 (15 rows, [15,30,50,100], sortable columns, Nombre filter).
  it('restores legacy paging, sorting by name and the Nombre filter', () => {
    const { fixture, component } = render([empresa(1, 'Zeta', '1'), empresa(2, 'alfa', '1'), empresa(3, 'Beta', '1')]);
    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
    const sortables = Array.from(fixture.nativeElement.querySelectorAll('th[psortablecolumn]') as NodeListOf<HTMLElement>)
      .map((th) => th.getAttribute('psortablecolumn'));

    expect(table.rows).toBe(15);
    expect(table.rowsPerPageOptions).toEqual([15, 30, 50, 100]);
    expect(table.sortField).toBe('EMPR_NOMBRE');
    expect(sortables).toEqual(['EMPR_EMPR', 'EMPR_NOMBRE', 'EMPR_ESTADO', 'EMPR_PROPIA', 'EMPR_NUAP']);
    expect(columna(fixture, 1)).toEqual(['alfa', 'Beta', 'Zeta']);

    component.nombreFilter = 'et';
    fixture.detectChanges();
    expect(columna(fixture, 1)).toEqual(['Beta', 'Zeta']);
  });
});
