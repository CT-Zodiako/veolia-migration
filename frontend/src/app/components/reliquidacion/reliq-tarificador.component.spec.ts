import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ReliqTarificadorComponent } from './reliq-tarificador.component';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ReliqTarificadorService } from '../../services/reliquidacion/reliq-tarificador.service';

const filaEmpresa = { empr_empr: { nomempr: 'Veolia' }, divi_divi: { nommpio: 'Medellin' }, iaed_anno: 2024, iaed_mes: 1, cambios: [] };

function resumenCon(filas: unknown[]) {
  return of({ status: 'ok', message: 'OK', data: { resumen: { filas } } });
}

function setup(estado: string, puedeAprobar: boolean) {
  const tarificador = {
    // One resumen fails, another comes back empty (resumen: null, as the backend now answers).
    resumenUsuarios: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 500 }))),
    resumenEmpresa: vi.fn(() => resumenCon([filaEmpresa])),
    resumenAdicional: vi.fn(() => of({ status: 'ok', message: 'OK', data: { resumen: null } })),
    resumenRelleno: vi.fn(() => resumenCon([])),
    resumenAps: vi.fn(() => resumenCon([])),
    estadoReliquidacion: vi.fn(() => of({ status: 'ok', message: 'OK', data: { ok: true, estado, puedeAprobar } })),
    aprobarReliquidacion: vi.fn()
  };

  TestBed.configureTestingModule({
    imports: [ReliqTarificadorComponent],
    providers: [
      { provide: ReliquidacionService, useValue: { getReliquidaciones: () => of({ data: [] }) } },
      { provide: ReliqTarificadorService, useValue: tarificador }
    ]
  });

  const fixture = TestBed.createComponent(ReliqTarificadorComponent);
  return { fixture, component: fixture.componentInstance, tarificador };
}

describe('ReliqTarificadorComponent', () => {
  // jsdom has no ResizeObserver; PrimeNG frozen columns need one when the tables render.
  beforeAll(() => {
    if (!('ResizeObserver' in globalThis)) {
      (globalThis as Record<string, unknown>)['ResizeObserver'] = class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
    }
  });

  it('loads estado and the remaining tabs when one resumen fails or is empty (R2)', () => {
    const { fixture, component } = setup('1', true);

    component.selectedReliq.set(7);
    component.consultar();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.estado()).toEqual({ ok: true, estado: '1', puedeAprobar: true });
    expect(component.estadoTexto()).toBe('Creada');
    expect(component.filasUsuarios()).toEqual([]);
    expect(component.filasAdicional()).toEqual([]);
    expect(component.filasEmpresa()).toHaveLength(1);
    expect(component.filasEmpresa()[0]['nomempr']).toBe('Veolia');
    expect(fixture.nativeElement.querySelector('p-button[label="Aprobar"]')).not.toBeNull();
  });

  it('hides Aprobar when the backend reports the reliquidación as Aplicada', () => {
    const { fixture, component } = setup('2', false);

    component.selectedReliq.set(7);
    component.consultar();
    fixture.detectChanges();

    expect(component.estadoTexto()).toBe('Aplicada');
    expect(fixture.nativeElement.querySelector('p-button[label="Aprobar"]')).toBeNull();
  });
});
