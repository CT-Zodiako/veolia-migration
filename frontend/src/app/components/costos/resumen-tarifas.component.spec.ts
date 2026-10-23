import { TestBed } from '@angular/core/testing';
import { ResumenTarifasComponent } from './resumen-tarifas.component';
import { TarifaRow } from '../../services/tarifas.service';

const FILA = {
  CFT: 1.1234567, CVNA: 2, DES_ANTIG: 3, DISTANCIA: 4, SALINIDAD: 5, PER_ADD: 6, ESCENARIO: 7, TRA: 8, TRBL: 9, TRLU: 10, TRRA: 11
} as unknown as TarifaRow;

function render(resumen: TarifaRow[]): HTMLElement {
  TestBed.configureTestingModule({ imports: [ResumenTarifasComponent] });
  const fixture = TestBed.createComponent(ResumenTarifasComponent);
  fixture.componentInstance.resumen = resumen;
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ResumenTarifasComponent — legacy views/procesos/Calculo.vue DataTable dataGrid', () => {
  // Legacy Calculo.vue:82-137: columns CFT, CVNA, DES ANTI, DISTANCIA, SALINIDAD, PER. ADICIONAL, ESCENARIO, TRA, TRBL, TRLU, TRRA.
  it('renders the legacy columns in order', () => {
    const el = render([FILA]);

    expect(Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual([
      'CFT', 'CVNA', 'DES ANTI', 'DISTANCIA', 'SALINIDAD', 'PER. ADICIONAL', 'ESCENARIO', 'TRA', 'TRBL', 'TRLU', 'TRRA'
    ]);
    expect(Array.from(el.querySelectorAll('tbody td')).slice(1).map((td) => td.textContent?.trim())).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
  });

  // Legacy Calculo.vue:84-86: every value goes through redondeo(valor, 6).
  it('rounds values to 6 decimals like legacy redondeo(valor, 6)', () => {
    const el = render([FILA]);

    expect(el.querySelector('tbody td')?.textContent?.trim()).toBe('1.123457');
  });
});
