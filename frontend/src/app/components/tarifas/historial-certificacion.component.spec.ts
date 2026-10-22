import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HistorialCertificacionComponent } from './historial-certificacion.component';
import { InfoGeneralesService } from '../../services/infogenerales.service';
import { estadoParametros } from '../infogerenciales/informes-gerenciales.spec-helpers';

// C5 check: the screen starts with today's año/mes, so the shared selectors never re-emit a restored
// value and the history is queried exactly once on entry (no double query).
describe('HistorialCertificacionComponent (503)', () => {
  it('queries the history exactly once on entry', () => {
    const consulta = vi.fn(() => of({ status: 'ok', data: [], message: '' }));
    TestBed.configureTestingModule({
      imports: [HistorialCertificacionComponent],
      providers: [{ provide: InfoGeneralesService, useValue: { consultaHistorialCertificaciones: consulta } }, estadoParametros(2024, 5)]
    });
    const fixture = TestBed.createComponent(HistorialCertificacionComponent);
    fixture.detectChanges();

    expect(consulta).toHaveBeenCalledTimes(1);
  });
});
