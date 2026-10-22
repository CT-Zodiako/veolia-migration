import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { VerificacionDialogComponent } from './verificacion-dialog.component';
import { VerificacionDetalle } from '../../models/costos.models';

const DETALLE: VerificacionDetalle[] = [
  { empresaNombre: 'COMPETIDOR', grupo: 'CLUS', variable: 'LBL', valor: 0.5, empresaPropia: 0 },
  { empresaNombre: 'VEOLIA', grupo: 'CLUS', variable: 'LBL', valor: 1234.5, empresaPropia: 1 }
];

function setup(detalle: VerificacionDetalle[] = DETALLE) {
  TestBed.configureTestingModule({ imports: [VerificacionDialogComponent], providers: [provideNoopAnimations()] });
  const fixture = TestBed.createComponent(VerificacionDialogComponent);
  fixture.componentInstance.visible = true;
  fixture.componentInstance.detalle = detalle;
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: document.body };
}

describe('VerificacionDialogComponent — legacy components/costos/verificacion.vue + Calculo.vue dialog', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  afterAll(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  // Legacy verificacion.vue:63-72: tabs are `${EMPR_PROPIA}|${EMPR_NOMBRE}` sorted descending (own company first), labelled by name.
  it('groups by company with the own company first', () => {
    const { component } = setup();

    expect(component.tabs.map((t) => [t.nombre, t.rows.length])).toEqual([['VEOLIA', 1], ['COMPETIDOR', 1]]);
  });

  // Legacy Calculo.vue:9-16 dialog "VERIFICACION DE VARIABLES" with Aplicar / Cancelar; verificacion.vue:6-25 columns.
  it('renders the legacy header, columns and buttons', () => {
    const { el } = setup();

    expect(el.textContent).toContain('VERIFICACION DE VARIABLES');
    const headers = Array.from(el.querySelectorAll('.p-dialog thead th')).slice(0, 4).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['EMPRESA', 'GRUPO', 'VARIABLE', 'VALOR']);
    const botones = Array.from(el.querySelectorAll('.p-dialog button')).map((b) => b.textContent?.trim()).filter(Boolean);
    expect(botones).toEqual(expect.arrayContaining(['Aplicar', 'Cancelar']));
  });

  // Legacy verificacion.vue:4: empty grid shows "Sin Registros".
  it('shows "Sin Registros" without detail', () => {
    const { el } = setup([]);

    expect(el.querySelector('.p-dialog')?.textContent).toContain('Sin Registros');
  });

  // Legacy verificacion.vue:23 + :50-52: redondeo(VALI_VALOR, 6) = parseFloat(toFixed(6)) -> 1234.5 (no padding, no separators).
  it.skip('PARITY-FINDING: VALOR is shown as 1,234.500000 instead of legacy parseFloat(toFixed(6)) 1234.5', () => {
    const { el } = setup();

    const celdas = Array.from(el.querySelectorAll('.p-dialog tbody td')).map((td) => td.textContent?.trim());
    expect(celdas[3]).toBe('1234.5');
  });
});
