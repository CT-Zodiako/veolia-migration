import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HistorialProductividadComponent, formatearNumero } from './historial-productividad.component';
import { InfoGeneralesService } from '../../services/infogenerales.service';
import { estadoParametros } from '../infogerenciales/informes-gerenciales.spec-helpers';

const filas = [
  { CODAPS: 1, NOMAPS: 'APS Uno', NOMEMPRESA: 'E', COSTO: 'CRT', PR22_VALOR: 1.5, SISU_CORREO: 'a@x.co' },
  { CODAPS: 2, NOMAPS: 'APS Dos', NOMEMPRESA: 'E', COSTO: 'CRT', PR22_VALOR: 0, SISU_CORREO: 'b@x.co' }
];

function crear(consultaHistorialProductividad: ReturnType<typeof vi.fn>) {
  TestBed.configureTestingModule({
    imports: [HistorialProductividadComponent],
    providers: [{ provide: InfoGeneralesService, useValue: { consultaHistorialProductividad } }, estadoParametros()]
  });
  const fixture = TestBed.createComponent(HistorialProductividadComponent);
  fixture.detectChanges();
  return fixture;
}

// Legacy informes/HistorialProductividad.vue formatearNumero: blank for 0/null/NaN, otherwise toFixed(5).
describe('HistorialProductividadComponent (504)', () => {
  it('formats VALOR like the legacy formatearNumero', () => {
    expect(formatearNumero(1.5)).toBe('1.50000');
    expect(formatearNumero(0.123456789)).toBe('0.12346');
    expect(formatearNumero('2.1')).toBe('2.10000');
    expect(formatearNumero(0)).toBe('');
    expect(formatearNumero(null)).toBe('');
    expect(formatearNumero('abc')).toBe('');
  });

  it('queries once on entry, keeps the raw value in the row and shows the formatted cell', () => {
    const consulta = vi.fn(() => of({ status: 'ok', data: filas, message: '' }));
    const fixture = crear(consulta);

    expect(consulta).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.rows()[0]['PR22_VALOR']).toBe(1.5);
    expect(fixture.nativeElement.textContent).toContain('1.50000');
  });

  it('shows the error instead of an empty grid when the query fails', () => {
    const consulta = vi.fn(() => throwError(() => ({ status: 500, error: { message: 'Fallo Oracle' } })));
    const fixture = crear(consulta);

    expect(fixture.componentInstance.rows()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('Fallo Oracle');
  });
});
