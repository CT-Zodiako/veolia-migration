import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CostoPodaComponent } from './costo-poda.component';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { AuthService } from '../../services/auth.service';
import { estadoParametros } from './informes-gerenciales.spec-helpers';

const filas = [
  { PERIODO: '2025-01', EMPR_NOMBRE: 'Empresa', CPTE_VALORSUI: 1, CPTE_VALORFACT: 2, TIPOINGRESO: 'MANUAL', CPTE_FECCREA: '2025-01-15T08:00:00', SISU_CORREO: 'a@x.co' }
];

// Legacy informesgerenciales/CostoPoda.vue: FECHA CREACION column is sortable on the raw value and
// formatDateColumn only formats the cell.
describe('CostoPodaComponent (606)', () => {
  it('keeps the raw creation date in the row and formats it only in the cell', () => {
    const costoPoda = vi.fn(() => of({ status: 'ok', data: filas, message: '' }));
    TestBed.configureTestingModule({
      imports: [CostoPodaComponent],
      providers: [
        { provide: InfoGerencialService, useValue: { costoPoda } },
        { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of([])) } },
        estadoParametros()
      ]
    });
    const fixture = TestBed.createComponent(CostoPodaComponent);
    fixture.detectChanges();

    fixture.componentInstance.onApsChange(5);
    fixture.detectChanges();

    expect(costoPoda).toHaveBeenCalledWith(5);
    expect(fixture.componentInstance.rows()[0]['CPTE_FECCREA']).toBe('2025-01-15T08:00:00');
    expect(fixture.nativeElement.textContent).toContain('15/01/2025');
  });
});
