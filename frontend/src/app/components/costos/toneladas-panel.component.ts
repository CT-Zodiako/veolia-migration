import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChartModule } from 'primeng/chart';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { DetalleResponse, QaResponse, QrtResponse } from '../../models/toneladas.models';
import { ToneladasService } from '../../services/toneladas.service';

@Component({
  selector: 'app-toneladas-panel',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, ChartModule, MessageModule],
  template: `
    <div *ngIf="!isReady(); else readyState">
      <p-message severity="info" text="Seleccioná APS, año y mes para consultar toneladas." />
    </div>

    <ng-template #readyState>
      <div class="grid">
        <div class="col-12 lg:col-6">
          <p-card header="QRT (QBL + QLU + QNA)">
            <p-chart type="doughnut" [data]="qrtChartData()" [options]="chartOptions" height="260" />
          </p-card>
        </div>
        <div class="col-12 lg:col-6">
          <p-card header="QA por período">
            <p-chart type="bar" [data]="qaChartData()" [options]="chartOptions" height="260" />
          </p-card>
        </div>
      </div>

      <p-card header="Detalle de toneladas" class="mt-3">
        <p-table [value]="detalleRows()" [paginator]="true" [rows]="10" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>APS</th><th>Empresa</th><th>Municipio</th><th>Año</th><th>Mes</th><th>Tipo</th><th>Valor</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.aps }}</td>
              <td>{{ row.empresa }}</td>
              <td>{{ row.mpio }}</td>
              <td>{{ row.anno }}</td>
              <td>{{ row.mes }}</td>
              <td>{{ row.tipo }}</td>
              <td>{{ row.valor | number: '1.0-2' }}</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </ng-template>
  `
})
export class ToneladasPanelComponent {
  readonly aps = input<number | null>(null);
  readonly anno = input<number | null>(null);
  readonly mes = input<number | null>(null);

  readonly isReady = computed(() => !!this.aps() && !!this.anno() && !!this.mes());
  readonly qrtRows = signal<QrtResponse[]>([]);
  readonly qaRows = signal<QaResponse[]>([]);
  readonly detalleRows = signal<DetalleResponse[]>([]);

  readonly chartOptions = { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } };

  readonly qrtChartData = computed(() => {
    const rows = this.qrtRows();
    return {
      labels: rows.map((r) => `${r.empresa}-${r.tipo}`),
      datasets: [{ data: rows.map((r) => r.valor) }]
    };
  });

  readonly qaChartData = computed(() => {
    const rows = this.qaRows();
    return {
      labels: rows.map((r) => `${r.anno}-${String(r.mes).padStart(2, '0')}`),
      datasets: [{ label: 'QA', data: rows.map((r) => r.valor) }]
    };
  });

  constructor(private readonly service: ToneladasService) {
    effect(() => {
      const aps = this.aps();
      const anno = this.anno();
      const mes = this.mes();

      if (!aps || !anno || !mes) {
        this.qrtRows.set([]);
        this.qaRows.set([]);
        this.detalleRows.set([]);
        return;
      }

      forkJoin({
        qrt: this.service.getQrt(aps, anno, mes).pipe(catchError(() => of([] as QrtResponse[]))),
        qa: this.service.getQa(aps, anno, mes).pipe(catchError(() => of([] as QaResponse[]))),
        detalle: this.service.getDetalle(aps, anno, mes).pipe(catchError(() => of([] as DetalleResponse[])))
      }).subscribe(({ qrt, qa, detalle }) => {
        this.qrtRows.set(qrt);
        this.qaRows.set(qa);
        this.detalleRows.set(detalle);
      });
    });
  }
}
