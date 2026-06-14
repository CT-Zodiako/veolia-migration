import { Component, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { PgirsService } from '../../services/pgirs.service';
import { ProyeccionesService } from '../../services/proyecciones.service';
import type { ApsOption } from '../../models/proyecciones.models';

@Component({
  selector: 'app-pgirs-variables',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, ToastModule, TabsModule, DialogModule, InputTextModule],
  providers: [MessageService],
  templateUrl: './pgirs-variables.component.html',
  styleUrls: ['./pgirs-variables.component.css']
})
export class PgirsVariablesComponent {
  aps = signal<number | null>(null);
  apsOptions = signal<ApsOption[]>([]);
  anno = signal<number>(new Date().getFullYear());
  mes = signal<number>(new Date().getMonth() + 1);
  activeTab = signal(0);

  consultaLoading = signal(false);
  consultaData = signal<any[]>([]);
  consultaError = signal<string | null>(null);

  editDialogVisible = signal(false);
  newDialogVisible = signal(false);
  selectedVariable = signal<any | null>(null);
  editForm = signal<{ variable: string; valor: string | number; frecuencia: string | number }>({
    variable: '',
    valor: '',
    frecuencia: ''
  });
  newForm = signal<{ apsId: number | null; anno: number | null; mes: number | null; variable: string; valor: string | number; frecuencia: string | number }>({
    apsId: null,
    anno: null,
    mes: null,
    variable: '',
    valor: '',
    frecuencia: ''
  });

  constructor(
    @Inject(PgirsService) private readonly service: PgirsService,
    @Inject(ProyeccionesService) private readonly proyService: ProyeccionesService,
    private readonly messages: MessageService
  ) {
    this.proyService.listarAps().subscribe({
      next: (data: any) => this.apsOptions.set(data || [])
    });
  }

  consultar(): void {
    const apsId = this.aps();
    const year = this.anno();
    const month = this.mes();
    if (!apsId) {
      this.messages.add({ severity: 'warn', summary: 'PGIRS', detail: 'Seleccione un APS' });
      return;
    }
    this.consultaLoading.set(true);
    this.consultaError.set(null);
    this.service.getVariables(apsId, year, month).subscribe({
      next: (res: any) => {
        this.consultaData.set(res.data || []);
        this.consultaLoading.set(false);
      },
      error: (err: any) => {
        this.consultaError.set(err?.message || 'Error al consultar variables');
        this.consultaLoading.set(false);
      }
    });
  }

  abrirEditar(row: any): void {
    this.selectedVariable.set(row);
    this.editForm.set({
      variable: row.NOMBRE_VARIABLE || row.nombre_variable || '',
      valor: row.PGRIVALOR || row.pgrivalor || '',
      frecuencia: row.PGRIFRECUENCIA || row.pgrifrecuencia || ''
    });
    this.editDialogVisible.set(true);
  }

  guardarEdicion(): void {
    const selected = this.selectedVariable();
    const form = this.editForm();
    if (!selected) return;

    const payload = {
      ...selected,
      NOMBRE_VARIABLE: form.variable,
      PGRIVALOR: form.valor,
      PGRIFRECUENCIA: form.frecuencia
    };

    this.service.actualizarVariable([payload]).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'PGIRS', detail: 'Variable actualizada correctamente' });
        this.editDialogVisible.set(false);
        this.consultar();
      },
      error: () => {
        this.messages.add({ severity: 'error', summary: 'PGIRS', detail: 'No se pudo actualizar la variable' });
      }
    });
  }

  abrirNuevaVariable(): void {
    this.newForm.set({
      apsId: this.aps(),
      anno: this.anno(),
      mes: this.mes(),
      variable: '',
      valor: '',
      frecuencia: ''
    });
    this.newDialogVisible.set(true);
  }

  guardarNuevaVariable(): void {
    const form = this.newForm();
    this.service.guardarVariables({
      apsId: form.apsId,
      anno: form.anno,
      mes: form.mes,
      variable: form.variable,
      valor: form.valor,
      frecuencia: form.frecuencia
    }).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'PGIRS', detail: 'Variable creada correctamente' });
        this.newDialogVisible.set(false);
        this.consultar();
      },
      error: () => {
        this.messages.add({ severity: 'error', summary: 'PGIRS', detail: 'No se pudo crear la variable' });
      }
    });
  }

  onTabChange(val: any): void {
    this.activeTab.set(Number(val));
  }

  eliminarVariable(row: any): void {
    const variable = row?.NOMBRE_VARIABLE || row?.nombre_variable || 'seleccionada';
    this.messages.add({ severity: 'warn', summary: 'PGIRS', detail: `Eliminar ${variable} pendiente de implementación.` });
  }
}
