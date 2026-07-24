import { Component, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { PgirsService } from '../../services/pgirs.service';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

const PGIRS_VARIABLE_CATALOGO: { codVariable: number; label: string; valorKey: string; frecuenciaKey: string }[] = [
  { codVariable: 11, label: 'LBL', valorKey: 'lbl', frecuenciaKey: 'lblFrecuencia' },
  { codVariable: 21, label: 'CESPED', valorKey: 'cesped', frecuenciaKey: 'cespedFrecuencia' },
  { codVariable: 22, label: 'PODA', valorKey: 'poda', frecuenciaKey: 'podaFrecuencia' },
  { codVariable: 23, label: 'LAVADO', valorKey: 'lavado', frecuenciaKey: 'lavadoFrecuencia' },
  { codVariable: 24, label: 'PLAYAS', valorKey: 'playas', frecuenciaKey: 'playasFrecuencia' },
  { codVariable: 25, label: 'INSCESTAS', valorKey: 'inscestas', frecuenciaKey: 'inscestasFrecuencia' },
  { codVariable: 26, label: 'MANCESTAS', valorKey: 'mancestas', frecuenciaKey: 'mancestasFrecuencia' }
];

// Mismas traducciones que el legacy (traducirValor/traducirFrecuencia en tableVariablesPGRIS.vue)
const FRECUENCIA_LABELS: Record<number, string> = {
  1: 'Mensual',
  2: 'Semestral',
  3: 'Anual'
};

const FRECUENCIA_OPTIONS = [
  { value: 1, label: 'Mensual' },
  { value: 2, label: 'Semestral' },
  { value: 3, label: 'Anual' }
];

const COLUMNAS_VARIABLES: TablaColumn[] = [
  { field: 'APSAID', header: 'APS ID' },
  { field: 'PGRIANNO', header: 'Año' },
  { field: 'PGRIMES', header: 'Mes' },
  { field: 'PGRIVARIABLE', header: 'Variable', filtrable: true },
  { field: 'PGRIVALOR', header: 'Valor', numero: true },
  { field: 'PGRIFRECUENCIA', header: 'Frecuencia' },
  { field: 'PGRIFECHA', header: 'Fecha' },
  { field: 'PGRIUSUARIO', header: 'Usuario' },
  { field: 'PGRINGRESO', header: 'Ingreso' }
];

@Component({
  selector: 'app-pgirs-variables',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, ToastModule, DialogModule, InputTextModule, ParametrosConsultaComponent, TablaAvanzadaComponent],
  providers: [MessageService],
  templateUrl: './pgirs-variables.component.html',
  styleUrls: ['./pgirs-variables.component.css']
})
export class PgirsVariablesComponent {
  readonly variableOptions = PGIRS_VARIABLE_CATALOGO;
  readonly frecuenciaOptions = FRECUENCIA_OPTIONS;
  readonly columnasVariables = COLUMNAS_VARIABLES;

  aps = signal<number | null>(null);
  anno = signal<number | null>(null);
  mes = signal<number | null>(null);

  consultaLoading = signal(false);
  consultaData = signal<any[]>([]);
  consultaError = signal<string | null>(null);

  editingKey = signal<string | null>(null);
  editingValor = signal<number | string>(0);
  editingFrecuencia = signal<number>(1);

  newDialogVisible = signal(false);
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
    private readonly messages: MessageService
  ) {}

  traducirVariable(codVariable: number | string | null | undefined): string {
    const codigo = Number(codVariable);
    return this.variableOptions.find(v => v.codVariable === codigo)?.label ?? String(codVariable ?? '0');
  }

  traducirFrecuencia(frecuencia: number | string | null | undefined): string {
    const codigo = Number(frecuencia);
    return FRECUENCIA_LABELS[codigo] ?? String(frecuencia ?? '0');
  }

  consultar(): void {
    const apsId = this.aps();
    const year = this.anno();
    const month = this.mes();
    if (!apsId || !year || !month) {
      this.messages.add({ severity: 'warn', summary: 'PGIRS', detail: 'Seleccione APS, año y mes' });
      return;
    }
    this.consultaLoading.set(true);
    this.consultaError.set(null);
    const periodo = periodoAnterior(year, month);
    this.service.getVariables(apsId, periodo.anno, periodo.mes).subscribe({
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

  rowKey(row: any): string {
    const apsId = row.APSAID ?? row.apsaid;
    const anno = row.PGRIANNO ?? row.pgrianno;
    const mes = row.PGRIMES ?? row.pgrimes;
    const codVariable = row.PGRIVARIABLE ?? row.pgrivariable;
    return `${apsId}-${anno}-${mes}-${codVariable}`;
  }

  iniciarEdicionFila(row: any): void {
    this.editingKey.set(this.rowKey(row));
    this.editingValor.set(row.PGRIVALOR ?? row.pgrivalor ?? 0);
    this.editingFrecuencia.set(Number(row.PGRIFRECUENCIA ?? row.pgrifrecuencia ?? 1));
  }

  cancelarEdicionFila(): void {
    this.editingKey.set(null);
  }

  guardarFila(row: any): void {
    const payload = {
      apsId: row.APSAID ?? row.apsaid,
      anno: row.PGRIANNO ?? row.pgrianno,
      mes: row.PGRIMES ?? row.pgrimes,
      codVariable: row.PGRIVARIABLE ?? row.pgrivariable,
      valor: Number(this.editingValor()),
      frecuencia: String(this.editingFrecuencia())
    };

    this.service.actualizarVariable([payload]).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'PGIRS', detail: 'Variable actualizada correctamente' });
        this.editingKey.set(null);
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
    if (!form.apsId || !form.anno || !form.mes || !form.variable || form.valor === '' || form.valor === null) {
      this.messages.add({ severity: 'warn', summary: 'PGIRS', detail: 'Complete todos los campos' });
      return;
    }

    const catalogo = this.variableOptions.find(v => v.label === form.variable);
    if (!catalogo) {
      this.messages.add({ severity: 'error', summary: 'PGIRS', detail: 'Variable no reconocida' });
      return;
    }

    const periodo = periodoAnterior(form.anno, form.mes);
    const payload: Record<string, unknown> = {
      apsId: form.apsId,
      anno: periodo.anno,
      mes: periodo.mes,
      [catalogo.valorKey]: Number(form.valor),
      [catalogo.frecuenciaKey]: String(form.frecuencia)
    };

    this.service.guardarVariables(payload).subscribe({
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
}
