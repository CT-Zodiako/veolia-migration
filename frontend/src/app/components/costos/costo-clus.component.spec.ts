import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { CostoClusComponent } from './costo-clus.component';
import { CostosService } from '../../services/costos.service';
import { InformesService } from '../../services/informes.service';

const CLUS = [
  { apsaId: 5, costAnno: 2025, costMes: 12, paraCosto20021: 1, paraNombre: 'BARRIDO', costValor: 1234.5678 },
  { apsaId: 5, costAnno: 2025, costMes: 12, paraCosto20021: 2, paraNombre: 'PODA', costValor: 765.4322 }
];
const COMPORTA = [{ apsaId: 5, inedAnno: 2025, inedMes: 12, inedCp: 1, inedM2ccj: 2, inedM2lavj: 3, inedTij: 4, inedKlpj: 5, inedTmj: 6 }];

function setup(clusJson: unknown = null) {
  const costos = {
    consultarCostosClus: vi.fn(() => of(CLUS)),
    consultarComportaClus: vi.fn(() => of(COMPORTA))
  };
  const informes = { getClusJson: vi.fn(() => (clusJson ? of(clusJson) : throwError(() => new Error('sin documento')))) };
  const params = new BehaviorSubject(convertToParamMap({ aps: '5', anno: '2026', mes: '1' }));
  TestBed.configureTestingModule({
    imports: [CostoClusComponent],
    providers: [
      { provide: CostosService, useValue: costos },
      { provide: InformesService, useValue: informes },
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });
  // Charts (ApexCharts needs a real SVG engine) and selectors are rendered as plain elements.
  TestBed.overrideComponent(CostoClusComponent, {
    set: { imports: [CommonModule, TableModule, ButtonModule, ProgressBarModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(CostoClusComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, costos, informes, el: fixture.nativeElement as HTMLElement };
}

describe('CostoClusComponent — legacy views/procesos/Costos.vue', () => {
  // Legacy Costos.vue (getCostoClus): cosclus, CLUS JSON and comportaclus for the selected month - 1.
  it('queries the previous month', () => {
    const { costos, informes } = setup();

    expect(costos.consultarCostosClus).toHaveBeenCalledWith(5, 12, 2025);
    expect(costos.consultarComportaClus).toHaveBeenCalledWith(5, 12, 2025);
    expect(informes.getClusJson).toHaveBeenCalledWith(5, 2025, 12);
  });

  // Legacy Costos.vue:9-46: cards "Costo de Limpieza Urbana" and "Comportamiento CLUS"; without the JSON document the fallback
  // table Actividad / Valor with percentages (getPorcenje, 2 decimals) and total with 6 decimals (makeDataTable).
  it('renders the fallback Actividad / Valor table with legacy percentages and total', () => {
    const { component, el } = setup();

    expect(el.textContent).toContain('Costo de Limpieza Urbana');
    expect(el.textContent).toContain('Comportamiento CLUS');
    expect(Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual(['Actividad', 'Valor']);
    expect(component.totalClus()).toBe(2000);
    expect(component.porcentaje(1234.5678)).toBe(61.73);
    expect(component.donut().labels).toEqual(['BARRIDO', 'PODA']);
  });

  // Legacy CostoService.getCompClusChart: labels = month names, series = INED_* columns without the first three, "INED_" removed.
  it('plots the CLUS behaviour series', () => {
    const { component } = setup();

    expect(component.line().series.map((s) => s.name)).toEqual(['M2CCJ', 'M2LAVJ', 'TIJ', 'KLPJ', 'TMJ']);
  });

  // Legacy Costos.vue:18-20 GenericTable: when the JSON document exists it replaces the fallback table.
  it('shows the CLUS JSON table when the document exists', () => {
    const { el } = setup({ dataset: [{ nombre: 'Componentes CLUS', columns: ['ACTIVIDAD', 'PORCENTAJE'], data: [['BARRIDO', '61,73%']] }] });

    expect(el.textContent).toContain('Componentes CLUS');
    expect(Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual(['ACTIVIDAD', 'PORCENTAJE']);
  });

  // Legacy Costos.vue:27 shows `$${valor}` (valor = parseFloat(COST_VALOR.toFixed(6))) and :33 "TOTAL CLUS: $2000.".
  it('formats Valor and total like legacy "$1234.5678" / "TOTAL CLUS: $2000."', () => {
    const { el } = setup();

    const texto = el.textContent ?? '';
    expect(texto).toContain('$1234.5678');
    expect(texto).toContain('TOTAL CLUS: $2000.');
  });
});
