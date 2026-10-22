import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CargueProductividadComponent } from './cargue-productividad.component';
import { SuministrosService } from '../../services/suministros.service';

const PROPIO = {
  'COD APS': 1033, APS: 'SAN PEDRO', 'COD EMPRESA': 1002, EMPRESA: 'VEOLIA', ANNO: 2025, MES: 12,
  CCS: 1, CBLS: 2, CLUS: 3, CRT: 4, CDF: 5, CTL: 6
};

function setup(propios: unknown[] = [PROPIO], terceros: unknown[] = []) {
  const service = {
    cargueProductividad: vi.fn(() => of({ data: { propios, terceros } })),
    guardarProductividad: vi.fn((_propios: unknown, _terceros: unknown) => of({ data: 'Guardado productividad correctamente' }))
  };
  TestBed.configureTestingModule({
    imports: [CargueProductividadComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  // Year/month selectors and the pivot grid are out of scope: render them as plain elements.
  TestBed.overrideComponent(CargueProductividadComponent, {
    set: { imports: [CommonModule, FormsModule, ToastModule, ...CommonPrimeNgModules], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(CargueProductividadComponent);
  const component = fixture.componentInstance;
  const messages = fixture.debugElement.injector.get(MessageService);
  const add = vi.spyOn(messages, 'add');
  component.onAnnoChange(2026);
  component.onMesChange(1);
  fixture.detectChanges();
  return { fixture, component, service, add };
}

describe('CargueProductividadComponent (311) — legacy CargueProductividad.vue', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  afterAll(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  // Legacy CargueProductividad.vue:68-82: { anno, mes } of the selected month - 1 (January -> December of the previous year).
  it('loads the previous month and shows the Propios / Terceros tabs', () => {
    const { fixture, component, service } = setup();

    component.cargar();
    fixture.detectChanges();

    expect(service.cargueProductividad).toHaveBeenCalledWith(2025, 12);
    const tabs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('p-tab')).map((t) => t.textContent?.trim());
    expect(tabs).toEqual(['Propios', 'Terceros']);
    expect(component.propios()).toEqual([PROPIO]);
  });

  // Legacy components/suministros/Propios.vue:29-41 columnDefsInit (colmOper 1 = groupable).
  it('uses the legacy pivot columns', () => {
    const { component } = setup();

    expect(component.columnas.map((c) => [c.field, c.headerName, c.agrupable])).toEqual([
      ['COD APS', 'COD APS', true], ['APS', 'APS', true], ['COD EMPRESA', 'COD EMPRESA', true], ['EMPRESA', 'EMPRESA', true],
      ['ANNO', 'ANO', true], ['MES', 'MES', true], ['CCS', 'CCS', false], ['CBLS', 'CBLS', false], ['CLUS', 'CLUS', false],
      ['CRT', 'CRT', false], ['CDF', 'CDF', false], ['CTL', 'CTL', false]
    ]);
  });

  // Legacy CargueProductividad.vue:84-91 + :123-132 (espaciosLlaves): keys with spaces become underscores (COD_APS, COD_EMPRESA).
  it('saves both tabs replacing spaces in the keys with underscores', () => {
    const { fixture, component, service } = setup();
    component.cargar();
    fixture.detectChanges();

    component.confirmarGuardar();

    expect(service.guardarProductividad).toHaveBeenCalledWith([{
      COD_APS: 1033, APS: 'SAN PEDRO', COD_EMPRESA: 1002, EMPRESA: 'VEOLIA', ANNO: 2025, MES: 12, CCS: 1, CBLS: 2, CLUS: 3, CRT: 4, CDF: 5, CTL: 6
    }], []);
  });

  // Legacy CargueProductividad.vue:94-100 (activacionGuardar): Guardar disabled while both tabs are empty.
  it('disables Guardar when both tabs are empty', () => {
    const { fixture, component } = setup([], []);
    component.cargar();
    fixture.detectChanges();

    const guardar = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Guardar'));
    expect(guardar?.disabled).toBe(true);
  });

  // Legacy service/CargueProductividad.js:16-27 and :46-57 toast "Consulta realizada correctamente" and
  // "Cargue Productividad guardado correctamente".
  it('shows the legacy success toasts "Consulta realizada correctamente" / "Cargue Productividad guardado correctamente"', () => {
    const { fixture, component, add } = setup();

    component.cargar();
    fixture.detectChanges();
    component.confirmarGuardar();

    expect(add.mock.calls.map(([m]) => m.summary ?? m.detail)).toEqual(['Consulta realizada correctamente', 'Cargue Productividad guardado correctamente']);
  });
});
