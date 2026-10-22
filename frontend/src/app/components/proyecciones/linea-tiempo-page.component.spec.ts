import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { LineaTiempoPageComponent } from './linea-tiempo-page.component';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';
import { LineaTiempoRow, Proyeccion } from '../../models/proyecciones.models';

// Legacy screen: front-tarificador/src/views/proyecciones/LineasTiempo.vue ("LINEAS DE TIEMPO", 902) =
// components/proyecciones/seleccionarProyeccion.vue + editarLineadeTiempo.vue, saving through ProyService.newLineasdeTiempo
// (POST proyecciones/registrarlineatiempo {datatable, isnew}).

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const PROYECCION: Proyeccion = {
  proyId: 8, apsaId: 3, proyNombre: 'Base', proyDescripcion: 'Escenario', proyTipo100: 1,
  proyAnnoDes: 2025, proyMesDes: 11, proyAnnoHas: 2026, proyMesHas: 2, proyEstado: 1
};
const FILA = (mes: number, deltestado = 0): LineaTiempoRow => ({
  proyId: 8, apsaId: 3, anno: 2025, mes, deltipc: 1.2345678, deltipcc: 2, deltsmlv: 3, deltioexp: 4, deltfacproduc: 5,
  deltindipcc: 6, deltipccs: 7, deltestado
});

function crear(existentes: LineaTiempoRow[], aps = 3, guardado = { status: true, message: 'Línea de tiempo guardada correctamente.' }) {
  localStorage.clear();
  const service = {
    // The proyección selector keeps the selection only while the proyección is in the APS list.
    consulta: vi.fn(() => of({ status: true, data: [{ ...PROYECCION, apsaId: aps }], message: 'OK' })),
    lineaTiempoByProyId: vi.fn(() => of({ status: true, data: existentes, message: 'OK' })),
    registrarLineaTiempo: vi.fn(() => of({ status: guardado.status, data: { success: guardado.status }, message: guardado.message }))
  };
  TestBed.configureTestingModule({
    imports: [LineaTiempoPageComponent],
    providers: [
      { provide: ProyeccionesService, useValue: service },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: { getAps: vi.fn(() => null), setAps: vi.fn(), getProyeccion: vi.fn(() => null), setProyeccion: vi.fn(), getAnno: vi.fn(() => null), getMes: vi.fn(() => null), setAnno: vi.fn(), setMes: vi.fn() }
      }
    ]
  });
  const fixture = TestBed.createComponent(LineaTiempoPageComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  const add = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add');
  component.onApsChange(aps);
  component.onProyeccionChange({ ...PROYECCION, apsaId: aps });
  component.onProyChange(8);
  fixture.detectChanges();
  return { fixture, component, service, add };
}

