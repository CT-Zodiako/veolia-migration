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
