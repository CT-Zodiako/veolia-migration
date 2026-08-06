import { CommonModule } from '@angular/common';
import { Component, effect, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ColumnaGenerica, TablaGenericaComponent } from '../shared/tabla-generica.component';
import { InformesService } from '../../services/informes.service';
import { exportarJson } from '../../shared/json-export.util';

interface ResumenTabla {
  nombre: string;
  columnas: ColumnaGenerica[];
  rows: Record<string, unknown>[];
}

@Component({
  selector: 'app-resumen-variables',
  standalone: true,
  imports: [CommonModule, ButtonModule, TablaGenericaComponent],
  template: `
    <div *ngIf="semestreTitulo()">
      <div class="resumen-variables-header mb-2">
        <h4>{{ semestreTitulo() }}</h4>
        <p-button
          label="Exportar todo"
          icon="pi pi-download"
          size="small"
          severity="secondary"
          [disabled]="!resumenTablas().length"
          (click)="exportarTodo()"
        ></p-button>
      </div>
      <div class="resumen-variables-grid">
        <div class="resumen-variables-item" *ngFor="let tabla of resumenTablas()">
          <h5>{{ tabla.nombre }}</h5>
          <app-tabla-generica [columnas]="tabla.columnas" [rows]="tabla.rows"></app-tabla-generica>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .resumen-variables-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .resumen-variables-header h4 { margin: 0; }
    .resumen-variables-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .resumen-variables-item {
      overflow-x: auto;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .resumen-variables-item h5 {
      margin: 0 0 0.5rem 0;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid var(--color-border-soft);
      color: var(--color-brand-strong);
      font-size: 0.85rem;
      font-weight: 700;
    }
  `]
})
export class ResumenVariablesComponent {
  readonly aps = input<number | null>(null);
  readonly mes = input<number | null>(null);
  readonly anno = input<number | null>(null);

  readonly semestreTituloChange = output<string>();

  readonly semestreTitulo = signal('');
  readonly resumenTablas = signal<ResumenTabla[]>([]);

  constructor(private readonly informesService: InformesService) {
    effect(() => {
      const aps = this.aps();
      const mes = this.mes();
      const anno = this.anno();

      if (!aps || !mes || !anno) {
        this.semestreTitulo.set('');
        this.resumenTablas.set([]);
        this.semestreTituloChange.emit('');
        return;
      }

      this.informesService.getCostosJson(aps, anno, mes).subscribe({
        next: (resp) => {
          const dataset = resp?.dataset || [];
          this.resumenTablas.set(dataset.map((item) => ({
            nombre: item.nombre,
            columnas: (item.columns || []).map((c) => ({ field: c, header: c })),
            rows: this.mapRows(item.columns || [], item.data || [])
          })));
          this.semestreTitulo.set(resp?.semestre || '');
          this.semestreTituloChange.emit(resp?.semestre || '');
        },
        error: () => {
          this.semestreTitulo.set('');
          this.resumenTablas.set([]);
          this.semestreTituloChange.emit('');
        }
      });
    });
  }

  exportarTodo(): void {
    const payload = this.resumenTablas().map((tabla) => ({
      nombre: tabla.nombre,
      columnas: tabla.columnas.map((col) => col.header),
      rows: tabla.rows
    }));

    exportarJson(payload, `resumen-variables-${this.semestreTitulo() || 'export'}`);
  }

  private mapRows(columns: string[], data: unknown[][]): Record<string, unknown>[] {
    return data.map((row) => {
      const record: Record<string, unknown> = {};
      columns.forEach((col, index) => { record[col] = row[index]; });
      return record;
    });
  }
}
