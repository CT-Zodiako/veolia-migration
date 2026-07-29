import { CommonModule } from '@angular/common';
import { Component, effect, input, output, signal } from '@angular/core';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';
import { InformesService } from '../../services/informes.service';

interface ResumenTabla {
  nombre: string;
  columnas: { field: string; header: string; filtrable: boolean }[];
  rows: Record<string, unknown>[];
}

@Component({
  selector: 'app-resumen-variables',
  standalone: true,
  imports: [CommonModule, TablaAvanzadaComponent],
  template: `
    <div *ngIf="semestreTitulo()">
      <h4 class="mb-2">{{ semestreTitulo() }}</h4>
      <div class="mb-3" *ngFor="let tabla of resumenTablas(); let i = index">
        <h5>{{ tabla.nombre }}</h5>
        <app-tabla-avanzada
          [columnas]="tabla.columnas"
          [rows]="tabla.rows"
          [storageKey]="'calculo-resumen-' + i"
          [nombreExportar]="tabla.nombre || 'resumen'"
          [scrollHeight]="'300px'"
        ></app-tabla-avanzada>
      </div>
    </div>
  `
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
            columnas: (item.columns || []).map((c) => ({ field: c, header: c, filtrable: true })),
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

  private mapRows(columns: string[], data: unknown[][]): Record<string, unknown>[] {
    return data.map((row) => {
      const record: Record<string, unknown> = {};
      columns.forEach((col, index) => { record[col] = row[index]; });
      return record;
    });
  }
}
