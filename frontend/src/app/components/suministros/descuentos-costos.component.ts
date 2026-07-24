import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

@Component({
  selector: 'app-descuentos-costos',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './descuentos-costos.component.html',
  styleUrl: './descuentos-costos.component.css'
})
export class DescuentosCostosComponent {
  readonly aps = signal<number | null>(null);
  readonly anno = signal<number | null>(new Date().getFullYear());
  readonly mes = signal<number | null>(new Date().getMonth() + 1);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columnas: TablaColumn[] = [
    { field: 'PARA_NOMBRE', header: 'Costo', filtrable: true },
    { field: 'DESC_VALOR', header: 'Descuento', numero: true }
  ];

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
