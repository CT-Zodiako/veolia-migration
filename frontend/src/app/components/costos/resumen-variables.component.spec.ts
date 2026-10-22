import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ResumenVariablesComponent } from './resumen-variables.component';
import { InformesService } from '../../services/informes.service';

function setup(respuesta: unknown) {
  const informes = { getCostosJson: vi.fn(() => of(respuesta)) };
  TestBed.configureTestingModule({ imports: [ResumenVariablesComponent], providers: [{ provide: InformesService, useValue: informes }] });
  const fixture = TestBed.createComponent(ResumenVariablesComponent);
  const titulos: string[] = [];
  fixture.componentInstance.semestreTituloChange.subscribe((t) => titulos.push(t));
  fixture.componentRef.setInput('aps', 5);
  fixture.componentRef.setInput('anno', 2025);
  fixture.componentRef.setInput('mes', 12);
  fixture.detectChanges();
  return { fixture, informes, titulos, el: fixture.nativeElement as HTMLElement };
}

describe('ResumenVariablesComponent — legacy views/procesos/Calculo.vue getInforme', () => {
  // Legacy Calculo.vue (getInforme): informes costos JSON for (aps, anno, mes); semestre -> fieldset legend, dataset -> one table per item.
  it('renders the semester title and one table per dataset item', () => {
    const { informes, titulos, el } = setup({
      semestre: 'SEMESTRE 2 - 2025',
      dataset: [
        { nombre: 'Toneladas', columns: ['VARIABLE', 'VALOR'], data: [['QRT', '10']] },
        { nombre: 'Usuarios', columns: ['VARIABLE', 'VALOR'], data: [['N', '5']] }
      ]
    });

    expect(informes.getCostosJson).toHaveBeenCalledWith(5, 2025, 12);
    expect(titulos).toEqual(['SEMESTRE 2 - 2025']);
    expect(el.querySelector('h4')?.textContent?.trim()).toBe('SEMESTRE 2 - 2025');
    expect(Array.from(el.querySelectorAll('h5')).map((h) => h.textContent?.trim())).toEqual(['Toneladas', 'Usuarios']);
  });

  // Legacy Calculo.vue:21-30: without a semester document (semestreTitulo '') the fieldset is hidden and the monthly view shows.
  it('emits an empty title and renders nothing for a monthly period', () => {
    const { titulos, el } = setup({ semestre: '', dataset: [] });

    expect(titulos).toEqual(['']);
    expect(el.querySelector('h4')).toBeNull();
  });
});
