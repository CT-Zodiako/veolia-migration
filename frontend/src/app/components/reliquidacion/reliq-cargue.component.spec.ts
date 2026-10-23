import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ReliqCargueComponent } from './reliq-cargue.component';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaColumn } from '../shared/tabla-avanzada.component';

const RELIQ_ID = 7;
const APS_ID = 3;

function setup(resultadoPl: string | null, status: 'ok' | 'error' = 'ok') {
  const cargueService = {
    getReliInfoUsuarios: vi.fn(() => of({ status: 'ok', data: [], message: '' })),
    getResumenEmpresa: vi.fn(() => of({ status: 'ok', data: [], message: '' })),
    getResumenAps: vi.fn(() => of({ status: 'ok', data: [], message: '' })),
    getResumenRelleno: vi.fn(() => of({ status: 'ok', data: [], message: '' })),
    getReliInfoAdicional: vi.fn(() => of({ status: 'ok', data: [], message: '' })),
    compararCostosCargue: vi.fn(() => of({ status, data: { resultado: resultadoPl }, message: 'OK' }))
  };
  const reliqService = {
    getReliquidaciones: vi.fn(() => of({ status: 'ok', data: [{ relqId: RELIQ_ID, apsaId: APS_ID, relqNombre: 'R7' }], message: '' })),
    getReliquidacionByAps: vi.fn(() => of({ status: 'ok', data: [], message: '' }))
  };
  const parametrosState = { getReliquidacion: vi.fn(() => null), setReliquidacion: vi.fn() };
  const confirmationService = { confirm: vi.fn((c: { accept: () => void }) => c.accept()) };

  TestBed.configureTestingModule({
    imports: [ReliqCargueComponent],
    providers: [
      { provide: ReliqCargueService, useValue: cargueService },
      { provide: ReliquidacionService, useValue: reliqService },
      { provide: ParametrosConsultaStateService, useValue: parametrosState },
      { provide: ConfirmationService, useValue: confirmationService }
    ]
  });
  TestBed.overrideComponent(ReliqCargueComponent, { set: { template: '', imports: [] } });

  const fixture = TestBed.createComponent(ReliqCargueComponent);
  const component = fixture.componentInstance;
  const messages = fixture.debugElement.injector.get(MessageService);
  const addSpy = vi.spyOn(messages, 'add');

  component.selectedReliq.set(RELIQ_ID);
  return { component, cargueService, addSpy };
}

function refreshCalls(cargueService: ReturnType<typeof setup>['cargueService']): number[] {
  return [
    cargueService.getReliInfoUsuarios.mock.calls.length,
    cargueService.getResumenEmpresa.mock.calls.length,
    cargueService.getResumenAps.mock.calls.length,
    cargueService.getResumenRelleno.mock.calls.length,
    cargueService.getReliInfoAdicional.mock.calls.length
  ];
}

