import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { redondearFilas } from '../../shared/redondeo.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn, valorMostrado } from '../shared/tabla-avanzada.component';
import { periodoInicial } from '../shared/periodo-inicial.util';

const DESCRIPCION_COSTOS: Record<string, string> = {
  CBL: 'Barrido y limpieza',
  CBLS: 'Barrido y limpieza',
  CRT: 'Recolección y transporte',
  CLUS: 'Limpieza urbana',
  CDF: 'Disposición final',
  CTL: 'Tratamiento de lixiviados',
  CCS: 'Comercialización'
};

@Component({
  selector: 'app-descuentos-costos',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent, ToastModule],
  providers: [MessageService],
  templateUrl: './descuentos-costos.component.html',
  styleUrl: './descuentos-costos.component.css'
})
export class DescuentosCostosComponent {
  readonly aps = signal<number | null>(null);
  private readonly periodo = periodoInicial(inject(ParametrosConsultaStateService));
  readonly anno = signal<number | null>(this.periodo.anno);
  readonly mes = signal<number | null>(this.periodo.mes);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  // design/suministros-pantallas/15: footer summary ("2 costos · todos en 0 (sin descuento aplicado)").
  readonly resumen = computed(() => {
    const filas = this.rows();
    if (!filas.length) return '';
    const conDescuento = filas.filter((f) => Number(f['DESC_VALOR'] ?? 0) !== 0).length;
    const costos = `${filas.length} ${filas.length === 1 ? 'costo' : 'costos'}`;
    return conDescuento === 0 ? `${costos} · todos en 0 (sin descuento aplicado)` : `${costos} · ${conDescuento} con descuento`;
  });

  readonly valorMostrado = valorMostrado;

  /** CRA 720 name of the cost code shown under it (empty when unknown). */
  descripcionCosto(codigo: unknown): string {
    return DESCRIPCION_COSTOS[String(codigo ?? '').trim().toUpperCase()] ?? '';
  }

  readonly columnas: TablaColumn[] = [
    { field: 'PARA_NOMBRE', header: 'COSTO', filtrable: true },
    { field: 'DESC_VALOR', header: 'DESCUENTO', numero: true }
  ];

  // Read-only like legacy DescuentosDos.vue (menu 304): the user chose to keep add/edit only in the Descuentos screen (605).

  private readonly destroyRef = inject(DestroyRef);
  private readonly consultarTrigger$ = new Subject<void>();

  constructor(private readonly service: InfoGerencialService) {
    // switchMap cancela la consulta anterior si todavía está en vuelo cuando el
    // usuario cambia de selector de nuevo -- evita que una respuesta vieja pise
    // el resultado del período correcto.
    this.consultarTrigger$
      .pipe(
        switchMap(() => {
          const aps = this.aps();
          const anno = this.anno();
          const mes = this.mes();
          if (aps === null || anno === null || mes === null) return EMPTY;

          this.loading.set(true);
          const periodo = periodoAnterior(anno, mes);
          return this.service.getApsDesCost(aps, periodo.anno, periodo.mes).pipe(
            catchError(() => {
              this.rows.set([]);
              this.loading.set(false);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((r) => {
        this.rows.set(redondearFilas(r.data || [], { DESC_VALOR: 4 }));
        this.loading.set(false);
      });
  }

  onApsChange(value: number | null): void {
    this.aps.set(value);
    this.consultarSiCompleto();
  }

  onAnnoChange(value: number | null): void {
    this.anno.set(value);
    this.consultarSiCompleto();
  }

  onMesChange(value: number | null): void {
    this.mes.set(value);
    this.consultarSiCompleto();
  }

  private consultarSiCompleto(): void {
    if (this.aps() === null || this.anno() === null || this.mes() === null) {
      this.rows.set([]);
      return;
    }
    this.consultarTrigger$.next();
  }
}
