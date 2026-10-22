import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InformesGeneradosMesComponent } from './informes-generados-mes.component';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';

function setup() {
  const service = {
    tcfgAps: vi.fn(() => of({ status: 200, data: [{ TCFG_APS_ID: 7, NOMBRE_APS: 'Salamina' }] })),
    cargueFacturacion: vi.fn(() => of({ status: 200, data: { ok: true, message: 'ok', count: 1, inserted: 3, deleted: 3, periods: [], files: [] } }))
  };
  TestBed.configureTestingModule({
    imports: [InformesGeneradosMesComponent],
    providers: [{ provide: Sui853ConfiguracionService, useValue: service }]
  });
  const fixture = TestBed.createComponent(InformesGeneradosMesComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

describe('InformesGeneradosMesComponent (30007 Cargue Facturación Mes)', () => {
  it('offers the legacy Spanish month names', () => {
    const { component } = setup();
    expect(component.withMonth).toBe(true);
    expect(component.months.map(m => m.value)).toEqual([
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]);
  });

  it('requires the month and forwards it to the load (legacy ignored it)', () => {
    const { fixture, component, service } = setup();
    component.selectedApsId = 7;
    component.selectedYear = 2024;
    expect(component.canLoad).toBe(false);
    component.load();
    expect(service.cargueFacturacion).not.toHaveBeenCalled();

    component.selectedMonth = 'Abril';
    expect(component.canLoad).toBe(true);
    component.load();
    fixture.detectChanges();

    expect(service.cargueFacturacion).toHaveBeenCalledWith(7, 2024, 'Abril');
    expect((fixture.nativeElement as HTMLElement).querySelector('#drive-load-month')).not.toBeNull();
  });
});
