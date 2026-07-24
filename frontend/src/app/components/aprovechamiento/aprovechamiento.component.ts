import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { EMPTY, Subject } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AprovechamientoService } from '../../services/aprovechamiento.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';

@Component({
  selector: 'app-aprovechamiento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...CommonPrimeNgModules,
    ToastModule,
    ToggleSwitchModule,
    ApsSelectorComponent,
    AnnoSelectorComponent,
    MesSelectorComponent
  ],
  providers: [MessageService],
  templateUrl: './aprovechamiento.component.html',
  styleUrls: ['./aprovechamiento.component.css']
})
export class AprovechamientoComponent {
  aps = signal<number | null>(null);
  anno = signal<number | null>(new Date().getFullYear());
  mes = signal<number | null>(new Date().getMonth() + 1);

  loading = signal(false);
  consultado = signal(false);
  activar = signal(false);

  private readonly destroyRef = inject(DestroyRef);
  private readonly consultarTrigger$ = new Subject<void>();

  constructor(
    private readonly service: AprovechamientoService,
    private readonly messages: MessageService,
    private readonly confirmation: ConfirmationService
  ) {
    // switchMap cancela la consulta anterior si todavía está en vuelo cuando el
    // usuario cambia de selector de nuevo -- evita que una respuesta vieja pise
    // el resultado del período correcto.
    this.consultarTrigger$
      .pipe(
        switchMap(() => {
          const aps = this.aps();
          const anno = this.anno();
          const mes = this.mes();
          if (!aps || !anno || !mes) return EMPTY;

          this.loading.set(true);
          const periodo = periodoAnterior(anno, mes);
          return this.service.consultar({ aps, anno: periodo.anno, mes: periodo.mes }).pipe(
            catchError((err: any) => {
              this.loading.set(false);
              this.messages.add({ severity: 'error', summary: 'Activar Aprovechamiento', detail: err?.error?.message || 'Error al consultar.' });
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.loading.set(false);
        this.consultado.set(true);
        this.activar.set(res.data?.aproActivar === 1);
      });
  }

  onApsChange(value: number | null): void {
    this.aps.set(value);
    this.consultar();
  }

  onAnnoChange(value: number | null): void {
    this.anno.set(value);
    this.consultar();
  }

  onMesChange(value: number | null): void {
    this.mes.set(value);
    this.consultar();
  }

  confirmarAplicar(): void {
    const nuevoValor = this.activar();
    this.confirmation.confirm({
      header: 'Cobro de aprovechamiento',
      message: nuevoValor
        ? '¿Confirmás ACTIVAR el cobro de aprovechamiento sin tener QA para este período?'
        : '¿Confirmás DESACTIVAR el cobro de aprovechamiento sin tener QA para este período?',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Aplicar',
      rejectLabel: 'Cancelar',
      accept: () => this.aplicar(nuevoValor)
    });
  }

  private aplicar(activar: boolean): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    if (!aps || anno === null || mes === null) return;

    const periodo = periodoAnterior(anno, mes);
    this.loading.set(true);
    this.service.actualizar({ aps, anno: periodo.anno, mes: periodo.mes, activar }).subscribe({
      next: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'success', summary: 'Activar Aprovechamiento', detail: 'Estado actualizado correctamente.' });
        this.consultar();
      },
      error: (err) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Activar Aprovechamiento', detail: err?.error?.message || 'No se pudo actualizar.' });
      }
    });
  }

  private consultar(): void {
    if (!this.aps() || !this.anno() || !this.mes()) return;
    this.consultarTrigger$.next();
  }
}
