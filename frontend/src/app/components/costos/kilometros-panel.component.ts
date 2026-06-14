import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChartModule } from 'primeng/chart';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { LblResponse } from '../../models/kilometros.models';
import { KilometrosService } from '../../services/kilometros.service';

@Component({
  selector: 'app-kilometros-panel',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, ChartModule, MessageModule],
  template: `
    <div *ngIf="!isReady(); else readyState">
      <p-message severity="info" text="Seleccioná APS, año y mes para consultar kilómetros LBL." />
    </div>

    <ng-template #readyState>
      <p-card header="LBL por período (últimos 6 meses)" class="mb-3">
        <p-chart type="bar" [data]="lblChartData()" [options]="chartOptions" height="320" />
      </p-card>

      <p-card header="Detalle LBL">
        <p-table [value]="lblRows()" [paginator]="true" [rows]="10" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>APS</th><th>Empresa</th><th>Municipio</th><th>Año</th><th>Mes</th><th>Valor</th><th>Estado</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.aps }}</td>
              <td>{{ row.empresa }}</td>
              <td>{{ row.mpio }}</td>
              <td>{{ row.anno }}</td>
              <td>{{ row.mes }}</td>
              <td>{{ row.valor | number: '1.0-2' }}</td>
              <td>{{ row.estado }}</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </ng-template>
  `
})
export class KilometrosPanelComponent {
  readonly aps = input<number | null>(null);
  readonly anno = input<number | null>(null);
  readonly mes = input<number | null>(null);

  readonly isReady = computed(() => !!this.aps() && !!this.anno() && !!this.mes());
  readonly lblRows = signal<LblResponse[]>([]);

  readonly chartOptions = {
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } }
  };

  readonly lblChartData = computed(() => {
    const rows = this.lblRows();
    return {
      labels: rows.map((r) => `${r.anno}-${String(r.mes).padStart(2, '0')} · Emp ${r.empresa}`),
      datasets: [{ label: 'LBL', data: rows.map((r) => r.valor) }]
    };
  });

  constructor(private readonly service: KilometrosService) {
    effect(() => {
      const aps = this.aps();
      const anno = this.anno();
      const mes = this.mes();

      if (!aps || !anno || !mes) {
        this.lblRows.set([]);
        return;
      }

      this.service
        .getLbl(aps, anno, mes)
        .pipe(catchError(() => of([] as LblResponse[])))
        .subscribe((rows) => this.lblRows.set(rows));
    });
  }
}
