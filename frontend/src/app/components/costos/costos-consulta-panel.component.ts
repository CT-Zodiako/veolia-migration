import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CostosService } from '../../services/costos.service';
import { CostoItem, CostoClusItem, ComportaClusItem } from '../../models/costos.models';

type TabType = 'costos' | 'clus' | 'comporta';

@Component({
  selector: 'app-costos-consulta-panel',
  standalone: true,
  imports: [CommonModule, TableModule, CardModule, ProgressSpinnerModule],
  template: `
    <div class="costos-consulta-panel">
      <div class="tabs-header">
        <button 
          *ngFor="let tab of tabs" 
          [class.active]="activeTab() === tab.key"
          (click)="setTab(tab.key)"
          class="tab-btn">
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        @if (loading()) {
          <div class="loading"><p-progressSpinner /></div>
        } @else if (error()) {
          <div class="error">{{ error() }}</div>
        } @else {
          @switch (activeTab()) {
            @case ('costos') {
              <p-table [value]="costos()" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr><th>Tipo</th><th>Valor</th><th>Fecha</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td>{{ item.costTipo }}</td>
                    <td>{{ item.costValor | number:'1.0-2' }}</td>
                    <td>{{ item.costFecha | date:'shortDate' }}</td>
                  </tr>
                </ng-template>
              </p-table>
            }
            @case ('clus') {
              <p-table [value]="costosClus()" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr><th>Clúster</th><th>Nombre</th><th>Valor</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td>{{ item.paraCosto20021 }}</td>
                    <td>{{ item.paraNombre }}</td>
                    <td>{{ item.costValor | number:'1.0-2' }}</td>
                  </tr>
                </ng-template>
              </p-table>
            }
            @case ('comporta') {
              <p-table [value]="comportaClus()" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr><th>Período</th><th>CP</th><th>M2CCJ</th><th>M2LAVJ</th><th>TIJ</th><th>KLPJ</th><th>TMJ</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td>{{ item.inedAnno }}/{{ item.inedMes }}</td>
                    <td>{{ item.inedCp | number:'1.1-1' }}</td>
                    <td>{{ item.inedM2ccj | number:'1.0-0' }}</td>
                    <td>{{ item.inedM2lavj | number:'1.0-0' }}</td>
                    <td>{{ item.inedTij | number:'1.1-1' }}</td>
                    <td>{{ item.inedKlpj | number:'1.1-1' }}</td>
                    <td>{{ item.inedTmj | number:'1.0-0' }}</td>
                  </tr>
                </ng-template>
              </p-table>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .costos-consulta-panel { display: flex; flex-direction: column; gap: 1rem; }
    .tabs-header { display: flex; gap: 0.5rem; border-bottom: 1px solid #e5e7eb; }
    .tab-btn { padding: 0.5rem 1rem; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent; }
    .tab-btn.active { border-bottom-color: var(--primary-color); font-weight: 600; color: var(--primary-color); }
    .tab-content { min-height: 200px; }
    .loading { display: flex; justify-content: center; padding: 2rem; }
    .error { color: var(--red-500); padding: 1rem; }
  `]
})
export class CostosConsultaPanelComponent implements OnInit {
  @Input({ required: true }) aps!: number;
  @Input({ required: true }) anno!: number;
  @Input({ required: true }) mes!: number;

  tabs = [
    { key: 'costos' as TabType, label: 'Costos Consolidados' },
    { key: 'clus' as TabType, label: 'Costos por Clúster' },
    { key: 'comporta' as TabType, label: 'Comportamiento Histórico' }
  ];

  activeTab = signal<TabType>('costos');
  loading = signal(false);
  error = signal('');

  costos = signal<CostoItem[]>([]);
  costosClus = signal<CostoClusItem[]>([]);
  comportaClus = signal<ComportaClusItem[]>([]);

  constructor(private readonly costosService: CostosService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  setTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set('');

    this.costosService.consultarCostos(this.aps, this.mes, this.anno).subscribe({
      next: data => this.costos.set(data || []),
      error: err => console.error('Error costos:', err)
    });

    this.costosService.consultarCostosClus(this.aps, this.mes, this.anno).subscribe({
      next: data => this.costosClus.set(data || []),
      error: err => console.error('Error costos clus:', err)
    });

    this.costosService.consultarComportaClus(this.aps, this.mes, this.anno).subscribe({
      next: data => {
        this.comportaClus.set(data || []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Error al cargar datos');
        this.loading.set(false);
      }
    });
  }
}
