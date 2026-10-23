import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { InfRuralComponent } from './inf-rural.component';
import { SuministrosService } from '../../../../services/suministros.service';

function setup(aps = 5, anno = 2026, semestre = 1) {
  const service = { guardarQRTRural: vi.fn((_payload: unknown) => of({ data: 1 })) };
  TestBed.configureTestingModule({
    imports: [InfRuralComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  const fixture = TestBed.createComponent(InfRuralComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('semestre', semestre);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

describe('InfRuralComponent (702 Inf. Rural) — legacy CargueSemestralRural.vue', () => {
  afterEach(() => vi.useRealTimers());

  // Legacy CargueSemestralRural.vue:18: one input labelled "QRT Rural".
  it('shows the legacy QRT Rural field', () => {
    const { fixture } = setup();

    expect((fixture.nativeElement as HTMLElement).querySelector('label')?.textContent?.trim()).toBe('QRT Rural');
  });

  // Legacy CargueSemestralRural.vue (guardarData): { aps, anno, semestre: stSemester, qrtRural }.
  it('saves aps, semestre and the QRT Rural value', () => {
    const { component, service } = setup(5, 2026, 1);
    component.qrtRural.set(12.5);

    component.guardar();

    expect(service.guardarQRTRural).toHaveBeenCalledTimes(1);
    expect(service.guardarQRTRural.mock.calls[0][0]).toMatchObject({ aps: 5, semestre: 1, qrtRural: 12.5 });
  });

  // Legacy CargueSemestralRural.vue (guardarData): anno = year of (stDate - 1 month), not the semester selector year.
  it('sends the year of the current date minus one month like legacy', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 15));
    const { component, service } = setup(5, 2026, 1);
    component.qrtRural.set(12.5);

    component.guardar();

    expect((service.guardarQRTRural.mock.calls[0][0] as Record<string, unknown>)['anno']).toBe(2025);
  });

  // Legacy sends the raw (possibly null) input; CargueSemestralRural.vue toasts "QRT Rural Guardado".
  it('sends a blank value as null and shows the legacy "QRT Rural Guardado"', () => {
    const { component, service } = setup();

    component.guardar();

    expect((service.guardarQRTRural.mock.calls[0][0] as Record<string, unknown>)['qrtRural']).toBeNull();
    expect(component.estado()).toBe('QRT Rural Guardado');
  });
});
