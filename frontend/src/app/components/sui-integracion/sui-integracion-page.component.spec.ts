import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { SuiIntegracionPageComponent } from './sui-integracion-page.component';
import { SuiIntegracionService } from '../../services/sui-integracion.service';
import { InformesService } from '../../services/informes.service';
import { AuthService } from '../../services/auth.service';
import { estadoParametros } from '../infogerenciales/informes-gerenciales.spec-helpers';

type Col = [field: string, header: string, decimales?: number];

// Legacy front-tarificador/src/components/tablesFormatosFormularios/Formato{19,23,24,35,36}.vue (column order,
// header and redondeo(valor, n) per column).
const LEGACY: Record<'F19' | 'F23' | 'F24' | 'F35' | 'F36', Col[]> = {
  F19: [['F19_NJ', 'NJ'], ['F19_NDJ', 'NDJ'], ['F19_CRTJ', 'CRTJ', 2], ['F19_CDFJ', 'CDFJ', 2], ['F19_QRTJ', 'QRTJ', 5],
    ['F19_QRJ', 'QRJ', 5], ['F19_QBLJ', 'QBLJ', 5], ['F19_QLUJ', 'QLUJ', 5], ['F19_QNAZ', 'QNAZ', 5], ['F19_QAJ', 'QAJ', 5]],
  F23: [['EMPR_EMPR', 'Empresas'], ['F23_ID', 'IDNOMAPS'], ['F23_NUAP', 'NUAP'], ['F23_N', 'N'], ['F23_CP', 'CP', 2],
    ['F23_CCC', 'CCC', 2], ['F23_M2CCJ', 'M2CCJ'], ['F23_CLAVJ', 'CLAVJ', 2], ['F23_M3AGUAJ', 'M3AGUAJ'], ['F23_M2LAVJ', 'M2LAVJ', 2],
    ['F23_CLPJ', 'CLPJ', 2], ['F23_KLPJ', 'KLPJ'], ['F23_CCEI', 'CCEI', 2], ['F23_TIJ', 'TIJ'], ['F23_CCEMJ', 'CCEMJ', 2],
    ['F23_TMJ', 'TMJ'], ['F23_CLUS', 'CLUS', 2], ['F23_CBLJ', 'CBLJ', 2], ['F23_LBLJ', 'LBLJ', 2], ['F23_CBLS', 'CBLS', 2],
    ['F23_FACBLCLUS', 'FACBLCLUS', 4], ['F23_ABC', 'ABC']],
  F24: [['F24_NUAP', 'NUAP'], ['F24_NUSD', 'NUSD'], ['F24_CENTROIDE', 'CENTROIDE'], ['F24_QRT', 'QRT', 5], ['F24_F1', 'F1', 2],
    ['F24_F2', 'F2', 2], ['F24_CPE', 'CPE', 2], ['F24_PRTZ', 'PRTZ', 2], ['F24_DET', 'DET'], ['F24_F1ET', 'F1ET'],
    ['F24_CPEET', 'CPEET'], ['F24_PRTZET', 'PRTZET'], ['F24_CEG', 'CEG'], ['F24_CRTP', 'CRTP'], ['F24_SALINIDAD', 'SALINIDAD'],
    ['F24_VACRTABC', 'VACRTABC'], ['F24_VACRT', 'VACRT'], ['F24_FCK', 'FCK'], ['F24_T', 'T'], ['F24_CRTZ', 'CRTZ', 2],
    ['F24_CRT', 'CRT', 2], ['F24_FACRT', 'FACRT', 4], ['F24_FACCS', 'FACCS', 4]],
  F35: [['F35_NUSD', 'NUSD'], ['F35_NOMDF', 'NOMDF'], ['F35_CAMRERS', 'CAMRERS'], ['F35_QRSMES', 'QRSMES', 5],
    ['F35_QRSPROM', 'QRSPROM', 5], ['F35_CDFVU', 'CDFVU', 2], ['F35_PERADDT', 'PERADDT'], ['F35_CDFPC', 'CDFPC', 2],
    ['F35_INCENTIVO', 'INCENTIVO', 2], ['F35_DISPALT9', 'DISPALT9'], ['F35_INCCDFALT9', 'INCCDFALT9'], ['F35_VACDFABC', 'VACDFABC'],
    ['F35_VACDF', 'VACDF'], ['F35_PRCTCRRCP', 'PRCTCRRCP'], ['F35_CDF', 'CDF', 2], ['F35_CDFP', 'CDFP', 2], ['F35_FACCDF', 'FACCDF', 4],
    ['F35_V0', 'V0'], ['F35_VM', 'VM'], ['F35_MCRS', 'MCRS'], ['F35_ICRSM', 'ICRSM'], ['F35_ICCRS', 'ICCRS'], ['F35_FREIN', 'FREIN'],
    ['F35_CAPREMDF', 'CAPREMDF']],
  F36: [['F36_NUSD', 'NUSD'], ['F36_NOMDPTO', 'NOMDPTO'], ['F36_NOMMPIO', 'NOMMPIO'], ['F36_NOMDF', 'NOMDF'], ['F36_VLMES', 'VLMES', 5],
    ['F36_VLMPROM', 'VLMPROM', 5], ['F36_ESCENA', 'ESCENA'], ['F36_CTLMVU', 'CTLMVU', 2], ['F36_ANNOPOSCLA', 'ANNOPOSCLA'],
    ['F36_CTLMPC', 'CTLMPC', 2], ['F36_CTLM', 'CTLM', 2], ['F36_CTLMX', 'CTLMX', 2], ['F36_VACTLABC', 'VACTLABC'], ['F36_VACTL', 'VACTL'],
    ['F36_FCKCTL', 'FCKCTL', 6], ['F36_QRS', 'QRS', 5], ['F36_CTL', 'CTL', 2], ['F36_FACCTL', 'FACCTL', 4]]
};