describe('ReliqCargueComponent - Reliquidar Tarifa', () => {
  it('shows an error toast with the PL/SQL message and code when the result is ERR|code|msg', () => {
    const { component, cargueService, addSpy } = setup('ERR|-20001|No hay datos de cargue');

    component.reliquidarTarifa();

    expect(cargueService.compararCostosCargue).toHaveBeenCalledWith(RELIQ_ID, APS_ID);
    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'error',
      detail: 'No hay datos de cargue (-20001). No se ejecutó.'
    }));
    expect(component.reliquidando()).toBe(false);
  });

  it('treats any tag starting with ERR as an error and falls back to the default message', () => {
    const { component, addSpy } = setup('ERROR');

    component.reliquidarTarifa();

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'error',
      detail: 'Error en la ejecución.. No se ejecutó.'
    }));
  });

  it('does not refresh the five tabs after an ERR result', () => {
    const { component, cargueService } = setup('ERR|1|fallo');

    component.reliquidarTarifa();

    expect(refreshCalls(cargueService)).toEqual([0, 0, 0, 0, 0]);
  });

  it('shows an error toast when the envelope status is not ok', () => {
    const { component, cargueService, addSpy } = setup(null, 'error');

    component.reliquidarTarifa();

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'No se ejecutó.. No se ejecutó.' }));
    expect(refreshCalls(cargueService)).toEqual([0, 0, 0, 0, 0]);
  });

  it('shows a success toast with the message after the code on OK|code|msg and refreshes the five tabs once', () => {
    const { component, cargueService, addSpy } = setup('OK|0|Reliquidación ejecutada');

    component.reliquidarTarifa();

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Reliquidación ejecutada' }));
    expect(refreshCalls(cargueService)).toEqual([1, 1, 1, 1, 1]);
    expect(cargueService.getReliInfoUsuarios).toHaveBeenCalledWith(RELIQ_ID);
  });

  it('uses the whole text as success message when it has no separators', () => {
    const { component, addSpy } = setup('1');

    component.reliquidarTarifa();

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: '1' }));
  });

  it('uses the default success message when the PL/SQL result is empty', () => {
    const { component, cargueService, addSpy } = setup(null);

    component.reliquidarTarifa();

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Proceso ejecutado correctamente.' }));
    expect(refreshCalls(cargueService)).toEqual([1, 1, 1, 1, 1]);
  });
});

describe('ReliqCargueComponent - legacy table cosmetics', () => {
  const filtrables = (cols: TablaColumn[]) => cols.filter((c) => c.filtrable).map((c) => c.field);
  const numericas = (cols: TablaColumn[]) => cols.filter((c) => c.numero);

  it('enables the legacy "Contiene" filters per tab', () => {
    const { component } = setup(null);

    expect(filtrables(component.columnasUsuarios)).toEqual(['anno', 'mes', 'clasNombre', 'tipoTarifaNombre', 'factorProduccionNombre']);
    expect(filtrables(component.columnasEmpresa)).toEqual(['anno', 'mes', 'empresaNombre']);
    expect(filtrables(component.columnasAps)).toEqual(['anno', 'mes', 'empresaNombre']);
    expect(filtrables(component.columnasRelleno)).toEqual(['anno', 'mes']);
    expect(filtrables(component.columnasAdicional)).toEqual([]);
  });

  it('marks every numeric column of the five tabs with 2 decimals', () => {
    const { component } = setup(null);
    const todas = [
      ...component.columnasUsuarios, ...component.columnasEmpresa, ...component.columnasAps,
      ...component.columnasRelleno, ...component.columnasAdicional
    ];

    expect(numericas(todas).length).toBeGreaterThan(0);
    expect(numericas(todas).every((c) => c.decimales === 2)).toBe(true);
    expect(todas.filter((c) => !c.numero).every((c) => c.decimales === undefined)).toBe(true);
  });

  it('displays numeric cells rounded to 2 decimals with null as 0', () => {
    const { component } = setup(null);
    const col: TablaColumn = component.columnasUsuarios.find((c) => c.field === 'cantidad')!;

    expect(component.valorCeldaTexto({ cantidad: 12.3456 }, col, 12.3456)).toBe(12.35);
    expect(component.valorCeldaTexto({ cantidad: null }, col, null)).toBe(0);
    expect(component.valorCeldaTexto({ cantidad: -7.891 }, col, -7.891)).toBe(-7.89);
  });

  it('keeps text cells and their code fallback unchanged', () => {
    const { component } = setup(null);
    const clase = component.columnasUsuarios.find((c) => c.field === 'clasNombre')!;
    const anno = component.columnasUsuarios.find((c) => c.field === 'anno')!;

    expect(component.valorCeldaTexto({ clasNombre: null, clasClaseUso: 'RES' }, clase, null)).toBe('RES');
    expect(component.valorCeldaTexto({ clasNombre: 'Residencial' }, clase, 'Residencial')).toBe('Residencial');
    expect(component.valorCeldaTexto({ anno: null }, anno, null)).toBe('');
    expect(component.valorCeldaTexto({ anno: 2024 }, anno, 2024)).toBe(2024);
  });
});
