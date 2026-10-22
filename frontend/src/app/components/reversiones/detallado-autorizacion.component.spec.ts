import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { Table } from 'primeng/table';
import { DetalladoAutorizacionComponent } from './detallado-autorizacion.component';
import { ReversionesService } from '../../services/reversiones.service';

describe('DetalladoAutorizacionComponent (3004)', () => {
  // Legacy DetalladoAutorizacion.vue:8-66: every column sortable, 10 rows, [10, 20, 50].
  it('sorts every column and pages like legacy', () => {
    TestBed.configureTestingModule({
      imports: [DetalladoAutorizacionComponent],
      providers: [{
        provide: ReversionesService,
        useValue: {
          detalladoAutorizacion: vi.fn(() => of([
            { APSA_NOMAPS: 'Tunja', AUTO_ANNO: 2025, AUTO_MES: 2, AUTO_DESCRIPCION: 'b', AUTO_FECCREA: '2025-02-01', SISU_CORREO: 'z@v.com' },
            { APSA_NOMAPS: 'Arauca', AUTO_ANNO: 2024, AUTO_MES: 9, AUTO_DESCRIPCION: 'a', AUTO_FECCREA: '2024-09-01', SISU_CORREO: 'a@v.com' }
          ]))
        }
      }]
    });
    const fixture = TestBed.createComponent(DetalladoAutorizacionComponent);
    fixture.detectChanges();
    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
    const sortables = Array.from(fixture.nativeElement.querySelectorAll('th[psortablecolumn]') as NodeListOf<HTMLElement>)
      .map((th) => th.getAttribute('psortablecolumn'));
    const aps = () => Array.from(fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>)
      .map((tr) => tr.cells[0]?.textContent?.trim());

    expect(table.rows).toBe(10);
    expect(table.rowsPerPageOptions).toEqual([10, 20, 50]);
    expect(sortables).toEqual(['APSA_NOMAPS', 'AUTO_ANNO', 'AUTO_MES', 'AUTO_DESCRIPCION', 'AUTO_FECCREA', 'SISU_CORREO']);
    expect(aps()).toEqual(['Tunja', 'Arauca']);

    (fixture.nativeElement.querySelector('th[psortablecolumn="APSA_NOMAPS"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(aps()).toEqual(['Arauca', 'Tunja']);

    // PRESERVE: the per-column filters still apply.
    fixture.componentInstance.usuarioFilter = 'z@';
    fixture.detectChanges();
    expect(aps()).toEqual(['Tunja']);
  });
});