describe('LineaTiempoPageComponent (902 Líneas de tiempo, legacy editarLineadeTiempo.vue)', () => {
  // editarLineadeTiempo.vue:220-228: an existing timeline (getProybyId -> consultabyid) is edited (isnew = false).
  it('loads an existing timeline for edition', () => {
    const { component, service } = crear([FILA(11), FILA(12)]);

    expect(service.lineaTiempoByProyId).toHaveBeenCalledWith(8);
    expect(component.isNew()).toBe(false);
    expect(component.rows()).toEqual([FILA(11), FILA(12)]);
  });

  // editarLineadeTiempo.vue:229-232 + seleccionarProyeccion.vue:150-161: without saved rows the grid starts from the generated
  // horizon (first row = Desde, PROYID/APS of the proyección) and the save is an insert (isnew = true).
  it('starts a new timeline from the Desde period of the proyección', () => {
    const { component } = crear([]);

    expect(component.isNew()).toBe(true);
    expect(component.rows()[0]).toEqual(expect.objectContaining({ proyId: 8, apsaId: 3, anno: 2025, mes: 11, deltestado: 0 }));
  });

  // seleccionarProyeccion.vue:64-79,150-160: every generated row carries DELTIPC..DELTIPCCS = 0 (dataRow defaults).
  it('legacy generated timeline rows start with DELTIPC, DELTIPCC, DELTSMLV, DELTIOEXP, DELTFACPRODUC, DELTINDIPCC, DELTIPCCS = 0 (seleccionarProyeccion.vue:64-79)', () => {
    const { component } = crear([]);

    for (const row of component.rows()) {
      expect(row).toEqual(expect.objectContaining({ deltipc: 0, deltipcc: 0, deltsmlv: 0, deltioexp: 0, deltfacproduc: 0, deltindipcc: 0, deltipccs: 0 }));
    }
  });

  // seleccionarProyeccion.vue:150-160: the generation loop runs while year <= PROYANNOHAS and its break never fires
  // (tempMes is reset to 1 before comparing with PROYMESHAS), so legacy emits every month up to December of the Hasta year.
  // Accepted deviation: legacy-characterization-tests S8/S9 (legacy bug "timeline generated to December" not replicated):
  // the new timeline stops at the Hasta month (Nov 2025..Feb 2026 = 4 rows).
  it('generates the new timeline from Desde up to the Hasta month', () => {
    const { component } = crear([]);

    const periodos = component.rows().map((r) => `${r.anno}-${r.mes}`);
    expect(periodos).toEqual(['2025-11', '2025-12', '2026-1', '2026-2']);
  });

  // editarLineadeTiempo.vue:198-211 + ProyService.js:150-170: Guardar posts the whole grid with the isnew flag and reloads.
  it('saves the whole grid with the isNew flag and reloads', () => {
    const { component, service } = crear([FILA(11), FILA(12)]);

    component.guardar();

    expect(service.registrarLineaTiempo).toHaveBeenCalledWith({ proyId: 8, apsaId: 3, isNew: false, rows: [FILA(11), FILA(12)] });
    expect(service.lineaTiempoByProyId).toHaveBeenCalledTimes(2);
  });

  // parity-review S11 "P4 Líneas de tiempo bloqueadas": a row with DELTESTADO = 1 (already used by an executed proyección)
  // cannot be edited; the others can.
  it('blocks the edition of rows already used by an executed proyección', () => {
    const { component } = crear([FILA(11, 1), FILA(12, 0)]);

    component.iniciarEdicionFila(FILA(11, 1) as unknown as Record<string, unknown>);
    expect(component.editingKey()).toBeNull();
    component.iniciarEdicionFila(FILA(12, 0) as unknown as Record<string, unknown>);
    expect(component.editingKey()).toBe('2025-12');
  });

  // ProyService.js:158-177: toasts "Guardado Correctamente" on success and "Error al Guardar" on failure.
  it('legacy save toasts are "Guardado Correctamente" / "Error al Guardar" (ProyService.js:158-177)', () => {
    const ok = crear([FILA(11)]);
    ok.component.guardar();
    expect(ok.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Guardado Correctamente' }));

    TestBed.resetTestingModule();
    const ko = crear([FILA(11)], 3, { status: false, message: 'Error al guardar línea de tiempo: x' });
    ko.component.guardar();
    expect(ko.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Error al Guardar' }));
  });

  // editarLineadeTiempo.vue:23-158: columns AÑO, MES, IPC, IPCC, SMLV, IOEXP, FACT PROD, IND IPCC and IPC TCL only when the
  // APS is 1034 (:138-145).
  it('legacy timeline headers are AÑO/MES/IPC/IPCC/SMLV/IOEXP/FACT PROD/IND IPCC and IPC TCL appears only for APS 1034 (editarLineadeTiempo.vue:23-158)', () => {
    const otra = crear([FILA(11)], 3);
    expect(otra.component.columnas.map((c) => c.header)).toEqual(['AÑO', 'MES', 'IPC', 'IPCC', 'SMLV', 'IOEXP', 'FACT PROD', 'IND IPCC']);

    TestBed.resetTestingModule();
    const tunja = crear([FILA(11)], 1034);
    expect(tunja.component.columnas.map((c) => c.header)).toEqual(['AÑO', 'MES', 'IPC', 'IPCC', 'SMLV', 'IOEXP', 'FACT PROD', 'IND IPCC', 'IPC TCL']);
  });

  // editarLineadeTiempo.vue:4-15,237-243: values shown with toFixed(5) (0 stays 0); 24 rows per page with [24].
  it('legacy timeline shows values with toFixed(5) and pages 24 rows with [24] (editarLineadeTiempo.vue:4-15,237-243)', () => {
    const { fixture } = crear([FILA(11)]);

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.filasPorPagina).toBe(24);
    expect(tabla.rowsPerPageOptionsList).toEqual([24]);
    const celdas = Array.from((fixture.nativeElement.querySelector('app-tabla-avanzada') as HTMLElement).querySelectorAll('tbody td'))
      .map((td) => td.textContent?.trim());
    expect(celdas.slice(0, 4)).toEqual(['2025', '11', (1.2345678).toFixed(5), (2).toFixed(5)]);
  });
});
