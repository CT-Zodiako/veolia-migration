import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CostosCalculoPageComponent } from './costos-calculo-page.component';
import { CostosService } from '../../services/costos.service';
import { ValidacionesService } from '../../services/validaciones.service';
import { SuministrosService } from '../../services/suministros.service';
import { NotificationService } from '../../services/notification.service';
import { TarifasService } from '../../services/tarifas.service';
import { TafnaService } from '../../services/tafna.service';
import { TrnaService } from '../../services/trna.service';
import { UsuariosGraficoService } from '../../services/usuarios-grafico.service';

interface Opciones {
  existarifa?: string;
  prechecks?: { puedeCalcular: boolean; prechecks: { nombre: string; estado: string; mensaje: string }[] };
  exitoso?: boolean;
}

function setup(opciones: Opciones = {}) {
  const costos = {
    consultarCostos: vi.fn(() => of([])),
    validapreactualiza: vi.fn(() => of({ puedeCalcular: true, detalle: [{ empresaNombre: 'VEOLIA', grupo: 'CLUS', variable: 'LBL', valor: 1, empresaPropia: 1 }] })),
    runPrechecks: vi.fn(() => of(opciones.prechecks ?? { puedeCalcular: true, prechecks: [] })),
    calculartarifas: vi.fn(() => of({ exitoso: opciones.exitoso ?? true })),
    certificarTarifas: vi.fn(() => of({ certificado: true })),
    consultarQrt: vi.fn(() => of([{ aps: 5, empresa: 1, tipo: 'QRT', valor: 10 }])),
    consultarQa: vi.fn(() => of([{ aps: 5, empresa: 1, anno: 2025, mes: 12, valor: 2 }])),
    consultarLbl: vi.fn(() => of([{ aps: 5, empresa: 1, mpio: 1, anno: 2025, mes: 12, valor: 43000, estado: 1 }]))
  };
  const tafna = { getTafna: vi.fn(() => of([{ aps: 5, empresa: 1, anno: 2025, mes: 12, valor: 3 }])) };
  const trna = { getTrna: vi.fn(() => of([])) };
  const usuarios = { getUsuagraf: vi.fn(() => of([])) };
  const validaciones = { faucoExistarifacert: vi.fn(() => of({ ok: true, message: null })) };
  const suministros = { cenrtificarEditar: vi.fn(() => of({ data: opciones.existarifa ?? '0' })) };
  const tarifas = { getResumen: vi.fn(() => of([])), getTarifa: vi.fn(() => of([{ APS: 5, ANNO: 2025, MES: 12, TFT: 1.5 }])) };
  const notification = { success: vi.fn(), warn: vi.fn(), error: vi.fn() };
  TestBed.configureTestingModule({
    imports: [CostosCalculoPageComponent],
    providers: [
      provideRouter([]),
      { provide: CostosService, useValue: costos },
      { provide: ValidacionesService, useValue: validaciones },
      { provide: SuministrosService, useValue: suministros },
      { provide: TarifasService, useValue: tarifas },
      { provide: NotificationService, useValue: notification },
      { provide: TafnaService, useValue: tafna },
      { provide: TrnaService, useValue: trna },
      { provide: UsuariosGraficoService, useValue: usuarios }
    ]
  });
  // Selectors, the cost grid and the summary children are covered by their own specs.
  TestBed.overrideComponent(CostosCalculoPageComponent, {
    set: { imports: [CommonModule, MessageModule, DividerModule, ...CommonPrimeNgModules], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  localStorage.removeItem('costos-calculo-filtros');
  const fixture = TestBed.createComponent(CostosCalculoPageComponent);
  const component = fixture.componentInstance;
  component.aps.set(5);
  component.anno.set(2026);
  component.mes.set(1);
  fixture.detectChanges();
  return { fixture, component, costos, validaciones, suministros, tarifas, notification, tafna, trna, usuarios };
}

describe('CostosCalculoPageComponent (401) — legacy views/procesos/Calculo.vue', () => {
  afterEach(() => localStorage.removeItem('costos-calculo-filtros'));

  // Legacy Calculo.vue (actualizaInfoGeneral): existarifacert, costos and resumen for the selected month - 1.
  it('loads costos, resumen and the certification gate for the previous month', () => {
    const { costos, tarifas, validaciones } = setup();

    expect(costos.consultarCostos).toHaveBeenLastCalledWith(5, 12, 2025);
    expect(tarifas.getResumen).toHaveBeenLastCalledWith(5, 2025, 12);
    expect(validaciones.faucoExistarifacert).toHaveBeenLastCalledWith({ aps: 5, anno: 2025, mes: 12 });
  });

  // Legacy Calculo.vue:4-8: buttons VERIFICAR and CERTIFICAR; openVerificar loads validapreactualiza and opens the dialog.
  it('verifies the previous month and opens the verification dialog', () => {
    const { fixture, component, costos } = setup();

    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => b.textContent?.trim());
    component.verificar();

    expect(botones).toEqual(expect.arrayContaining(['VERIFICAR', 'CERTIFICAR']));
    expect(costos.validapreactualiza).toHaveBeenCalledWith(5, 12, 2025);
    expect(component.verificacionVisible()).toBe(true);
    expect(component.verificacionDetalle()).toEqual([{ empresaNombre: 'VEOLIA', grupo: 'CLUS', variable: 'LBL', valor: 1, empresaPropia: 1 }]);
  });

  // Legacy Calculo.vue:276-300: fauco_existarifa != 0 -> warn "Ya existen tarifas calculadas para el APS y Periodo Seleccionado".
  it('warns and does not calculate when tariffs already exist', () => {
    const { component, costos, suministros, notification } = setup({ existarifa: 'Existen tarifas' });

    component.aplicar();

    expect(suministros.cenrtificarEditar).toHaveBeenCalledWith(5, 2025, 12);
    expect(notification.warn).toHaveBeenCalledWith('Ya existen tarifas calculadas para el APS y Periodo Seleccionado');
    expect(costos.calculartarifas).not.toHaveBeenCalled();
  });

  // Legacy Calculo.vue:301-388: one error toast per failed precheck (cpsuivsfact, cpproductividad, cpenero) and no calculation.
  it('shows one error per failed precheck and does not calculate', () => {
    const { component, costos, notification } = setup({
      prechecks: {
        puedeCalcular: false,
        prechecks: [
          { nombre: 'certificarFauco_cpsuivsfact', estado: 'error', mensaje: 'Poda facturación supera SUI' },
          { nombre: 'certificarFauco_cpproductividad', estado: 'pending', mensaje: 'No ejecutado por fallo previo.' }
        ]
      }
    });

    component.aplicar();

    expect(notification.error).toHaveBeenCalledWith('Poda facturación supera SUI');
    expect(notification.error).toHaveBeenCalledTimes(1);
    expect(costos.calculartarifas).not.toHaveBeenCalled();
  });

  // Legacy Calculo.vue:303-336: calculartarifas res 0 -> "Tarifas Calculadas"; res != 0 -> "Ya existen tarifas calculadas ...".
  it.each([
    [true, 'success', 'Tarifas Calculadas'],
    [false, 'warn', 'Ya existen tarifas calculadas para el APS y Periodo Seleccionado']
  ])('calculates for the previous month (exitoso=%s -> %s)', (exitoso, metodo, mensaje) => {
    const { component, costos, notification } = setup({ exitoso });

    component.aplicar();

    expect(costos.runPrechecks).toHaveBeenCalledWith(5, 12, 2025);
    expect(costos.calculartarifas).toHaveBeenCalledWith(5, 12, 2025);
    expect(notification[metodo as 'success' | 'warn']).toHaveBeenCalledWith(mensaje);
  });

  // Legacy Calculo.vue (onCertificar): certifica the previous month and toasts "Certificado".
  it('certifies the previous month', () => {
    const { component, costos, notification } = setup();
    component.certificarDisabled.set(false);

    component.certificar();

    expect(costos.certificarTarifas).toHaveBeenCalledWith(5, 12, 2025);
    expect(notification.success).toHaveBeenCalledWith('Certificado');
  });

  // Legacy Calculo.vue:22-80 renders the charts QRT, Qa, TAFNA, LBL (Kilómetros), TRNA, Usuarios Promedio and Tarifas.
  it('renders the legacy charts (QRT, Qa, TAFNA, LBL, TRNA, Usuarios Promedio, Tarifas)', () => {
    const { fixture } = setup();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const titulo of ['Toneladas', 'QRT', 'Qa', 'TAFNA', 'Kilómetros', 'LBL', 'TRNA', 'Usuarios Promedio', 'Tarifas']) {
      expect(texto).toContain(titulo);
    }
  });

  // Legacy Calculo.vue:523-536 + chart services: toneladas/qrt, toneladas/qa, tafna, kilometros/lbl, trna, usuarios and tarifas
  // for the selected month - 1; QRT labels = TIPO, Qa/TAFNA/LBL labels = month names, Tarifas = first row without 3 columns.
  it('loads the chart data for the previous month with the legacy mapping', () => {
    const { component, costos, tafna, trna, usuarios, tarifas } = setup();

    for (const llamada of [costos.consultarQrt, costos.consultarQa, costos.consultarLbl, tafna.getTafna, trna.getTrna, usuarios.getUsuagraf, tarifas.getTarifa]) {
      expect(llamada).toHaveBeenLastCalledWith(5, 2025, 12);
    }
    const graficas = component.graficas();
    expect(graficas.qrt).toMatchObject({ labels: ['QRT'], series: [10] });
    expect(graficas.qa?.xaxis.categories).toEqual(['Dic']);
    expect(graficas.lbl).toMatchObject({ xaxis: { categories: ['Dic'], min: 42570, max: 43430 }, plotOptions: { bar: { horizontal: true } } });
    expect(graficas.tarifas).toMatchObject({ labels: ['TFT'], series: [1.5] });
    expect(graficas.usuarios).toBeNull();
  });
});
