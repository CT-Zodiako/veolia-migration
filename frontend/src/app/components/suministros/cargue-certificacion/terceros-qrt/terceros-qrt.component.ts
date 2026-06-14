import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { interval, Subscription, switchMap } from 'rxjs';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { CargueActual, EjecucionInicio, ValidacionInicio } from '../../../../models/fase1-certificacion.models';
import { Fase1CertificacionService } from '../../../../services/fase1-certificacion.service';

@Component({
  selector: 'app-terceros-qrt',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-card>
      <button pButton type="button" icon="pi pi-play" label="Ejecutar Certificación" [loading]="loading()" [disabled]="!cargueActual || !validacion" (click)="ejecutar()"></button>
      <p class="mt-3" *ngIf="estado()">Estado ejecución: <strong>{{ estado() }}</strong></p>
      <p class="mt-2" *ngIf="progreso() >= 0">Progreso: {{ progreso() }}%</p>
    </p-card>
  `
})
export class TercerosQrtComponent implements OnDestroy {
  @Input() cargueActual: CargueActual | null = null;
  @Input() validacion: ValidacionInicio | null = null;
  @Output() ejecucionChange = new EventEmitter<EjecucionInicio>();

  readonly loading = signal(false);
  readonly estado = signal('');
  readonly progreso = signal(0);

  private polling?: Subscription;

  constructor(private readonly service: Fase1CertificacionService) {}

  ejecutar(): void {
    if (!this.cargueActual?.cargueId) return;
    this.loading.set(true);
    this.service.ejecutarCertificacion(this.cargueActual.cargueId, 'frontend').subscribe({
      next: (res) => {
        this.ejecucionChange.emit(res);
        this.poll(res.ejecucionId);
      },
      error: () => this.loading.set(false)
    });
  }

  private poll(id: number): void {
    this.polling?.unsubscribe();
    this.polling = interval(2000)
      .pipe(switchMap(() => this.service.getEjecucion(id)))
      .subscribe((res) => {
        this.estado.set(res.estado);
        this.progreso.set(res.progreso ?? 0);
        if (['FINALIZADO', 'COMPLETADO', 'ERROR'].includes((res.estado || '').toUpperCase())) {
          this.loading.set(false);
          this.polling?.unsubscribe();
        }
      });
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }
}
