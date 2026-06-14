import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, signal } from '@angular/core';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { CargueActual, ResumenCargue } from '../../../../models/fase1-certificacion.models';
import { Fase1CertificacionService } from '../../../../services/fase1-certificacion.service';

@Component({
  selector: 'app-info-competidor',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-card>
      <div class="grid mb-3">
        <div class="col-12 md:col-4"><p-card><strong>Total:</strong> {{ resumen()?.totales ?? 0 }}</p-card></div>
        <div class="col-12 md:col-4"><p-card><strong>Válidos:</strong> {{ resumen()?.validos ?? 0 }}</p-card></div>
        <div class="col-12 md:col-4"><p-card><strong>Inválidos:</strong> {{ resumen()?.invalidos ?? 0 }}</p-card></div>
      </div>
      <p-table [value]="detalle()" responsiveLayout="scroll">
        <ng-template pTemplate="header"><tr><th>Campo</th><th>Valor</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr><td>{{ r.key }}</td><td>{{ r.value }}</td></tr></ng-template>
      </p-table>
    </p-card>
  `
})
export class InfoCompetidorComponent implements OnChanges {
  @Input() cargueActual: CargueActual | null = null;
  readonly resumen = signal<ResumenCargue | null>(null);
  readonly detalle = signal<Array<{ key: string; value: unknown }>>([]);

  constructor(private readonly service: Fase1CertificacionService) {}

  ngOnChanges(): void {
    if (!this.cargueActual?.cargueId) return;
    this.service.getResumen(this.cargueActual.cargueId).subscribe((resumen) => {
      this.resumen.set(resumen);
      const rows = Object.entries(resumen).map(([key, value]) => ({ key, value }));
      this.detalle.set(rows);
    });
  }
}
