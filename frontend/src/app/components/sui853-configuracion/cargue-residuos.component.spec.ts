import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CargueResiduosComponent } from './cargue-residuos.component';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';

const okResult = {
  ok: true, message: 'Carga completada correctamente', count: 2, inserted: 5, deleted: 3,
  periods: [{ aps: 7, anno: 2024, mes: 3 }],
  files: [
    { monthFolder: '03 Marzo', fileName: 'Salamina Marzo 2024', sheetTitle: 'Hoja SUI Recolección', rows: 5, warning: null },
    { monthFolder: '04 Abril', fileName: 'Salamina Abril 2024', sheetTitle: 'Hoja SUI Recolección', rows: 0, warning: 'Sheet "Hoja SUI Recolección" not found' }
  ]
};

function setup(overrides: Record<string, unknown> = {}) {
  const service = {
    tcfgAps: vi.fn(() => of({ status: 200, data: [{ TCFG_APS_ID: 7, NOMBRE_APS: 'Salamina' }, { TCFG_APS_ID: 8, NOMBRE_APS: 'Palmira' }] })),
    cargueResiduos: vi.fn(() => of({ status: 200, data: okResult })),
    ...overrides
  };
  TestBed.configureTestingModule({
    imports: [CargueResiduosComponent],
    providers: [{ provide: Sui853ConfiguracionService, useValue: service }]
  });
  const fixture = TestBed.createComponent(CargueResiduosComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

describe('CargueResiduosComponent (30004)', () => {
  it('lists the SUI APS catalog and the legacy 2018-2030 years', () => {
    const { component, service } = setup();
    expect(service.tcfgAps).toHaveBeenCalledTimes(1);
    expect(component.apsOptions).toEqual([{ label: 'Salamina', value: 7 }, { label: 'Palmira', value: 8 }]);
    expect(component.years[0]).toEqual({ label: '2018', value: 2018 });
    expect(component.years.at(-1)).toEqual({ label: '2030', value: 2030 });
  });

  it('keeps "Cargar datos" disabled until APS and year are chosen', () => {
    const { component, service } = setup();
    expect(component.canLoad).toBe(false);
    component.load();
    component.selectedApsId = 7;
    expect(component.canLoad).toBe(false);
    component.load();
    expect(service.cargueResiduos).not.toHaveBeenCalled();
    component.selectedYear = 2024;
    expect(component.canLoad).toBe(true);
  });

  it('loads the selected APS and year and shows the processed files count', () => {
    const { fixture, component, service } = setup();
    component.selectedApsId = 7;
    component.selectedYear = 2024;
    component.load();
    fixture.detectChanges();

    expect(service.cargueResiduos).toHaveBeenCalledWith(7, 2024);
    expect(component.result?.inserted).toBe(5);
    expect(component.loading).toBe(false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Archivos procesados: 2');
    expect(text).toContain('Registros cargados: 5');
    expect(text).toContain('Sheet "Hoja SUI Recolección" not found');
  });

  it('opens the error dialog with message, type, file, sheet, row and validation like legacy', () => {
    const error = {
      ok: false, type: 'VALIDATION_ERROR', message: "Valor no numérico en 'SISTEMA DE MEDICION' (abc) en archivo Salamina 2024, hoja Hoja SUI Recolección, fila 3.",
      fileName: 'Salamina 2024', sheetTitle: 'Hoja SUI Recolección', rowNumber: 3, row: { NUAP: 'N1', 'SISTEMA DE MEDICION': 'abc' },
      validation: { campo: 'SISTEMA DE MEDICION', columna: 'SIS_MEDICION', valor: 'abc' }
    };
    const { fixture, component } = setup({
      cargueResiduos: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 400, error: { status: 400, data: error } })))
    });
    component.selectedApsId = 7;
    component.selectedYear = 2024;
    component.load();
    fixture.detectChanges();

    expect(component.showErrorDialog).toBe(true);
    expect(component.errorDetail).toEqual(error);
    expect(component.error).toBe(error.message);
    expect(component.result).toBeNull();
    expect(component.loading).toBe(false);
    expect(component.rowJson).toContain('"SISTEMA DE MEDICION": "abc"');
  });

  it('falls back to a generic message when the server gives no detail', () => {
    const { component } = setup({
      cargueResiduos: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 0, error: null })))
    });
    component.selectedApsId = 7;
    component.selectedYear = 2024;
    component.load();
    expect(component.error).toBe('Error al procesar los datos.');
    expect(component.showErrorDialog).toBe(false);
  });
});
