import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { CargueActual, EjecucionInicio } from '../../../../models/fase1-certificacion.models';
import { Fase1CertificacionService } from '../../../../services/fase1-certificacion.service';

@Component({
  selector: 'app-certificacion',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-card>
      <div class="flex gap-2 mb-3">
        <button pButton type="button" icon="pi pi-refresh" label="Consultar Resultados" [disabled]="!cargueActual" [loading]="loading()" (click)="consultar()"></button>
        <button pButton type="button" severity="success" icon="pi pi-check" label="Confirmar" [disabled]="!cargueActual" (click)="confirmar()"></button>
        <button pButton type="button" severity="danger" icon="pi pi-undo" label="Revertir" [disabled]="!cargueActual" (click)="revertir()"></button>
      </div>
      <p-table [value]="items()" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr><th *ngFor="let c of columns()">{{ c }}</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr><td *ngFor="let c of columns()">{{ row[c] }}</td></tr>
        </ng-template>
      </p-table>
    </p-card>
  `
})
export class CertificacionComponent {
  @Input() cargueActual: CargueActual | null = null;
  @Input() ejecucion: EjecucionInicio | null = null;

  readonly loading = signal(false);
  readonly items = signal<Array<Record<string, unknown>>>([]);
  readonly columns = signal<string[]>([]);

  constructor(private readonly service: Fase1CertificacionService) {}

  consultar(): void {
    if (!this.cargueActual?.cargueId) return;
    this.loading.set(true);
    this.service.getResultados(this.cargueActual.cargueId).subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.columns.set(Object.keys(res.items?.[0] || {}));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  confirmar(): void {
    if (!this.cargueActual?.cargueId) return;
    this.service.confirmarCargue(this.cargueActual.cargueId, 'frontend').subscribe();
  }

  revertir(): void {
    if (!this.cargueActual?.cargueId) return;
    this.service.revertirCargue(this.cargueActual.cargueId, 'Reversión operativa frontend', 'frontend').subscribe();
  }
}
