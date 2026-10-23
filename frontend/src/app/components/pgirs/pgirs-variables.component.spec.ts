import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PgirsVariablesComponent } from './pgirs-variables.component';
import { PgirsService } from '../../services/pgirs.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';

// Legacy screen: front-tarificador/src/views/pgirs/variablesPGRIS.vue -> components/pgirs/tableVariablesPGRIS.vue
// ("Variables PGIRS", 2001), backed by pgirsService.js dataVariablesPGRIS / upEditarVariablesPGIRS / nuevoVariablesPGRIS.

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const ROW = {
  APSAID: 7, APSA_NOMAPS: 'Tunja', ANNOREAL: 2025, MESREAL: 3, PGRIANNO: 2025, PGRIMES: 3, PGRIVARIABLE: 22,
  PGRIFRECUENCIA: 2, PGRIVALOR: 4.5, SISU_CORREO: 'a@v.com', PGRIUSUARIO: 55, PGRIFECHA: '2025-04-02T05:00:00.000Z', PGRINGRESO: 'MANUAL'
};

function crear(rows: unknown[] = [ROW]) {
  localStorage.clear();
  const service = {
    getVariables: vi.fn(() => of({ status: true, data: rows, message: 'OK' })),
    actualizarVariable: vi.fn(() => of({ status: 'success', data: true, message: 'Variables actualizadas' })),
    guardarVariables: vi.fn(() => of({ status: 'success', data: true, message: 'Variables creadas' }))
  };
  TestBed.configureTestingModule({
    imports: [PgirsVariablesComponent],
    providers: [
      { provide: PgirsService, useValue: service },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: { getAps: vi.fn(() => null), setAps: vi.fn(), getAnno: vi.fn(() => null), getMes: vi.fn(() => null), setAnno: vi.fn(), setMes: vi.fn() }
      }
    ]
  });
  const fixture = TestBed.createComponent(PgirsVariablesComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  const messages = fixture.debugElement.injector.get(MessageService);
  const add = vi.spyOn(messages, 'add');
  component.aps.set(7);
  component.anno.set(2026);
  component.mes.set(1);
  return { fixture, component, service, add };
}