// First render compiles PrimeNG tabs + several tabla-avanzada grids; slow under a loaded jsdom run.
const RENDER_TIMEOUT_MS = 30000;

function crear() {
  localStorage.clear();
  const service = {
    consuformu19: vi.fn(() => of({ formato: 'F19', filas: [] })),
    consuformu23: vi.fn(() => of({ formato: 'F23', filas: [] })),
    consuforma24: vi.fn(() => of({ formato: 'F24', filas: [] })),
    consuforma35: vi.fn(() => of({ formato: 'F35', filas: [] })),
    consuforma36: vi.fn(() => of({ formato: 'F36', filas: [] })),
    getcanCertificate: vi.fn(() => of({ puedeProcesar: true, mensajes: ['1'] })),
    procesar: vi.fn(() => of({ exitoso: true, formatosProcesados: ['F19'], estado: 'F19: PROCESADO' }))
  };
  const confirm = vi.fn();
  TestBed.configureTestingModule({
    imports: [SuiIntegracionPageComponent],
    providers: [
      provideRouter([]),
      { provide: SuiIntegracionService, useValue: service },
      { provide: InformesService, useValue: { getCostosJson: vi.fn(() => of({ semestre: '', dataset: [] })) } },
      { provide: ConfirmationService, useValue: { confirm } },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of([])) } },
      estadoParametros()
    ]
  });
  const fixture = TestBed.createComponent(SuiIntegracionPageComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service, confirm };
}

describe('SuiIntegracionPageComponent (801)', () => {
  it('shows the curated legacy columns, headers and rounding per format', () => {
    const { component } = crear();

    for (const formato of Object.keys(LEGACY) as Array<keyof typeof LEGACY>) {
      const actual = component.columnas[formato].map((c) => [c.field, c.header, c.decimales] as Col);
      expect(actual).toEqual(LEGACY[formato].map(([f, h, d]) => [f, h, d]));
    }
  }, RENDER_TIMEOUT_MS);

  it('shows the legacy tab labels, subtitles and the "Explicación formatos" download', () => {
    const { fixture, component } = crear();
    const link = fixture.nativeElement.querySelector('a.explicacion-formatos') as HTMLAnchorElement;

    expect(component.tabs.map((t) => [t.value, t.label, t.subtitulo])).toEqual([
      ['F19', 'Formato 19', 'Variable para el cálculo de la tarifa de aprovechamiento y toneladas conjuntas'],
      ['F23', 'Formulario 23', 'Costo de limpieza urbana y costo de barrido y limpieza de vias y áreas públicas'],
      ['F24', 'Formato 24', 'Costo de recolección y transporte'],
      ['F35', 'Formato 35', 'Costo de disposición final operador sitio de disposición final - este aplica solo relleno'],
      ['F36', 'Formato 36', 'Costo de tratamiento de lixiviados - operador sitio de disposición final'],
      ['RESUMEN', 'Resumen Variables', 'Resumen Variables']
    ]);
    expect(link.getAttribute('href')).toBe('assets/layout/planos/Explicación formatos y formularios.xlsx');
    expect(link.textContent).toContain('Explicación formatos y formularios');
    expect(fixture.nativeElement.textContent).toContain('Variable para el cálculo de la tarifa de aprovechamiento y toneladas conjuntas');
  }, RENDER_TIMEOUT_MS);

  it('asks for confirmation before Procesar and does nothing until it is accepted', () => {
    const { component, service, confirm } = crear();
    component.aps.set(7);
    component.anno.set(2025);
    component.mes.set(3);

    component.procesar();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toEqual(expect.objectContaining({
      header: 'Procesar SUI',
      message: '¿Está seguro de ejecutar el proceso del SUI?',
      acceptLabel: 'Procesar',
      rejectLabel: 'Cancelar'
    }));
    expect(service.getcanCertificate).not.toHaveBeenCalled();
    expect(service.procesar).not.toHaveBeenCalled();
  }, RENDER_TIMEOUT_MS);

  it('on accept prechecks and processes month - 1 without sending a usuario (taken from the token)', () => {
    const { component, service, confirm } = crear();
    component.aps.set(7);
    component.anno.set(2025);
    component.mes.set(1);

    component.procesar();
    confirm.mock.calls[0][0].accept();

    expect(service.getcanCertificate).toHaveBeenCalledWith({ aps: 7, mes: 12, anno: 2024 });
    expect(service.procesar).toHaveBeenCalledTimes(1);
    const payload = (service.procesar.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(payload).toEqual({ aps: 7, mes: 12, anno: 2024 });
    expect(component.estado()).toBe('Estado: F19: PROCESADO. Formatos: F19');
  }, RENDER_TIMEOUT_MS);
});
