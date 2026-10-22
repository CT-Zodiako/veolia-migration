import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { InformesGeneradosComponent } from './informes-generados.component';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';

const okResult = {
  ok: true, message: 'Carga comercial completada correctamente', count: 1, inserted: 10, deleted: 0,
  periods: [{ aps: 7, anno: 2024, mes: 4 }],
  files: [{ monthFolder: null, fileName: 'Salamina-SUI Abril 2024', sheetTitle: 'sui-facturacion', rows: 10, warning: null }]
};

function setup(overrides: Record<string, unknown> = {}) {
  const service = {
    tcfgAps: vi.fn(() => of({ status: 200, data: [{ TCFG_APS_ID: 7, NOMBRE_APS: 'Salamina' }] })),
    cargueFacturacion: vi.fn(() => of({ status: 200, data: okResult })),
    ...overrides
  };
  TestBed.configureTestingModule({
    imports: [InformesGeneradosComponent],
    providers: [{ provide: Sui853ConfiguracionService, useValue: service }]
  });
  const fixture = TestBed.createComponent(InformesGeneradosComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

describe('InformesGeneradosComponent (30005 Cargue Facturación)', () => {
  it('does not ask for a month and loads the whole year', () => {
    const { fixture, component, service } = setup();
    expect(component.withMonth).toBe(false);
    component.selectedApsId = 7;
    expect(component.canLoad).toBe(false);
    component.selectedYear = 2024;
    expect(component.canLoad).toBe(true);
    component.load();
    fixture.detectChanges();

    expect(service.cargueFacturacion).toHaveBeenCalledWith(7, 2024, null);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Archivos procesados: 1');
    expect((fixture.nativeElement as HTMLElement).querySelector('#drive-load-month')).toBeNull();
  });

  it('shows the missing-company rejection from the server', () => {
    const message = "La APS 'Salamina' no tiene una empresa asociada en SUI.VCFGAPSEMPRESA; no se puede cargar la facturación.";
    const { component } = setup({
      cargueFacturacion: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 400, error: { status: 400, data: { ok: false, type: 'INVALID_PARAMS', message } } })))
    });
    component.selectedApsId = 7;
    component.selectedYear = 2024;
    component.load();
    expect(component.error).toBe(message);
    expect(component.errorDetail?.type).toBe('INVALID_PARAMS');
    expect(component.showErrorDialog).toBe(true);
  });
});
