import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CARD_COSTO_COLORS, CuadriculaCostoComponent } from './cuadricula-costo.component';
import { CostoItem } from '../../models/costos.models';

function item(nomCosto: string, valor: number, variacion: number): CostoItem {
  return { apsCosto: 5, empresaCosto: 1, codCosto: 1, nomCosto, annoCosto: 2025, mesCosto: 12, aCobrar: null, valor, variacion };
}

function setup(costos: CostoItem[]) {
  const router = { navigate: vi.fn() };
  TestBed.configureTestingModule({ imports: [CuadriculaCostoComponent], providers: [{ provide: Router, useValue: router }] });
  const fixture = TestBed.createComponent(CuadriculaCostoComponent);
  fixture.componentInstance.costos = costos;
  fixture.detectChanges();
  const tarjetas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.tarjeta-costo')) as HTMLElement[];
  return { fixture, router, tarjetas };
}

describe('CuadriculaCostoComponent — legacy components/CuadriculaCosto.vue', () => {
  // Legacy CuadriculaCosto.vue:4-14 + :24-35: one card per cost (NOMCOSTO, VALOR, "% VARIACION*100") colored by index % 10.
  it('renders one card per cost with the legacy palette and fields', () => {
    const { tarjetas } = setup([item('CBL', 12.346, 0.0567), item('CLUS', 3, -0.1)]);

    expect(CARD_COSTO_COLORS).toEqual(['#0d5ba8', '#db0000', '#83db00', '#ebc22f', '#9b00de', '#2ea39d', '#27b800', '#72a32e', '#ff028c', '#d6b20f']);
    expect(tarjetas.map((t) => t.querySelector('.tarjeta-titulo')?.textContent?.trim())).toEqual(['CBL', 'CLUS']);
    expect(tarjetas.map((t) => t.querySelector('.tarjeta-valor')?.textContent?.trim())).toEqual(['12.35', '3']);
    expect(tarjetas.map((t) => t.querySelector('.tarjeta-variacion')?.textContent?.trim())).toEqual(['% 5.67', '% -10']);
  });

  // Legacy CuadriculaCosto.vue:44-48: only the CLUS card navigates (to the CLUS detail screen, legacy /costo -> new /costo-clus).
  it('navigates to the CLUS detail only from the CLUS card', () => {
    const { tarjetas, router } = setup([item('CBL', 1, 0), item('CLUS', 3, 0)]);

    tarjetas[0].click();
    tarjetas[1].click();

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/costo-clus'], { queryParamsHandling: 'preserve' });
  });

  // Legacy CuadriculaCosto.vue:10: parseFloat(VALOR.toFixed(2)) -> 1234567.89 (no thousands separators).
  it.skip('PARITY-FINDING: VALOR is shown with thousands separators (1,234,567.89) instead of legacy 1234567.89', () => {
    const { tarjetas } = setup([item('CBL', 1234567.891, 0)]);

    expect(tarjetas[0].querySelector('.tarjeta-valor')?.textContent?.trim()).toBe('1234567.89');
  });
});
