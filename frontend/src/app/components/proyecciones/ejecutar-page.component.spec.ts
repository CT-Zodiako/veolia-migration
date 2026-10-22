import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { EjecutarPageComponent } from './ejecutar-page.component';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';

// Legacy screen: front-tarificador/src/views/proyecciones/Proyectar.vue ("PROYECTAR", 904): seleccionarProyeccion,
// button EJECUTAR (ProyService.ejecutarproyectar), tabs "Lineas de Tiempo" (components/proyecciones/ConsultarLineasdeTiempo.vue)
// and "Variables" (CrecimientoUsuarios / CrecimientoInfPropia / CrecimientoInfTercero / CrecimientoDescuentosCostos.vue).

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const LINEA = { proyId: 8, apsaId: 3, anno: 2025, mes: 4, deltipc: 1.2345678, deltipcc: 2, deltsmlv: 3, deltioexp: 4, deltfacproduc: 5, deltindipcc: 6, deltipccs: 7, deltestado: 0 };
const USUARIO = { codAps: 3, anno: 2025, semestre: 1, coduso: 1, nomclaseuso: 'Estrato 1', codfactor: 2, valorfactor: 0.5, codtipopred: 1, nomtipopred: 'Residencial', cantidad: 10, toneladas: 1.5 };

function crear(resultado = 1) {
  localStorage.clear();
  const service = {
    // The proyección selector keeps the selection only while the proyección is in the APS list.
    consulta: vi.fn(() => of({ status: true, data: [{ proyId: 8, apsaId: 3, proyNombre: 'Base', proyTipo100: 1, proyAnnoDes: 2025, proyMesDes: 1, proyAnnoHas: 2025, proyMesHas: 12, proyEstado: 1 }], message: 'OK' })),
    lineaTiempoByProyId: vi.fn(() => of({ status: true, data: [LINEA], message: 'OK' })),
    consultarCrecimiento: vi.fn(() => of({ status: true, data: { usuarios: [USUARIO], propia: [], terceros: [], descuentos: [] }, message: 'OK' })),
    ejecutarProyectar: vi.fn(() => of({
      status: resultado === 1,
      data: { success: resultado === 1, resultado },
      message: resultado === 1 ? 'Proceso ejecutado correctamente.' : 'Ejecución finalizada con observaciones.'
    }))
  };
  TestBed.configureTestingModule({
    imports: [EjecutarPageComponent],
    providers: [
      { provide: ProyeccionesService, useValue: service },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: { getAps: vi.fn(() => null), setAps: vi.fn(), getProyeccion: vi.fn(() => null), setProyeccion: vi.fn(), getAnno: vi.fn(() => null), getMes: vi.fn(() => null), setAnno: vi.fn(), setMes: vi.fn() }
      }
    ]
  });
  const fixture = TestBed.createComponent(EjecutarPageComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  const add = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add');
  component.onApsChange(3);
  component.onProyChange(8);
  fixture.detectChanges();
  return { fixture, component, service, add };
}

function tablas(fixture: ReturnType<typeof crear>['fixture']): TablaAvanzadaComponent[] {
  return fixture.debugElement.queryAll(By.directive(TablaAvanzadaComponent)).map((d) => d.componentInstance as TablaAvanzadaComponent);
}

