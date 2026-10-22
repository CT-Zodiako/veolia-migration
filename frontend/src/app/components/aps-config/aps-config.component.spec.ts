import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { ApsConfigComponent } from './aps-config.component';
import { ApsConfigItem, ApsService } from '../../services/aps.service';

function render(items: ApsConfigItem[]) {
  TestBed.configureTestingModule({
    imports: [ApsConfigComponent],
    providers: [
      { provide: ApsService, useValue: { consultaGeneral: vi.fn(() => of(items)) } },
      { provide: ConfirmationService, useValue: { confirm: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(ApsConfigComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance };
}

function nombres(fixture: ReturnType<typeof render>['fixture']): string[] {
  const filas = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
  return Array.from(filas).map((tr) => tr.cells[1]?.textContent?.trim() ?? '');
}

describe('ApsConfigComponent grid', () => {
  // Legacy apsGrid.vue:13-64: 15 rows, [15,30,50,100], every data column sortable, "Contiene" filter on Nombre.
  it('restores legacy paging, sorting by name and the Nombre filter', () => {
    const { fixture, component } = render([
      { APSA_ID: 1, APSA_NOMAPS: 'Zipaquirá', APSA_ESTADO: 1 },
      { APSA_ID: 2, APSA_NOMAPS: 'Bogotá', APSA_ESTADO: 1 },
      { APSA_ID: 3, APSA_NOMAPS: 'Cajicá', APSA_ESTADO: 1 }
    ]);
    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
    const sortables = Array.from(fixture.nativeElement.querySelectorAll('th[psortablecolumn]') as NodeListOf<HTMLElement>)
      .map((th) => th.getAttribute('psortablecolumn'));

    expect(table.rows).toBe(15);
    expect(table.rowsPerPageOptions).toEqual([15, 30, 50, 100]);
    expect(table.sortField).toBe('APSA_NOMAPS');
    expect(sortables).toEqual(['APSA_ID', 'APSA_NOMAPS', 'APSA_RESOLUCION', 'APSA_PROPIO', 'APSA_SOLORELL', 'APSA_ESTADO', 'APSA_VIAT', 'APSA_IDSUI']);
    expect(nombres(fixture)).toEqual(['Bogotá', 'Cajicá', 'Zipaquirá']);

    component.nombreFilter = 'cá';
    fixture.detectChanges();
    expect(nombres(fixture)).toEqual(['Cajicá']);
  });
});
