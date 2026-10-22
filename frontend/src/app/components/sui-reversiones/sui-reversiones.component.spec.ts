import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { SuiReversionesComponent } from './sui-reversiones.component';
import { SuiReversionesService } from '../../services/sui-reversiones.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';

// Legacy screen: front-tarificador/src/views/sui/ReversionesSui.vue with components/TableReversionesAps/Formato{19,23,24,35,36}.vue
// (column order, header and redondeo(valor, n) = parseFloat((valor || 0).toFixed(n)) per column).
// Legacy Formato36 binds the MES column to the field "F19_MES" (typo, always blank); F36_MES is used here.

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

type Formato = 'F19' | 'F23' | 'F24' | 'F35' | 'F36';
type Col = [field: string, header: string, decimales?: number];

const LEGACY: Record<Formato, Col[]> = {
  F19: [['REVE_ID', 'REVE ID'], ['F19_ANNO', 'AÑO'], ['F19_MES', 'MES'], ['F19_NJ', 'NJ'], ['F19_NDJ', 'NDJ'], ['F19_CRTJ', 'CRTJ', 2], ['F19_CDFJ', 'CDFJ', 2], ['F19_QRTJ', 'QRTJ', 5], ['F19_QRJ', 'QRJ', 5], ['F19_QBLJ', 'QBLJ', 5], ['F19_QLUJ', 'QLUJ', 5], ['F19_QNAZ', 'QNAZ', 5], ['F19_QAJ', 'QAJ', 5]],
  F23: [['REVE_ID', 'REVE ID'], ['F23_ANNO', 'AÑO'], ['F23_MES', 'MES'], ['EMPR_EMPR', 'Empresas'], ['F23_ID', 'IDNOMAPS'], ['F23_NUAP', 'NUAP'], ['F23_N', 'N'], ['F23_CP', 'CP', 2], ['F23_CCC', 'CCC', 2], ['F23_M2CCJ', 'M2CCJ'], ['F23_CLAVJ', 'CLAVJ', 2], ['F23_M3AGUAJ', 'M3AGUAJ'], ['F23_M2LAVJ', 'M2LAVJ', 2], ['F23_CLPJ', 'CLPJ', 2], ['F23_KLPJ', 'KLPJ'], ['F23_CCEI', 'CCEI', 2], ['F23_TIJ', 'TIJ'], ['F23_CCEMJ', 'CCEMJ', 2], ['F23_TMJ', 'TMJ'], ['F23_CLUS', 'CLUS', 2], ['F23_CBLJ', 'CBLJ', 2], ['F23_LBLJ', 'LBLJ', 2], ['F23_CBLS', 'CBLS', 2], ['F23_FACBLCLUS', 'FACBLCLUS', 4], ['F23_ABC', 'ABC']],
  F24: [['REVE_ID', 'REVE ID'], ['F24_ANNO', 'AÑO'], ['F24_MES', 'MES'], ['F24_NUAP', 'NUAP'], ['F24_NUSD', 'NUSD'], ['F24_CENTROIDE', 'CENTROIDE', 5], ['F24_QRT', 'QRT', 5], ['F24_F1', 'F1', 2], ['F24_F2', 'F2', 2], ['F24_CPE', 'CPE', 2], ['F24_PRTZ', 'PRTZ', 2], ['F24_DET', 'DET'], ['F24_F1ET', 'F1ET'], ['F24_CPEET', 'CPEET'], ['F24_PRTZET', 'PRTZET'], ['F24_CEG', 'CEG'], ['F24_CRTP', 'CRTP'], ['F24_SALINIDAD', 'SALINIDAD'], ['F24_VACRTABC', 'VACRTABC'], ['F24_VACRT', 'VACRT'], ['F24_FCK', 'FCK'], ['F24_T', 'T'], ['F24_CRTZ', 'CRTZ', 2], ['F24_CRT', 'CRT', 2], ['F24_FACRT', 'FACRT', 4], ['F24_FACCS', 'FACCS', 4]],
  F35: [['REVE_ID', 'REVE ID'], ['F35_ANNO', 'AÑO'], ['F35_MES', 'MES'], ['F35_NUSD', 'NUSD'], ['F35_NOMDF', 'NOMDF'], ['F35_CAMRERS', 'CAMRERS'], ['F35_QRSMES', 'QRSMES', 5], ['F35_QRSPROM', 'QRSPROM', 5], ['F35_CDFVU', 'CDFVU', 2], ['F35_PERADDT', 'PERADDT'], ['F35_CDFPC', 'CDFPC', 2], ['F35_INCENTIVO', 'INCENTIVO', 2], ['F35_DISPALT9', 'DISPALT9'], ['F35_INCCDFALT9', 'INCCDFALT9'], ['F35_VACDFABC', 'VACDFABC'], ['F35_VACDF', 'VACDF'], ['F35_PRCTCRRCP', 'PRCTCRRCP'], ['F35_CDF', 'CDF', 2], ['F35_CDFP', 'CDFP', 2], ['F35_FACCDF', 'FACCDF', 4], ['F35_V0', 'V0'], ['F35_VM', 'VM'], ['F35_MCRS', 'MCRS'], ['F35_ICRSM', 'ICRSM'], ['F35_ICCRS', 'ICCRS'], ['F35_FREIN', 'FREIN'], ['F35_CAPREMDF', 'CAPREMDF']],
  F36: [['REVE_ID', 'REVE ID'], ['F36_ANNO', 'AÑO'], ['F36_MES', 'MES'], ['F36_NUSD', 'NUSD'], ['F36_NOMDPTO', 'NOMDPTO'], ['F36_NOMMPIO', 'NOMMPIO'], ['F36_NOMDF', 'NOMDF'], ['F36_VLMES', 'VLMES', 5], ['F36_VLMPROM', 'VLMPROM', 5], ['F36_ESCENA', 'ESCENA'], ['F36_CTLMVU', 'CTLMVU', 2], ['F36_ANNOPOSCLA', 'ANNOPOSCLA'], ['F36_CTLMPC', 'CTLMPC', 2], ['F36_CTLM', 'CTLM', 2], ['F36_CTLMX', 'CTLMX', 2], ['F36_VACTLABC', 'VACTLABC'], ['F36_VACTL', 'VACTL'], ['F36_FCKCTL', 'FCKCTL', 6], ['F36_QRS', 'QRS', 5], ['F36_CTL', 'CTL', 2], ['F36_FACCTL', 'FACCTL', 4]],
};

