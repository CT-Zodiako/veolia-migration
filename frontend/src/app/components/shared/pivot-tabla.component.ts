import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { DialogModule } from 'primeng/dialog';
import { PivotNivelComponent } from './pivot-nivel.component';
import { PivotColumnDef, PivotRow, FuncionAgregacion, pivotarJerarquico } from '../../shared/pivot.util';

@Component({
  selector: 'app-pivot-tabla',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, DialogModule, PivotNivelComponent],
  templateUrl: './pivot-tabla.component.html',
  styleUrls: ['./pivot-tabla.component.css']
})
export class PivotTablaComponent {
  @Input({ required: true }) datos: Record<string, unknown>[] = [];
  @Input({ required: true }) columnas: PivotColumnDef[] = [];

  dialogVisible = signal(false);
  agrupaciones = signal<string[]>([]);
  camposOperacion = signal<string[]>([]);
  funcionAgregacion = signal<FuncionAgregacion>('sum');
  filasPivotadas = signal<PivotRow[] | null>(null);

  campoAgrupacionSeleccionado: string | null = null;
  campoOperacionSeleccionado: string | null = null;

  readonly funciones: { label: string; value: FuncionAgregacion }[] = [
    { label: 'Suma', value: 'sum' },
    { label: 'Promedio', value: 'avg' },
    { label: 'Conteo', value: 'count' },
    { label: 'Máximo', value: 'max' },
    { label: 'Mínimo', value: 'min' }
  ];

  get columnasAgrupables(): PivotColumnDef[] {
    return this.columnas.filter((c) => c.agrupable);
  }

  get columnasMedibles(): PivotColumnDef[] {
    return this.columnas.filter((c) => !c.agrupable);
  }

  get filasMostradas(): PivotRow[] {
    return this.filasPivotadas() ?? this.datos;
  }

  get agrupacionesActivas(): string[] {
    return this.filasPivotadas() ? this.agrupaciones() : [];
  }

  abrirDialog(): void {
    this.dialogVisible.set(true);
  }

  cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  agregarAgrupacion(): void {
    const campo = this.campoAgrupacionSeleccionado;
    if (campo && !this.agrupaciones().includes(campo)) {
      this.agrupaciones.update((actual) => [...actual, campo]);
    }
    this.campoAgrupacionSeleccionado = null;
  }

  quitarAgrupacion(index: number): void {
    this.agrupaciones.update((actual) => actual.filter((_, i) => i !== index));
  }

  agregarCampoOperacion(): void {
    const campo = this.campoOperacionSeleccionado;
    if (campo && !this.camposOperacion().includes(campo)) {
      this.camposOperacion.update((actual) => [...actual, campo]);
    }
    this.campoOperacionSeleccionado = null;
  }

  quitarCampoOperacion(index: number): void {
    this.camposOperacion.update((actual) => actual.filter((_, i) => i !== index));
  }

  pivotar(): void {
    if (this.agrupaciones().length === 0) {
      this.restaurar();
      return;
    }
    this.filasPivotadas.set(pivotarJerarquico(this.datos, this.agrupaciones(), this.camposOperacion(), this.funcionAgregacion()));
    this.cerrarDialog();
  }

  restaurar(): void {
    this.filasPivotadas.set(null);
    this.agrupaciones.set([]);
    this.camposOperacion.set([]);
    this.funcionAgregacion.set('sum');
    this.cerrarDialog();
  }
}
