import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SubContService, SubContItem, SubContAps } from '../../services/subcont.service';

interface ClaseItem {
  clase: number;
  nombre: string;
  valor: number | null;
  sucoId?: number;
  existe: boolean;
}

@Component({
  selector: 'app-subcont-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SelectModule,
    TableModule,
    InputNumberModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './subcont-page.component.html',
  styleUrls: ['./subcont-page.component.css']
})
export class SubContPageComponent {
  aps = signal<number | null>(1);
  anno = signal<number>(2025);
  mes = signal<number>(4);

  apsOptions = signal<SubContAps[]>([]);
  clases = signal<ClaseItem[]>([]);
  loading = signal(false);
  guardando = signal(false);

  readonly mesOptions = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2000, i, 1).toLocaleString('es-CO', { month: 'long' }),
    value: i + 1
  }));

  readonly annoOptions = [2023, 2024, 2025, 2026];

  private readonly claseNombres: Record<number, string> = {
    1: 'Residencial',
    2: 'Comercial',
    3: 'Industrial',
    4: 'Oficial',
    5: 'Especial',
    6: 'Otros',
    7: 'Estatal',
    8: 'Municipal',
    9: 'Social'
  };

  constructor(
    private readonly subContService: SubContService,
    private readonly messageService: MessageService
  ) {
    this.cargarAps();
  }

  private cargarAps(): void {
    this.subContService.listarAps().subscribe({
      next: (data) => this.apsOptions.set(data),
      error: () => this.apsOptions.set([
        { apsaId: 1, apsaNombre: 'CVA' },
        { apsaId: 2, apsaNombre: 'CVNA' }
      ])
    });
  }

  consultar(): void {
    const apsValue = this.aps();
    if (!apsValue) return;

    this.loading.set(true);
    this.subContService.consultar({
      aps: apsValue,
      anno: this.anno(),
      mes: this.mes()
    }).subscribe({
      next: (data) => {
        // Mapear a clases (1-9)
        const clasesArr: ClaseItem[] = [];
        for (let i = 1; i <= 9; i++) {
          const encontrado = data.find(d => d.clasClase === i);
          clasesArr.push({
            clase: i,
            nombre: this.claseNombres[i] || `Clase ${i}`,
            valor: encontrado ? encontrado.sucoValor : null,
            sucoId: encontrado?.sucoId,
            existe: !!encontrado
          });
        }
        this.clases.set(clasesArr);
        this.loading.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.data || 'Error al consultar'
        });
        this.loading.set(false);
      }
    });
  }

  guardar(): void {
    const apsValue = this.aps();
    if (!apsValue) return;

    const valores = this.clases()
      .filter(c => c.valor !== null && c.valor !== undefined)
      .map(c => ({ id: c.clase, val: c.valor! }));

    if (valores.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay valores para guardar'
      });
      return;
    }

    this.guardando.set(true);

    const request = {
      aps: apsValue,
      anno: this.anno(),
      mes: this.mes(),
      valores
    };

    // Si todos son nuevos (no existen), crear; si no, editar
    const todosNuevos = this.clases().every(c => !c.existe);
    const call = todosNuevos
      ? this.subContService.crear(request)
      : this.subContService.editar(request);

    call.subscribe({
      next: (result) => {
        if (result.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Datos guardados correctamente'
          });
          this.consultar();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: result.message || 'Error al guardar'
          });
        }
        this.guardando.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.data || 'Error al guardar'
        });
        this.guardando.set(false);
      }
    });
  }

  eliminar(item: ClaseItem): void {
    if (!item.sucoId) return;

    const accepted = window.confirm(`¿Seguro que querés eliminar la clase ${item.nombre}?`);
    if (!accepted) return;

    this.subContService.eliminar(item.sucoId).subscribe({
      next: (result) => {
        if (result.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Eliminado correctamente'
          });
          this.consultar();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: result.message || 'Error al eliminar'
          });
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.data || 'Error al eliminar'
        });
      }
    });
  }
}
