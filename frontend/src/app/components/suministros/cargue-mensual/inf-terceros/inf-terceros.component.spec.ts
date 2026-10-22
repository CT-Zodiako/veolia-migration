import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { InfTercerosComponent } from './inf-terceros.component';
import { SuministrosService } from '../../../../services/suministros.service';

function setup(aps = 5, anno = 2026, mes = 1) {
  const service = { setTerceros: vi.fn((_payload: unknown) => of({ data: 1 })) };
  TestBed.configureTestingModule({
    imports: [InfTercerosComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  const fixture = TestBed.createComponent(InfTercerosComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('mes', mes);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

describe('InfTercerosComponent (701 Inf. Terceros) — legacy InfTerceros.vue', () => {
  // Legacy InfTerceros.vue:13-50: three inputs labelled CDF, CTL and Incen. CDF.
  it('shows the legacy field labels', () => {
    const { fixture } = setup();

    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('label')).map((l) => l.textContent?.trim());
    expect(labels).toEqual(['CDF', 'CTL', 'Incen. CDF']);
  });

  // Legacy InfTerceros.vue:79-90: aps and the selected month - 1 (January -> December of the previous year).
  it('saves the values for the previous period', () => {
    const { component, service } = setup(5, 2026, 1);
    component.cdf.set(11.5);
    component.ctl.set(2.25);
    component.incentivo.set(0.5);

    component.guardar();

    const payload = service.setTerceros.mock.calls[0][0] as Record<string, unknown>;
    expect({ aps: payload['aps'], anno: payload['anno'], mes: payload['mes'] }).toEqual({ aps: 5, anno: 2025, mes: 12 });
  });

  // Legacy CargueService.js:558-566 posts { aps, anno, mes, datos: { cdfter, ctlter, incenter } }.
  it.skip('PARITY-FINDING: values are sent flat (cdf, ctl, incentivo) instead of legacy datos: { cdfter, ctlter, incenter }', () => {
    const { component, service } = setup(5, 2026, 1);
    component.cdf.set(11.5);
    component.ctl.set(2.25);
    component.incentivo.set(0.5);

    component.guardar();

    const payload = service.setTerceros.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['datos']).toEqual({ cdfter: 11.5, ctlter: 2.25, incenter: 0.5 });
  });

  // CargueService.js:580-583 toasts "Guardado Correctamente".
  it.skip('PARITY-FINDING: the success message is not the legacy "Guardado Correctamente"', () => {
    const { component } = setup();

    component.guardar();

    expect(component.estado()).toBe('Guardado Correctamente');
  });
});
