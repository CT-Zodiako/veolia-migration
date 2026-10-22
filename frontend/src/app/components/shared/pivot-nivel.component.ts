import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PivotColumnDef, PivotRow } from '../../shared/pivot.util';

@Component({
  selector: 'app-pivot-nivel',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, PivotNivelComponent],
  templateUrl: './pivot-nivel.component.html',
  styleUrls: ['./pivot-nivel.component.css']
})
export class PivotNivelComponent {
  @Input({ required: true }) filas: PivotRow[] = [];
  @Input({ required: true }) columnas: PivotColumnDef[] = [];
  @Input({ required: true }) agrupaciones: string[] = [];
  @Input() nivel = 0;
  // Top-level grid of TablaPivot (legacy TablaPivot.vue:11-23,247-256): paginated and showing every column,
  // grouping keys first. Nested levels (ColumnasGenericas.vue) keep the filtered columns and no paginator.
  @Input() raiz = false;
  @Input() filasPorPagina = 10;

  expandedRowKeys: Record<string, boolean> = {};

  toggleFila(row: PivotRow): void {
    const id = row['id'] as string | undefined;
    if (!id) return;

    if (this.expandedRowKeys[id]) {
      const { [id]: _quitada, ...resto } = this.expandedRowKeys;
      this.expandedRowKeys = resto;
    } else {
      this.expandedRowKeys = { ...this.expandedRowKeys, [id]: true };
    }
  }

  get columnaAgrupacionActual(): string | null {
    return this.agrupaciones[this.nivel] ?? null;
  }

  // Igual que ColumnasGenericas.filteredColumns (TablaPivot legacy): oculta las columnas
  // de agrupación que NO correspondan al nivel actual -- ya se muestran como el valor de
  // la fila padre en cada nivel de expansión.
  get columnasVisibles(): PivotColumnDef[] {
    if (this.raiz) {
      const claves = this.agrupaciones
        .map((campo) => this.columnas.find((col) => col.field === campo) ?? { field: campo, headerName: campo, agrupable: true });
      return [...claves, ...this.columnas.filter((col) => !this.agrupaciones.includes(col.field))];
    }
    return this.columnas.filter((col) => {
      if (!this.agrupaciones.includes(col.field)) return true;
      return this.columnaAgrupacionActual === col.field;
    });
  }

  tieneHijos(row: PivotRow): boolean {
    return !!row.children && row.children.length > 0;
  }

  esNumerico(valor: unknown): boolean {
    return typeof valor === 'number';
  }
}
