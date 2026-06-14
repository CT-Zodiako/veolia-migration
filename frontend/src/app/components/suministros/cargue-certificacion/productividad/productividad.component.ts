import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { interval, Subscription, switchMap } from 'rxjs';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { CargueActual, ValidacionEstado, ValidacionInicio } from '../../../../models/fase1-certificacion.models';
import { Fase1CertificacionService } from '../../../../services/fase1-certificacion.service';

@Component({
  selector: 'app-productividad',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-card>
      <button pButton type="button" icon="pi pi-check-circle" label="Ejecutar Validaciones" [loading]="loading()" [disabled]="!cargueActual" (click)="ejecutar()"></button>
      <p class="mt-3" *ngIf="estado()">Estado: <strong>{{ estado() }}</strong></p>
      <p-table [value]="errores()" responsiveLayout="scroll" *ngIf="errores().length">
        <ng-template pTemplate="header"><tr><th>Fila</th><th>Columna</th><th>Mensaje</th></tr></ng-template>
        <ng-template pTemplate="body" let-e><tr><td>{{ e.fila }}</td><td>{{ e.columna }}</td><td>{{ e.mensaje }}</td></tr></ng-template>
      </p-table>
    </p-card>
  `
})
export class ProductividadComponent implements OnDestroy {
  @Input() cargueActual: CargueActual | null = null;
  @Output() validacionChange = new EventEmitter<ValidacionInicio>();

  readonly loading = signal(false);
  readonly estado = signal('');
  readonly errores = signal<Array<{ fila?: number; columna?: string; mensaje?: string }>>([]);

  private polling?: Subscription;

  constructor(private readonly service: Fase1CertificacionService) {}

  ejecutar(): void {
    if (!this.cargueActual?.cargueId) return;
    this.loading.set(true);
    this.service.ejecutarValidaciones(this.cargueActual.cargueId).subscribe({
      next: (res) => {
        this.validacionChange.emit(res);
        this.startPolling(res.validacionId);
      },
      error: () => this.loading.set(false)
    });
  }

  startPolling(validacionId: number): void {
    this.polling?.unsubscribe();
    this.polling = interval(2000)
      .pipe(switchMap(() => this.service.getValidacion(validacionId)))
      .subscribe((estado: ValidacionEstado) => {
        this.estado.set(estado.estado);
        this.errores.set(estado.errores || []);
        if (['FINALIZADO', 'COMPLETADO', 'ERROR'].includes((estado.estado || '').toUpperCase())) {
          this.loading.set(false);
          this.polling?.unsubscribe();
        }
      });
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }
}
