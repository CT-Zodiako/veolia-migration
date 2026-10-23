import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

// jsdom has no ResizeObserver; PrimeNG tabs and frozen columns observe their size.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

/** Saved año/mes stub for the shared selectors (null = nothing saved yet). */
export function estadoParametros(anno: number | null = null, mes: number | null = null) {
  return {
    provide: ParametrosConsultaStateService,
    useValue: {
      getAps: vi.fn(() => null),
      getAnno: vi.fn(() => anno),
      getMes: vi.fn(() => mes),
      setAps: vi.fn(),
      setAnno: vi.fn(),
      setMes: vi.fn()
    }
  };
}

/** Freezes "today" at 15 Jan 2026, so the legacy default period (today - 1 month) is Dec 2025. */
export function congelarHoy(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 0, 15));
}
