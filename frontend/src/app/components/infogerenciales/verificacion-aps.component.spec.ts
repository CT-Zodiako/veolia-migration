import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { VerificacionApsComponent } from './verificacion-aps.component';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { EmpresasService } from '../../services/empresas.service';
import { AuthService } from '../../services/auth.service';
import { congelarHoy, estadoParametros } from './informes-gerenciales.spec-helpers';

// Legacy 307 "Verificacion" (/verificacion): front-tarificador/src/views/suministros/Verificacion.vue. Three summaries
// (Resumen Empresa / Resumen APS / Resumen Relleno) from infogerencial/infoemprdivi, infoapsemprdivi, infoapsrelleno for
// the selected APS and the selected month itself (Verificacion.vue:552-568, the "-1" shift is commented out).

const empresa = { EMPR_NOMBRE: 'EMPRESA UNO', INED_CBLJ: 1.234567, INED_QRSJ: 2 };
const aps = { EMPR_NOMBRE: 'EMPRESA UNO', IAED_QRTZ: 3, IAED_QALMACEN: 4, IAED_CPEET: 5, IAED_QRTET: 6 };
const relleno = { RELL_NOMRELLENO: 'RELLENO SUR', IARE_QRS: 7, IARE_C: 8 };

function crear(estado = estadoParametros(2025, 3)) {
  const service = {
    infoemprdivi: vi.fn(() => of({ status: 'success', data: [empresa], message: 'OK' })),
    infoapsemprdivi: vi.fn(() => of({ status: 'success', data: [aps], message: 'OK' })),
    infoapsrelleno: vi.fn(() => of({ status: 'success', data: [relleno], message: 'OK' }))
  };
  TestBed.configureTestingModule({
    imports: [VerificacionApsComponent],
    providers: [
      { provide: InfoGerencialService, useValue: service },
      { provide: EmpresasService, useValue: { getEmpresasPropias: vi.fn(() => of([])) } },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      estado
    ]
  });
  const fixture = TestBed.createComponent(VerificacionApsComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

function consultar(component: VerificacionApsComponent): void {
  component.onApsChange(5);
  component.onAnnoChange(2025);
  component.onMesChange(3);
}

const encabezados = (cols: { field: string; header: string }[]) => cols.map((c) => `${c.field}:${c.header}`);

describe('VerificacionApsComponent (307) - legacy Verificacion.vue', () => {
  // Verificacion.vue:26-140 Resumen Empresa columns and :388-458 Resumen Relleno columns (IARE_C shown twice, as
  // "QRSmunrecp" and "C").
  it('shows the legacy Resumen Empresa and Resumen Relleno columns in the legacy order', () => {
    const { component } = crear();

    expect(encabezados(component.columnasEmpresa)).toEqual([
      'EMPR_NOMBRE:EMPRESA', 'INED_CBLJ:CBLJ', 'INED_LBLJ:LBLJ', 'INED_N:N', 'INED_M3AGUA:M3AGUA', 'INED_CP:CP',
      'INED_M2CCJ:M2CCJ', 'INED_M2LAVJ:M2LAVJ', 'INED_TIJ:TIJ', 'INED_KLPJ:KLPJ', 'INED_TMJ:TMJ', 'INED_CLAVJ:CLAVJ',
      'INED_QRTJ:QRTJ', 'INED_QRSJ:QRSJ'
    ]);
    expect(encabezados(component.columnasRelleno)).toEqual([
      'RELL_NOMRELLENO:RELLENO', 'IARE_QRS:QRS', 'IARE_C_QRSMUNRECP:QRSmunrecp', 'IARE_CDFK:CDFK',
      'IARE_VACDFABC:VACDFABC', 'IARE_VACDF:VACDF', 'IARE_VL:VL', 'IARE_CTMLX:CTMLX', 'IARE_CTLK:CTLK',
      'IARE_VACTLABC:VACTLABC', 'IARE_VACTL:VACTL', 'IARE_ESCENARIO:ESCENARIO', 'IARE_C:C'
    ]);
  });

  // Verificacion.vue:552-568: the three services receive the APS and the calendar month without the "-1" shift.
  it('queries the three summaries for the APS and the calendar month itself, without the month - 1 shift', () => {
    const { fixture, component, service } = crear();

    consultar(component);
    fixture.detectChanges();

    for (const fn of [service.infoemprdivi, service.infoapsemprdivi, service.infoapsrelleno]) {
      expect(fn).toHaveBeenLastCalledWith(5, 2025, 3);
      expect(fn.mock.calls.every((c: number[]) => c.length === 3 && c[0] === 5)).toBe(true);
    }
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('EMPRESA UNO');
    expect(component.filasRelleno()[0]['IARE_C_QRSMUNRECP']).toBe(8);
  });

  // Verificacion.vue:160-376 Resumen APS columns. QALMACEN (:296-306), CPEET (:307-317), QRTET (:318-328), NAA and NDA
  // (:362-375) are commented out in legacy, so they are not shown. (The T1 finding claimed legacy showed them; the
  // legacy source says otherwise -- the assertion now follows the legacy template.)
  it('shows the legacy Resumen APS columns, without the columns commented out in legacy', () => {
    const { component } = crear();

    expect(encabezados(component.columnasAps)).toEqual([
      'EMPR_NOMBRE:EMPRESA', 'IAED_QRTZ:QRTZ', 'IAED_CPE:CPE', 'IAED_T:T', 'IAED_VACRTABC:VACRTABC', 'IAED_VACRT:VACRT',
      'IAED_CRTZ:CRTZ', 'IAED_QBL:QBL', 'IAED_QLU:QLU', 'IAED_QR:QR', 'IAED_TAFA:TAFA', 'IAED_ND:ND', 'IAED_NA:NA',
      'IAED_QNA:QNA', 'IAED_TAFNA:TAFNA', 'IAED_QA:QA', 'IAED_APROVECHA:APROVECHA', 'IAED_CRTCOMP:CRTCOMP',
      'IAED_CDFCOMP:CDFCOMP', 'IAED_QRSCOMP:QRSCOMP'
    ]);
  });

  // Verificacion.vue:7 uses the shared Selector (APS + month calendar, Selector.vue:14-21) and loads one month.
  it('uses the APS + month selector and loads only that month (no semester)', () => {
    const { fixture, component, service } = crear();
    consultar(component);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-mes-selector')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Semestre');
    expect(service.infoemprdivi.mock.calls.filter((c: number[]) => c[1] === 2025 && c[2] !== 3)).toEqual([]);
    expect(component.filasEmpresa()).toEqual([expect.objectContaining({ EMPR_NOMBRE: 'EMPRESA UNO' })]);
  });

  // Selector.vue:153-158 defaults the period to today and Verificacion.vue:534-536,545 loads on mount with the stored APS.
  describe('on entry', () => {
    beforeEach(congelarHoy);
    afterEach(() => vi.useRealTimers());

    it('loads the stored APS for the current month when no period is stored', () => {
      const estado = estadoParametros();
      estado.useValue.getAps = vi.fn(() => 5 as unknown as null);
      const { service } = crear(estado);

      expect(service.infoemprdivi).toHaveBeenCalledWith(5, 2026, 1);
      expect(service.infoapsemprdivi).toHaveBeenCalledWith(5, 2026, 1);
      expect(service.infoapsrelleno).toHaveBeenCalledWith(5, 2026, 1);
    });
  });

  // Verificacion.vue:526-529 redondeo(valor, 4) (null/0 -> 0) on every numeric column except INED_QRSJ.
  it('rounds numeric cells to 4 decimals (null -> 0) except QRSJ', () => {
    const { fixture, component } = crear();
    consultar(component);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('1.2346');
    expect(texto).not.toContain('1.234567');
    expect(component.filasEmpresa()[0]['INED_LBLJ']).toBe(0);
    expect(component.filasEmpresa()[0]['INED_QRSJ']).toBe(2);
  });

  // Verificacion.vue template (lines 1-458) only renders the three summaries; there is no KPI block.
  it('shows no "Promedios Mensuales" placeholder block', () => {
    const { fixture, component } = crear();
    consultar(component);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.kpi-card').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Promedios Mensuales');
  });
});
