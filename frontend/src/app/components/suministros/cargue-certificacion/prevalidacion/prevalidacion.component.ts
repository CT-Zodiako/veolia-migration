import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { ArchivoCargaResponse, CargueActual, ErrorCargue } from '../../../../models/fase1-certificacion.models';
import { Fase1CertificacionService } from '../../../../services/fase1-certificacion.service';

@Component({
  selector: 'app-prevalidacion',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-card>
      <div class="flex justify-content-between align-items-center mb-3">
        <p class="m-0">Errores estructurales del cargue #{{ cargueActual?.cargueId || '—' }}</p>
        <button pButton type="button" icon="pi pi-refresh" label="Re-parsear" [loading]="loading()" [disabled]="!cargueActual" (click)="reparsear()"></button>
      </div>
      <p-table [value]="errores()" [paginator]="true" [rows]="size()" [totalRecords]="total()" [lazy]="true" (onLazyLoad)="onPage($event)" responsiveLayout="scroll">
        <ng-template pTemplate="header"><tr><th>Fila</th><th>Columna</th><th>Mensaje</th></tr></ng-template>
        <ng-template pTemplate="body" let-e><tr><td>{{ e.fila }}</td><td>{{ e.columna }}</td><td>{{ e.mensaje }}</td></tr></ng-template>
      </p-table>
    </p-card>
  `
})
export class PrevalidacionComponent {
  @Input() cargueActual: CargueActual | null = null;
  @Input() archivo: ArchivoCargaResponse | null = null;

  readonly errores = signal<ErrorCargue[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly size = signal(10);
  readonly loading = signal(false);

  constructor(private readonly service: Fase1CertificacionService) {}

  onPage(event: { first?: number | null; rows?: number | null }): void {
    if (!this.cargueActual?.cargueId) return;
    const rows = event.rows || 10;
    const page = Math.floor((event.first || 0) / rows) + 1;
    this.size.set(rows);
    this.page.set(page);
    this.loadErrores();
  }

  reparsear(): void {
    if (!this.cargueActual?.cargueId) return;
    this.loading.set(true);
    this.service.parsearArchivo(this.cargueActual.cargueId).subscribe({
      next: () => {
        this.loadErrores();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadErrores(): void {
    if (!this.cargueActual?.cargueId) return;
    this.service.getErrores(this.cargueActual.cargueId, this.page(), this.size()).subscribe((res) => {
      this.errores.set(res.items);
      this.total.set(res.total);
    });
  }
}
