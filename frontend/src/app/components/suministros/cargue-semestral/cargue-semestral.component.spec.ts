import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { CargueSemestralComponent } from './cargue-semestral.component';
import { SuministrosService } from '../../../services/suministros.service';

function render(cantidadTarifas: number) {
  const service = {
    getcanCertificateSemestral: vi.fn(() => of({ data: cantidadTarifas })),
    existeRelleno: vi.fn(() => of({ data: false }))
  };

  TestBed.configureTestingModule({
    imports: [CargueSemestralComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn() } }
    ]
  });
  // Child load screens and selectors are out of scope here: render them as plain elements.
  TestBed.overrideComponent(CargueSemestralComponent, {
    set: { imports: [CommonModule, FormsModule, MessageModule, DialogModule, ...CommonPrimeNgModules], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });

  const fixture = TestBed.createComponent(CargueSemestralComponent);
  const component = fixture.componentInstance;
  component.onApsChange(5);
  component.onAnnoChange(2026);
  component.onSemestreChange(1);
  fixture.detectChanges();

  const el = fixture.nativeElement as HTMLElement;
  const certificar = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('CERTIFICAR'))!;
  const tabs = Array.from(el.querySelectorAll('p-tab')).map((t) => t.textContent?.trim());
  return { component, service, certificar, tabs, el };
}

describe('CargueSemestralComponent (702)', () => {
  // PrimeNG TabList observes its size; jsdom has no ResizeObserver.
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

  // Legacy CargueSem.vue:10 shows the tabs whenever an APS is selected; :208-212 only toggles CERTIFICAR.
  it('keeps the load tabs visible and disables CERTIFICAR when tariffs already exist', () => {
    const { service, certificar, tabs, el } = render(3);

    expect(service.getcanCertificateSemestral).toHaveBeenCalledWith({ aps: 5, anno: 2026, semestre: 1 });
    expect(tabs).toEqual(['Inf. Propia', 'Inf. Competidor', 'Inf. Usuarios']);
    expect(el.querySelector('app-inf-propia-sem')).not.toBeNull();
    expect(certificar.disabled).toBe(true);
  });

  it('shows the same tabs with CERTIFICAR enabled when no tariffs exist', () => {
    const { certificar, tabs } = render(0);

    expect(tabs).toEqual(['Inf. Propia', 'Inf. Competidor', 'Inf. Usuarios']);
    expect(certificar.disabled).toBe(false);
  });
});
