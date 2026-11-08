import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { Observable, Subject, of, throwError } from 'rxjs';
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

// odd/tasks/verificacion-promedio-semestre.md S2: fauco_getvariablesaps(1011, 2026, 8) observed against real Oracle.
const variablesS2 = {
  c: 0, cdf: 62578.22, crt: 285055.5, lbl: 164265.7867, n: 365504.5, na: 1518, naa: 0, nd: 2404.83, qa: 1142.36,
  qbl: 1447.37, qlu: 377.5633, qna: 15082.1667, qr: 46.2917, qrs: 0, qrsmunrecp: 0, qrt: 39125.6383, tafna: 3364.6055, vl: 0
};

function crear(estado = estadoParametros(2025, 3), variables: () => Observable<unknown> = () =>
  of({ status: 'success', data: { aps: 5, anno: 2025, mes: 3, variables: variablesS2 }, message: 'OK' })) {
  const service = {
    getVariablesAps: vi.fn(variables),
    infoemprdivi: vi.fn(() => of({ status: 'success', data: [empresa], message: 'OK' })),
    infoapsemprdivi: vi.fn(() => of({ status: 'success', data: [aps], message: 'OK' })),
    infoapsrelleno: vi.fn(() => of({ status: 'success', data: [relleno], message: 'OK' }))
  };
  // The APS selector restores the stored APS only after loading the session user's assigned list.
  localStorage.setItem('usuario', JSON.stringify({ SISU_ID: 7 }));
  TestBed.configureTestingModule({
    imports: [VerificacionApsComponent],
    providers: [
      { provide: InfoGerencialService, useValue: service },
      { provide: EmpresasService, useValue: { getEmpresasPropias: vi.fn(() => of([])) } },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [{ APSA_ID: 5, APSA_NOMAPS: 'APS 5' }] })) } },
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
  afterEach(() => localStorage.removeItem('usuario'));

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
    // The new "Promedio Semestre Anterior" section is on demand only: loading the tables never queries it.
    expect(service.getVariablesAps).not.toHaveBeenCalled();
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

  // odd/tasks/verificacion-promedio-semestre.md S3-S4: on-demand "Promedio Semestre Anterior" (artboard 05).
  describe('Promedio Semestre Anterior', () => {
    const boton = (f: { nativeElement: HTMLElement }) =>
      f.nativeElement.querySelector('.btn-promedio button') as HTMLButtonElement;
    const seccion = (f: { nativeElement: HTMLElement }) =>
      f.nativeElement.querySelector('#promedio-semestre') as HTMLElement;
    const tile = (f: { nativeElement: HTMLElement }, grupo: string, codigo: string) => {
      const card = f.nativeElement.querySelector(`.gcard[aria-label="${grupo}"]`) as HTMLElement | null;
      const li = Array.from(card?.querySelectorAll('.tile') ?? []).find(
        (t) => t.querySelector('.code')?.textContent?.trim() === codigo
      );
      return li?.querySelector('.v')?.textContent?.trim();
    };
    function consultarPromedio(f: ReturnType<typeof crear>['fixture'], c: VerificacionApsComponent) {
      consultar(c);
      f.detectChanges();
      boton(f).click();
      f.detectChanges();
    }

    it('places the section right after the filters card and before the tabs card, empty until consulted', () => {
      const { fixture } = crear();
      const cards = Array.from(fixture.nativeElement.querySelectorAll(':scope > .card-section')) as HTMLElement[];

      expect(cards[1].id).toBe('promedio-semestre');
      expect(cards[2].querySelector('p-tabs')).not.toBeNull();
      expect(seccion(fixture).querySelector('h2')?.textContent?.trim()).toBe('Promedio Semestre Anterior');
      expect(seccion(fixture).textContent).toContain('Sin consultar');
      expect(seccion(fixture).querySelectorAll('.gcard').length).toBe(0);
    });

    it('keeps the button disabled until APS, Año and Mes are set', () => {
      const { fixture, component, service } = crear();

      expect(boton(fixture).textContent).toContain('Consultar promedio semestre anterior');
      expect(boton(fixture).disabled).toBe(true);

      consultar(component);
      fixture.detectChanges();
      expect(boton(fixture).disabled).toBe(false);
      expect(service.getVariablesAps).not.toHaveBeenCalled();
    });

    it('queries the service with aps, anno and mes only when the button is pressed', () => {
      const { fixture, component, service } = crear();

      consultarPromedio(fixture, component);

      expect(service.getVariablesAps).toHaveBeenCalledTimes(1);
      expect(service.getVariablesAps).toHaveBeenCalledWith(5, 2025, 3);
    });

    it('shows "Consultando…" while loading and "Actualizar" after the data arrives', () => {
      const respuesta = new Subject<unknown>();
      const { fixture, component } = crear(estadoParametros(2025, 3), () => respuesta);

      consultarPromedio(fixture, component);
      expect(boton(fixture).textContent).toContain('Consultando…');
      expect(boton(fixture).disabled).toBe(true);

      respuesta.next({ status: 'success', data: { aps: 5, anno: 2025, mes: 3, variables: variablesS2 }, message: 'OK' });
      respuesta.complete();
      fixture.detectChanges();
      expect(boton(fixture).textContent).toContain('Actualizar');
      expect(boton(fixture).disabled).toBe(false);
    });

    // design/pantallas-implementadas/03-verificacion-claro.html (comment w3vg779g "y eso que se pueda colapsar").
    it('collapses and expands the consulted groups from the header button and remembers it', () => {
      localStorage.removeItem('verificacion-promedio-plegado');
      const { fixture, component } = crear();
      const toggle = () => seccion(fixture).querySelector('.promedio-toggle') as HTMLButtonElement | null;

      expect(toggle()).toBeNull();
      consultarPromedio(fixture, component);
      expect(toggle()?.getAttribute('aria-expanded')).toBe('true');
      expect(seccion(fixture).querySelectorAll('.gcard').length).toBe(4);

      toggle()!.click();
      fixture.detectChanges();
      expect(toggle()?.getAttribute('aria-expanded')).toBe('false');
      expect(toggle()?.getAttribute('aria-label')).toBe('Desplegar promedio semestre anterior');
      expect(seccion(fixture).querySelectorAll('.gcard').length).toBe(0);
      expect(seccion(fixture).textContent).toContain('Consultado hace un momento');
      expect(localStorage.getItem('verificacion-promedio-plegado')).toBe('true');

      toggle()!.click();
      fixture.detectChanges();
      expect(toggle()?.getAttribute('aria-expanded')).toBe('true');
      expect(seccion(fixture).querySelectorAll('.gcard').length).toBe(4);
      expect(localStorage.getItem('verificacion-promedio-plegado')).toBe('false');
    });

    it('starts collapsed when the user left it collapsed', () => {
      localStorage.setItem('verificacion-promedio-plegado', 'true');
      const { fixture, component } = crear();

      consultarPromedio(fixture, component);

      expect((seccion(fixture).querySelector('.promedio-toggle') as HTMLElement).getAttribute('aria-expanded')).toBe('false');
      expect(seccion(fixture).querySelectorAll('.gcard').length).toBe(0);
      localStorage.removeItem('verificacion-promedio-plegado');
    });

    it('renders the 18 S2 values under their groups and codes with comma decimals', () => {
      const { fixture, component } = crear();

      consultarPromedio(fixture, component);

      const esperado: [string, string, string][] = [
        ['Toneladas', 'QRT', '39125,6383'], ['Toneladas', 'QBL', '1447,37'], ['Toneladas', 'QLU', '377,5633'],
        ['Toneladas', 'QR', '46,2917'], ['Toneladas', 'QNA', '15082,1667'], ['Toneladas', 'Qa', '1142,36'],
        ['Toneladas', 'QRS', '0'], ['Toneladas', 'QRSmun', '0'], ['Toneladas', 'C', '0'], ['Toneladas', 'TAFNA', '3364,6055'],
        ['Suscriptores', 'N', '365504,5'], ['Suscriptores', 'Na', '1518'], ['Suscriptores', 'Naa', '0'],
        ['Suscriptores', 'Nd', '2404,83'],
        ['Otros', 'Lbl', '164265,7867'], ['Otros', 'VL', '0'],
        ['Costos', 'CRTcomp', '285055,5'], ['Costos', 'CDFcomp', '62578,22']
      ];
      for (const [grupo, codigo, valor] of esperado) expect(`${grupo}/${codigo}=${tile(fixture, grupo, codigo)}`).toBe(`${grupo}/${codigo}=${valor}`);
      expect(seccion(fixture).querySelectorAll('.tile').length).toBe(18);
      expect(seccion(fixture).textContent).not.toContain('Sin consultar');
      expect(seccion(fixture).textContent).toContain('Consultado hace un momento');
    });

    it('shows the subtitle with the selected month, year and APS name', () => {
      const { fixture, component } = crear();

      consultarPromedio(fixture, component);

      expect(seccion(fixture).textContent).toContain('Semestre anterior a Marzo 2025 · APS APS 5');
    });

    it('rounds to at most 4 decimals and shows "—" for a null variable', () => {
      const { fixture, component } = crear(estadoParametros(2025, 3), () =>
        of({ status: 'success', data: { aps: 5, anno: 2025, mes: 3, variables: { ...variablesS2, qrt: null, lbl: 1.234567 } }, message: 'OK' }));

      consultarPromedio(fixture, component);

      expect(tile(fixture, 'Toneladas', 'QRT')).toBe('—');
      expect(tile(fixture, 'Otros', 'Lbl')).toBe('1,2346');
    });

    it('announces the load politely and moves the focus to the section heading', () => {
      const { fixture, component } = crear();

      consultarPromedio(fixture, component);

      const live = seccion(fixture).querySelector('[aria-live="polite"]') as HTMLElement;
      expect(live.textContent).toContain('Promedio semestre anterior cargado');
      expect(document.activeElement).toBe(seccion(fixture).querySelector('h2'));
    });

    it('clears the data back to the empty state when APS, Año or Mes change', () => {
      const { fixture, component } = crear();

      for (const cambiar of [() => component.onMesChange(4), () => component.onAnnoChange(2024), () => component.onApsChange(6)]) {
        consultarPromedio(fixture, component);
        expect(seccion(fixture).querySelectorAll('.tile').length).toBe(18);

        cambiar();
        fixture.detectChanges();
        expect(seccion(fixture).querySelectorAll('.tile').length).toBe(0);
        expect(seccion(fixture).textContent).toContain('Sin consultar');
        expect(boton(fixture).textContent).toContain('Consultar promedio semestre anterior');
      }
    });

    it('returns to the empty state on a failed request without a component toast', () => {
      const { fixture, component } = crear(estadoParametros(2025, 3), () => throwError(() => ({ status: 500 })));
      const messages = fixture.debugElement.injector.get(MessageService);
      const add = vi.spyOn(messages, 'add');

      consultarPromedio(fixture, component);

      expect(add).not.toHaveBeenCalled();
      expect(seccion(fixture).textContent).toContain('Sin consultar');
      expect(seccion(fixture).querySelectorAll('.tile').length).toBe(0);
      expect(boton(fixture).textContent).toContain('Consultar promedio semestre anterior');
      expect(boton(fixture).disabled).toBe(false);
    });
  });
});
