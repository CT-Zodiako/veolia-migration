import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { RellenosConfigPageComponent } from './rellenos-config-page.component';
import { RellenosService } from '../../services/rellenos.service';
import { RellenoItem } from '../../models/rellenos.models';

const relleno = (id: number, nombre: string): RellenoItem => ({
  RELL_ID: id, RELL_NOMRELLENO: nombre, RELL_DESCRIPCION: 'd', RELL_ESTADO: 1, RELL_PROPIO: 0,
  RELL_REGIONAL: 0, RELL_NUSD: null, RELL_FECHACREACION: '2024-01-01', USUA_USUA: 1
});

describe('RellenosConfigPageComponent grid', () => {
  // Legacy rellGrid.vue:13-124: 15 rows, [15,30,50,100], legacy columns sortable, "Contiene" filter on Nombre.
  it('restores legacy paging, sorting by name and the Nombre filter', () => {
    TestBed.configureTestingModule({
      imports: [RellenosConfigPageComponent],
      providers: [
        { provide: RellenosService, useValue: { getRellenos: vi.fn(() => of([relleno(1, 'Tunja'), relleno(2, 'Doña Juana'), relleno(3, 'Mondoñedo')])) } },
        { provide: ConfirmationService, useValue: { confirm: vi.fn() } }
      ]
    });
    const fixture = TestBed.createComponent(RellenosConfigPageComponent);
    fixture.detectChanges();
    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
    const sortables = Array.from(fixture.nativeElement.querySelectorAll('th[psortablecolumn]') as NodeListOf<HTMLElement>)
      .map((th) => th.getAttribute('psortablecolumn'));
    const nombres = () => Array.from(fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>)
      .map((tr) => tr.cells[1]?.textContent?.trim());

    expect(table.rows).toBe(15);
    expect(table.rowsPerPageOptions).toEqual([15, 30, 50, 100]);
    expect(table.sortField).toBe('RELL_NOMRELLENO');
    expect(sortables).toEqual(['RELL_ID', 'RELL_NOMRELLENO', 'RELL_ESTADO', 'RELL_PROPIO', 'RELL_REGIONAL', 'RELL_NUSD']);
    expect(nombres()).toEqual(['Doña Juana', 'Mondoñedo', 'Tunja']);

    fixture.componentInstance.nombreFilter = 'doñ';
    fixture.detectChanges();
    expect(nombres()).toEqual(['Doña Juana', 'Mondoñedo']);
  });
});