describe('EjecutarPageComponent (904 Proyectar, legacy Proyectar.vue)', () => {
  // Proyectar.vue:108-160 + ConsultarLineasdeTiempo.vue:103-113: choosing the proyección loads its timeline and its four
  // variable sets (usuarios, info propia, info tercero, descuentos costo).
  it('loads the timeline and the growth variables of the selected proyección', () => {
    const { component, service } = crear();

    expect(service.lineaTiempoByProyId).toHaveBeenCalledWith(8);
    expect(service.consultarCrecimiento).toHaveBeenCalledWith(3, 8);
    expect(component.lineaTiempoRows()).toEqual([LINEA]);
    expect(component.usuarios()).toEqual([USUARIO]);
  });

  // Proyectar.vue:92-102 + ProyService.js:529-562: EJECUTAR posts proy_id + apsa_id; success only when res === 1.
  it('executes the proyección and reports success only when the function answers 1', () => {
    const ok = crear(1);
    ok.component.ejecutar();
    expect(ok.service.ejecutarProyectar).toHaveBeenCalledWith(3, 8);
    expect(ok.component.resultadoExito()).toBe(true);
    expect(ok.component.ejecutando()).toBe(false);

    TestBed.resetTestingModule();
    const ko = crear(0);
    ko.component.ejecutar();
    expect(ko.component.resultadoExito()).toBe(false);
  });

  // ProyService.js:547-558: success toast "Proceso ejecutado correctamente" (severity success); otherwise an error toast
  // "<res> Error al ejecutar la proyeccion ".
  it('legacy toasts "Proceso ejecutado correctamente" (success) or "<res> Error al ejecutar la proyeccion " (error) (ProyService.js:547-558)', () => {
    const ok = crear(1);
    ok.component.ejecutar();
    expect(ok.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Proceso ejecutado correctamente' }));

    TestBed.resetTestingModule();
    const ko = crear(0);
    ko.component.ejecutar();
    expect(ko.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: '0 Error al ejecutar la proyeccion ' }));
  });

  // ConsultarLineasdeTiempo.vue:4-79,117-119: columns AÑO, MES, IPC, IPCC, SMLV, IOEXP, FACT PROD, IND IPCC (no IPC TCL),
  // values rounded to 5 decimals, 24 rows per page with [24].
  it('legacy Proyectar timeline shows AÑO/MES/IPC/IPCC/SMLV/IOEXP/FACT PROD/IND IPCC (no IPC TCL), rounded to 5 decimals, 24 rows [24] (ConsultarLineasdeTiempo.vue:4-119)', () => {
    const { fixture, component } = crear();

    expect(component.columnasLineaTiempo.map((c) => [c.field, c.header])).toEqual([
      ['anno', 'AÑO'], ['mes', 'MES'], ['deltipc', 'IPC'], ['deltipcc', 'IPCC'], ['deltsmlv', 'SMLV'], ['deltioexp', 'IOEXP'],
      ['deltfacproduc', 'FACT PROD'], ['deltindipcc', 'IND IPCC']
    ]);
    const [linea] = tablas(fixture);
    expect(linea.filasPorPagina).toBe(24);
    expect(linea.rowsPerPageOptionsList).toEqual([24]);
    const celdas = Array.from((fixture.nativeElement.querySelector('app-tabla-avanzada') as HTMLElement).querySelectorAll('tbody td'))
      .map((td) => td.textContent?.trim());
    expect(celdas[2]).toBe(String(Math.round(1.2345678 * 100000) / 100000));
  });

  // Proyectar.vue:5-11,18-45: button "EJECUTAR"; tabs "Lineas de Tiempo", "Variables" and sub-tabs "USUARIOS",
  // "INFORMACION PROPIA", "INFORMACION TERCERO", "DESCUENTOS COSTO".
  it('legacy labels are EJECUTAR / Lineas de Tiempo / Variables / USUARIOS / INFORMACION PROPIA / INFORMACION TERCERO / DESCUENTOS COSTO (Proyectar.vue:10-39)', () => {
    const { fixture } = crear();

    const tabs = Array.from(fixture.nativeElement.querySelectorAll('p-tab') as NodeListOf<HTMLElement>).map((t) => t.textContent?.trim());
    expect(tabs).toEqual(['Lineas de Tiempo', 'Variables', 'USUARIOS', 'INFORMACION PROPIA', 'INFORMACION TERCERO', 'DESCUENTOS COSTO']);
    const boton = Array.from(fixture.nativeElement.querySelectorAll('p-button') as NodeListOf<HTMLElement>).map((b) => b.textContent?.trim());
    expect(boton).toContain('EJECUTAR');
  });

  // components/proyecciones/CrecimientoUsuarios.vue:3-50: Usuarios grid columns APS (COD_APS), AÑO, MES (SEMESTRE), COD_USO,
  // CLASE_USO, COD_FACTOR, VLR_FACTOR, COD_TIPRED, TIPO_PRED, CANTIDAD, TONELADAS; 15 rows with [15, 30, 50, 100].
  it('legacy Usuarios grid shows APS/AÑO/MES/COD_USO/CLASE_USO/COD_FACTOR/VLR_FACTOR/COD_TIPRED/TIPO_PRED/CANTIDAD/TONELADAS with 15/[15,30,50,100] (CrecimientoUsuarios.vue:3-50)', () => {
    const { component } = crear();

    expect(component.columnasUsuarios().map((c) => c.header)).toEqual([
      'APS', 'AÑO', 'MES', 'COD_USO', 'CLASE_USO', 'COD_FACTOR', 'VLR_FACTOR', 'COD_TIPRED', 'TIPO_PRED', 'CANTIDAD', 'TONELADAS'
    ]);
  });
});
