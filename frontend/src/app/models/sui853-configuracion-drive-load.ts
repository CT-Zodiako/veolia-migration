import { DestroyRef, Directive, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import {
  DriveLoadError,
  DriveLoadResult,
  LegacyEnvelope,
  Sui853ConfiguracionService
} from '../services/sui853-configuracion.service';

export interface DriveLoadOption<T> {
  label: string;
  value: T;
}

/** Legacy month names: the Drive files and folders are named with them ("Salamina-SUI Abril 2024"). */
export const DRIVE_LOAD_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const;

export function buildDriveLoadYears(start = 2018, end = 2030): DriveLoadOption<number>[] {
  const years: DriveLoadOption<number>[] = [];
  for (let year = start; year <= end; year++) years.push({ label: String(year), value: year });
  return years;
}

/** Shared state and flow of the SUI853 Drive load screens (legacy residuosGenerados.vue / informesGenerados[Mes].vue). */
@Directive()
export abstract class Sui853DriveLoadScreen implements OnInit {
  protected readonly service = inject(Sui853ConfiguracionService);
  private readonly destroyRef = inject(DestroyRef);

  abstract readonly withMonth: boolean;
  readonly years = buildDriveLoadYears();
  readonly months: DriveLoadOption<string>[] = DRIVE_LOAD_MONTHS.map(month => ({ label: month, value: month }));

  apsOptions: DriveLoadOption<number>[] = [];
  selectedApsId: number | null = null;
  selectedYear: number | null = null;
  selectedMonth: string | null = null;
  loadingAps = false;
  loading = false;
  result: DriveLoadResult | null = null;
  error = '';
  errorDetail: DriveLoadError | null = null;
  showErrorDialog = false;

  get canLoad(): boolean {
    return !this.loading && this.selectedApsId != null && this.selectedYear != null && (!this.withMonth || !!this.selectedMonth);
  }

  get rowJson(): string {
    return this.errorDetail?.row ? JSON.stringify(this.errorDetail.row, null, 2) : '';
  }

  ngOnInit(): void {
    this.loadingAps = true;
    this.service.tcfgAps()
      .pipe(finalize(() => { this.loadingAps = false; }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.apsOptions = (response.data ?? []).map(item => ({ label: item.NOMBRE_APS, value: item.TCFG_APS_ID }));
        },
        error: () => { this.error = 'Error cargando APS.'; }
      });
  }

  load(): void {
    if (!this.canLoad) return;
    this.result = null;
    this.error = '';
    this.errorDetail = null;
    this.showErrorDialog = false;
    this.loading = true;
    this.request(this.selectedApsId!, this.selectedYear!, this.withMonth ? this.selectedMonth : null)
      .pipe(finalize(() => { this.loading = false; }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => { this.result = response.data; },
        error: (err: HttpErrorResponse) => {
          const detail = (err?.error?.data && typeof err.error.data === 'object') ? err.error.data as DriveLoadError : null;
          this.error = detail?.message || 'Error al procesar los datos.';
          this.errorDetail = detail;
          this.showErrorDialog = detail !== null;
        }
      });
  }

  protected abstract request(apsId: number, anno: number, mes: string | null): Observable<LegacyEnvelope<DriveLoadResult>>;
}
