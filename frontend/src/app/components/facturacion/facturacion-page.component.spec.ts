import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';
import { of, throwError } from 'rxjs';
import { FacturacionPageComponent } from './facturacion-page.component';
import { FacturacionService } from '../../services/facturacion.service';
import { AuthService } from '../../services/auth.service';
import { estadoParametros } from '../infogerenciales/informes-gerenciales.spec-helpers';

// First render compiles PrimeNG tabs + several tabla-avanzada grids; slow under a loaded jsdom run.
const RENDER_TIMEOUT_MS = 30000;

// C2: a failed query must be visible (the error signal was set but never rendered).
describe('FacturacionPageComponent (502)', () => {
  it('renders the backend error message when the visible tab fails', () => {
    const facturacion = vi.fn(() => throwError(() => new Error('No fue posible consultar facturación.')));
    TestBed.configureTestingModule({
      imports: [FacturacionPageComponent],
      providers: [
        { provide: FacturacionService, useValue: { facturacion } },
        { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of([])) } },
        estadoParametros()
      ]
    });
    const fixture = TestBed.createComponent(FacturacionPageComponent);
    const component = fixture.componentInstance;
    component.aps = 7;
    component.anno = 2025;
    component.mes = 3;
    fixture.detectChanges();

    component.consultar();
    fixture.detectChanges();

    expect(facturacion).toHaveBeenCalledWith({ aps: 7, mes: 3, anno: 2025 });
    expect(component.error()).toBe('No fue posible consultar facturación.');
    expect(fixture.nativeElement.querySelector('.error-message')?.textContent).toContain('No fue posible consultar facturación.');
  }, RENDER_TIMEOUT_MS);

  // C2: legacy Facturación grids offered 10/20/100/200 rows per page.
  it('uses the legacy paginator options 10/20/100/200', () => {
    TestBed.configureTestingModule({
      imports: [FacturacionPageComponent],
      providers: [
        { provide: FacturacionService, useValue: { facturacion: vi.fn(() => of({ periodo: null, filas: [] })) } },
        { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of([])) } },
        estadoParametros()
      ]
    });
    const fixture = TestBed.createComponent(FacturacionPageComponent);
    fixture.detectChanges();

    const tablas = fixture.debugElement.queryAll(By.directive(TablaAvanzadaComponent));
    expect(tablas.length).toBeGreaterThan(0);
    for (const tabla of tablas) {
      expect((tabla.componentInstance as TablaAvanzadaComponent).rowsPerPageOptionsList).toEqual([10, 20, 100, 200]);
    }
  }, RENDER_TIMEOUT_MS);
});
