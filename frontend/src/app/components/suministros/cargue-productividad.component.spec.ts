import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CargueProductividadComponent } from './cargue-productividad.component';
import { SuministrosService } from '../../services/suministros.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { NotificationService } from '../../services/notification.service';

const PROPIO = {
  'COD APS': 1033, APS: 'SAN PEDRO', 'COD EMPRESA': 1002, EMPRESA: 'VEOLIA', ANNO: 2025, MES: 12,
  CCS: 1, CBLS: 2, CLUS: 3, CRT: 4, CDF: 5, CTL: 6
};

type CargueResponse = { data: { propios: unknown[]; terceros: unknown[] } };

function setup(propios: unknown[] = [PROPIO], terceros: unknown[] = [], cargue?: (anno: number, mes: number) => Observable<CargueResponse>) {
  const service = {
    cargueProductividad: vi.fn(cargue ?? ((_anno: number, _mes: number) => of({ data: { propios, terceros } }))),
    guardarProductividad: vi.fn((_propios: unknown, _terceros: unknown): Observable<unknown> => of({ data: 'Guardado productividad correctamente' }))
  };
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  TestBed.configureTestingModule({
    imports: [CargueProductividadComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      // Preselected period January 2026 (saved by the user in the shared selectors).
      { provide: ParametrosConsultaStateService, useValue: { getAnno: () => 2026, getMes: () => 1 } },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } },
      { provide: NotificationService, useValue: notification }
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
  fixture.detectChanges();
  return { fixture, component, service, add, notification };
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
  it('loads the previous month on init and shows the Propios / Terceros tabs', () => {
    const { fixture, component, service } = setup();
    fixture.detectChanges();

    expect(service.cargueProductividad).toHaveBeenCalledTimes(1);
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
    fixture.detectChanges();

    component.confirmarGuardar();

    expect(service.guardarProductividad).toHaveBeenCalledWith([{
      COD_APS: 1033, APS: 'SAN PEDRO', COD_EMPRESA: 1002, EMPRESA: 'VEOLIA', ANNO: 2025, MES: 12, CCS: 1, CBLS: 2, CLUS: 3, CRT: 4, CDF: 5, CTL: 6
    }], []);
  });

  // Legacy CargueProductividad.vue:94-100 (activacionGuardar): Guardar disabled while both tabs are empty.
  it('disables Guardar when both tabs are empty', () => {
    const { fixture } = setup([], []);
    fixture.detectChanges();

    const guardar = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Guardar'));
    expect(guardar?.disabled).toBe(true);
  });

  // Legacy service/CargueProductividad.js:16-27 and :46-57 toast "Consulta realizada correctamente" and
  // "Cargue Productividad guardado correctamente".
  it('shows the legacy success toasts "Consulta realizada correctamente" / "Cargue Productividad guardado correctamente"', () => {
    const { fixture, component, add } = setup();

    fixture.detectChanges();
    component.confirmarGuardar();

    expect(add.mock.calls.map(([m]) => m.summary ?? m.detail)).toEqual(['Consulta realizada correctamente', 'Cargue Productividad guardado correctamente']);
  });

  // S5: the data loads when the selector changes, without pressing Cargar.
  it('reloads the previous month whenever año or mes changes', () => {
    const { fixture, component, service } = setup();

    component.onMesChange(3);
    component.onAnnoChange(2025);
    fixture.detectChanges();

    expect(service.cargueProductividad.mock.calls).toEqual([[2025, 12], [2026, 2], [2025, 2]]);
  });

  it('does not reload when the selector emits the same value or a cleared one', () => {
    const { component, service } = setup();

    component.onAnnoChange(2026);
    component.onMesChange(1);
    component.onMesChange(null);

    expect(service.cargueProductividad).toHaveBeenCalledTimes(1);
    expect(component.mes()).toBeNull();
  });

  it('has no Cargar button', () => {
    const { fixture } = setup();

    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labels.some((l) => l?.includes('Cargar'))).toBe(false);
  });

  // httpErrorInterceptor already toasts every failed request and rethrows new Error(message):
  // the page must not add a second toast on top of it (L4).
  it('clears the tabs and leaves the toast to the HTTP interceptor when the load fails', () => {
    let fail = false;
    const { fixture, component, add, notification } = setup([PROPIO], [], () => fail
      ? throwError(() => new Error('Error al cargar la productividad'))
      : of({ data: { propios: [PROPIO], terceros: [PROPIO] } }));
    fixture.detectChanges();
    expect(component.cargado()).toBe(true);
    add.mockClear();

    fail = true;
    component.onMesChange(2);
    fixture.detectChanges();

    expect(component.propios()).toEqual([]);
    expect(component.terceros()).toEqual([]);
    expect(component.cargado()).toBe(false);
    expect(component.cargando()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('p-tab').length).toBe(0);
    expect(add).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('adds no toast when the load fails on init', () => {
    const { component, add, notification } = setup([], [], () => throwError(() => new Error('Error al cargar la productividad')));

    expect(component.cargado()).toBe(false);
    expect(component.cargando()).toBe(false);
    expect(add).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('leaves the toast of a failed save to the HTTP interceptor', () => {
    const { fixture, component, service, add, notification } = setup();
    fixture.detectChanges();
    add.mockClear();
    service.guardarProductividad.mockReturnValue(throwError(() => new Error('No fue posible guardar.')));

    component.confirmarGuardar();

    expect(component.guardando()).toBe(false);
    expect(add).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalled();
  });

  it.each([
    ['mes', (c: CargueProductividadComponent) => c.onMesChange(null)],
    ['año', (c: CargueProductividadComponent) => c.onAnnoChange(null)]
  ] as const)('cancels the in-flight load and clears the tabs when %s is cleared', (_campo, limpiar) => {
    const pending: Subject<CargueResponse>[] = [];
    const { fixture, component, service } = setup([], [], () => {
      const subject = new Subject<CargueResponse>();
      pending.push(subject);
      return subject;
    });
    pending[0].next({ data: { propios: [PROPIO], terceros: [PROPIO] } });
    component.onMesChange(3);
    expect(component.cargando()).toBe(true);

    limpiar(component);
    fixture.detectChanges();

    expect(pending[1].observed).toBe(false);
    pending[1].next({ data: { propios: [{ ...PROPIO, MES: 2 }], terceros: [] } });
    expect(component.propios()).toEqual([]);
    expect(component.terceros()).toEqual([]);
    expect(component.cargado()).toBe(false);
    expect(component.cargando()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('p-tab').length).toBe(0);
    expect(service.cargueProductividad).toHaveBeenCalledTimes(2);
  });

  it('clears the previous period immediately while the new one loads, so it cannot be saved', () => {
    const pending: Subject<CargueResponse>[] = [];
    const { fixture, component } = setup([], [], () => {
      const subject = new Subject<CargueResponse>();
      pending.push(subject);
      return subject;
    });
    pending[0].next({ data: { propios: [PROPIO], terceros: [PROPIO] } });
    fixture.detectChanges();
    expect(component.cargado()).toBe(true);

    component.onMesChange(3);
    fixture.detectChanges();

    expect(component.cargando()).toBe(true);
    expect(component.propios()).toEqual([]);
    expect(component.terceros()).toEqual([]);
    expect(component.cargado()).toBe(false);
    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labels.some((l) => l?.includes('Guardar'))).toBe(false);
  });

  it('ignores the response of a previous period when the selector changes quickly', () => {
    const pending = new Map<string, Subject<CargueResponse>>();
    const { fixture, component, add } = setup([], [], (anno, mes) => {
      const subject = new Subject<CargueResponse>();
      pending.set(`${anno}-${mes}`, subject);
      return subject;
    });

    component.onMesChange(3);
    pending.get('2026-2')!.next({ data: { propios: [{ ...PROPIO, MES: 2 }], terceros: [] } });
    pending.get('2025-12')!.next({ data: { propios: [PROPIO], terceros: [] } });
    fixture.detectChanges();

    expect(component.propios()).toEqual([{ ...PROPIO, MES: 2 }]);
    expect(component.cargando()).toBe(false);
    expect(add).toHaveBeenCalledTimes(1);
  });
});