describe('PgirsVariablesComponent (Variables PGIRS 2001, legacy tableVariablesPGRIS.vue)', () => {
  // tableVariablesPGRIS.vue:248-258: the query runs on the month before the selected one (Jan 2026 -> Dec 2025).
  it('queries the variables of the previous month', () => {
    const { fixture, component, service } = crear();

    component.consultar();
    fixture.detectChanges();

    expect(service.getVariables).toHaveBeenCalledWith(7, 2025, 12);
    expect(component.consultaData()).toEqual([ROW]);
  });

  // tableVariablesPGRIS.vue:397-430: variable and frecuencia catalogs (11 LBL, 21 CESPED, 22 PODA, 23 LAVADO, 24 PLAYAS,
  // 25 INSCESTAS, 26 MANCESTAS; 1 Mensual, 2 Semestral, 3 Anual); unknown codes are shown as they come.
  it('translates variables and frecuencias with the legacy catalogs', () => {
    const { component } = crear();

    expect([11, 21, 22, 23, 24, 25, 26].map((c) => component.traducirVariable(c)))
      .toEqual(['LBL', 'CESPED', 'PODA', 'LAVADO', 'PLAYAS', 'INSCESTAS', 'MANCESTAS']);
    expect([1, 2, 3].map((f) => component.traducirFrecuencia(f))).toEqual(['Mensual', 'Semestral', 'Anual']);
    expect(component.traducirVariable(99)).toBe('99');
    expect(component.frecuenciaOptions.map((o) => o.label)).toEqual(['Mensual', 'Semestral', 'Anual']);
  });

  // tableVariablesPGRIS.vue:268-285: Guardar sends the edited row (valor + frecuencia) and reloads the grid.
  it('saves the edited row and reloads', () => {
    const { component, service } = crear();
    component.consultar();

    component.iniciarEdicionFila(ROW);
    component.editingValor.set(9.75);
    component.editingFrecuencia.set(3);
    component.guardarFila(ROW);

    expect(service.actualizarVariable).toHaveBeenCalledWith([{ apsId: 7, anno: 2025, mes: 3, codVariable: 22, valor: 9.75, frecuencia: '3' }]);
    expect(service.getVariables).toHaveBeenCalledTimes(2);
    expect(component.editingKey()).toBeNull();
  });

  // tableVariablesPGRIS.vue:22-66: columns COD APS, APS, AÑO, MES (month name), VARIABLE, FRECUENCIA, VALOR, USUARIO (e-mail),
  // FECHA INGRESO (dd/mm/yyyy), TIPO INGRESO (MANUAL orange, :392-396).
  it('legacy Variables PGIRS grid shows COD APS / APS (name) / AÑO / MES (month name) / VARIABLE / FRECUENCIA / VALOR / USUARIO (e-mail) / FECHA INGRESO dd/mm/yyyy / TIPO INGRESO (tableVariablesPGRIS.vue:22-66)', () => {
    const { component } = crear();

    expect(component.columnasVariables.map((c) => [c.field, c.header.trim()])).toEqual([
      ['APSAID', 'COD APS'], ['APSA_NOMAPS', 'APS'], ['ANNOREAL', 'AÑO'], ['MESREAL', 'MES'], ['PGRIVARIABLE', 'VARIABLE'],
      ['PGRIFRECUENCIA', 'FRECUENCIA'], ['PGRIVALOR', 'VALOR'], ['SISU_CORREO', 'USUARIO'], ['PGRIFECHA', 'FECHA INGRESO'],
      ['PGRINGRESO', 'TIPO INGRESO']
    ]);
  });

  // tableVariablesPGRIS.vue:11-14: 15 rows per page with [15, 30, 50, 100].
  it('legacy Variables PGIRS pages 15 rows with [15,30,50,100] (tableVariablesPGRIS.vue:11-14)', () => {
    const { fixture, component } = crear();
    component.consultar();
    fixture.detectChanges();

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.filasPorPagina).toBe(15);
    expect(tabla.rowsPerPageOptionsList).toEqual([15, 30, 50, 100]);
  });

  // tableVariablesPGRIS.vue:17-18,261-265: "Nuevo" is disabled once the period already has variables.
  it('legacy disables "Nuevo" when the period already has variables (tableVariablesPGRIS.vue:17-18,261-265)', () => {
    const { fixture, component } = crear();
    component.consultar();
    fixture.detectChanges();

    const boton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => /Nuev/.test(b.textContent ?? ''));
    expect(boton?.disabled).toBe(true);
  });

  // tableVariablesPGRIS.vue:318-364: "Nuevo" creates the seven variables at once (LBL, CESPED, PODA, LAVADO, PLAYAS,
  // INSCESTAS, MANCESTAS, each with its frecuencia); if any value or frecuencia is missing it shows "Este campo es obligatorio"
  // and sends nothing.
  it('legacy "Nuevo" requires and sends all seven variables with their frecuencias in one request, rejecting partial input with "Este campo es obligatorio" (tableVariablesPGRIS.vue:318-364)', () => {
    const { fixture, component, service, add } = crear([]);
    component.abrirNuevaVariable();
    component.newForm.set({ ...component.newForm(), lbl: 1.5, lblFrecuencia: 1 });

    component.guardarNuevaVariable();
    fixture.detectChanges();

    expect(service.guardarVariables).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Este campo es obligatorio');
    expect(add).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  // tableVariablesPGRIS.vue:330-360: with every value and frecuencia filled, one nuevoVariablesPGRIS request carries the
  // seven variables for the month before the selected one (Jan 2026 -> Dec 2025).
  it('sends the seven variables with their frecuencias in one request for the previous month', () => {
    const { component, service } = crear([]);
    component.abrirNuevaVariable();
    component.newForm.set({
      lbl: 1.5, lblFrecuencia: 1, cesped: 2, cespedFrecuencia: 2, poda: 3, podaFrecuencia: 3, lavado: 4, lavadoFrecuencia: 1,
      playas: 5, playasFrecuencia: 2, inscestas: 6, inscestasFrecuencia: 3, mancestas: 7, mancestasFrecuencia: 1
    });

    component.guardarNuevaVariable();

    expect(service.guardarVariables).toHaveBeenCalledTimes(1);
    expect(service.guardarVariables).toHaveBeenCalledWith({
      apsId: 7, anno: 2025, mes: 12,
      lbl: 1.5, lblFrecuencia: '1', cesped: 2, cespedFrecuencia: '2', poda: 3, podaFrecuencia: '3', lavado: 4, lavadoFrecuencia: '1',
      playas: 5, playasFrecuencia: '2', inscestas: 6, inscestasFrecuencia: '3', mancestas: 7, mancestasFrecuencia: '1'
    });
  });
});