const FORMATOS: Formato[] = ['F19', 'F23', 'F24', 'F35', 'F36'];

// The API answers SELECT * of the table (APSA_ID first, then the format columns, *_FECHA and USUARIO).
function filaSelectAll(formato: Formato): Record<string, unknown> {
  const fila: Record<string, unknown> = { APSA_ID: 7 };
  LEGACY[formato].forEach(([field], i) => (fila[field] = field === 'REVE_ID' ? 4 : 1.234567 + i));
  fila[`${formato}_FECHA`] = '2025-03-01T00:00:00.000Z';
  fila['USUARIO'] = 55;
  return fila;
}

async function crear() {
  localStorage.clear();
  const service = Object.fromEntries(FORMATOS.map((f) => [`getReversiones${f}`, vi.fn(() => of([filaSelectAll(f)]))]));
  TestBed.configureTestingModule({
    imports: [SuiReversionesComponent],
    providers: [
      { provide: SuiReversionesService, useValue: service },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: { getAps: vi.fn(() => null), setAps: vi.fn(), getAnno: vi.fn(() => null), getMes: vi.fn(() => null), setAnno: vi.fn(), setMes: vi.fn() }
      }
    ]
  });
  const fixture = TestBed.createComponent(SuiReversionesComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

async function cargar(ctx: Awaited<ReturnType<typeof crear>>) {
  ctx.component.onApsChange(7);
  await new Promise((resolve) => setTimeout(resolve, 0));
  ctx.fixture.detectChanges();
}

const RENDER_TIMEOUT_MS = 30000;

describe('SuiReversionesComponent (805 Reversiones SUI, legacy ReversionesSui.vue)', () => {
  // ReversionesSui.vue:110-118: selecting the APS loads the five formats of that APS.
  it('loads the five formats of the selected APS', async () => {
    const ctx = await crear();
    await cargar(ctx);

    for (const f of FORMATOS) {
      expect(ctx.service[`getReversiones${f}`]).toHaveBeenCalledWith(7);
      expect(ctx.component.data[f.toLowerCase()].rows).toEqual([filaSelectAll(f)]);
    }
  }, RENDER_TIMEOUT_MS);

  // ReversionesSui.vue:13-63: tab labels.
  it('legacy tabs are [REV Formato 19, REV Formulario 23, REV Formulario 24, REV Formulario 35, REV Formulario 36] (ReversionesSui.vue:13-63)', async () => {
    const { component } = await crear();

    expect(component.formatos.map((f) => f.label)).toEqual(['REV Formato 19', 'REV Formulario 23', 'REV Formulario 24', 'REV Formulario 35', 'REV Formulario 36']);
  });

  // ReversionesSui.vue:17-62: subtitles of each tab.
  it('legacy F23 subtitle reads "...limpieza de vias y áreas públicas" (ReversionesSui.vue:17-62)', async () => {
    const { component } = await crear();

    expect(component.formatos.map((f) => f.titulo)).toEqual([
      'Variable para el cálculo de la tarifa de aprovechamiento y toneladas conjuntas',
      'Costo de limpieza urbana y costo de barrido y limpieza de vias y áreas públicas',
      'Costo de recolección y transporte',
      'Costo de disposición final operador sitio de disposición final - este aplica solo relleno',
      'Costo de tratamiento de lixiviados - operador sitio de disposición final'
    ]);
  });

  // components/TableReversionesAps/Formato*.vue: only the listed columns, in that order, with the legacy headers and redondeo per column.
  it('legacy shows only the curated columns of components/TableReversionesAps/Formato*.vue with their headers and redondeo', async () => {
    const ctx = await crear();
    await cargar(ctx);

    for (const f of FORMATOS) {
      const actual = ctx.component.data[f.toLowerCase()].columnas.map((c) => [c.field, c.header.trim(), c.decimales] as Col);
      expect(actual).toEqual(LEGACY[f].map(([field, header, decimales]) => [field, header, decimales]));
    }
  }, RENDER_TIMEOUT_MS);

  // components/TableReversionesAps/Formato*.vue:9,13: 10 rows per page; [10, 20, 100, 200] except Formato24 [10, 20, 50].
  it('legacy grids page 10 rows with [10,20,100,200] (Formato24: [10,20,50]) (components/TableReversionesAps/Formato*.vue:9-13)', async () => {
    const ctx = await crear();
    await cargar(ctx);

    const tablas = ctx.fixture.debugElement.queryAll(By.directive(TablaAvanzadaComponent)).map((d) => d.componentInstance as TablaAvanzadaComponent);
    expect(tablas.map((t) => t.filasPorPagina)).toEqual([10, 10, 10, 10, 10]);
    expect(tablas.map((t) => t.rowsPerPageOptionsList)).toEqual([[10, 20, 100, 200], [10, 20, 100, 200], [10, 20, 50], [10, 20, 100, 200], [10, 20, 100, 200]]);
  }, RENDER_TIMEOUT_MS);

  // ReversionesSui.vue:8-9: link "Explicación formatos y formularios" to assets/layout/planos/Explicación formatos y formularios.xlsx.
  it('legacy shows the "Explicación formatos y formularios" link to assets/layout/planos/Explicación formatos y formularios.xlsx (ReversionesSui.vue:8-9)', async () => {
    const { fixture } = await crear();

    const link = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .find((a) => a.textContent?.includes('Explicación formatos y formularios'));
    expect(link?.getAttribute('href')).toBe('assets/layout/planos/Explicación formatos y formularios.xlsx');
  });
});
