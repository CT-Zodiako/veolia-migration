import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { LineaTiempoRow, Proyeccion } from '../../models/proyecciones.models';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { ProyeccionSelectorComponent } from '../shared/proyeccion-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const COLUMNAS_LINEA_TIEMPO: TablaColumn[] = [
  { field: 'anno', header: 'Año' },
  { field: 'mes', header: 'Mes' },
  { field: 'deltipc', header: 'IPC', numero: true },
  { field: 'deltipcc', header: 'IPCC', numero: true },
  { field: 'deltsmlv', header: 'SMLV', numero: true },
  { field: 'deltioexp', header: 'IOEXP', numero: true },
  { field: 'deltfacproduc', header: 'Fact Prod', numero: true },
  { field: 'deltindipcc', header: 'Ind IPCC', numero: true },
  { field: 'deltipccs', header: 'IPC TCL', numero: true }
];

@Component({
  selector: 'app-linea-tiempo-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule,
    InputNumberModule, TextareaModule, ToastModule, ApsSelectorComponent, ProyeccionSelectorComponent, TablaAvanzadaComponent
  ],
  providers: [MessageService],
  templateUrl: './linea-tiempo-page.component.html',
  styleUrls: ['./linea-tiempo-page.component.css']
})
export class LineaTiempoPageComponent {
  readonly columnas = COLUMNAS_LINEA_TIEMPO;

  aps = signal<number | null>(null);
  proyId = signal<number | null>(null);
  proyeccionSeleccionada = signal<Proyeccion | null>(null);
  rows = signal<LineaTiempoRow[]>([]);
  loading = signal(false);
  saving = signal(false);
  isNew = signal(false);

  editingKey = signal<string | null>(null);
  editDraft = signal<LineaTiempoRow | null>(null);

  horizonteDesde = computed(() => {
    const p = this.proyeccionSeleccionada();
    return p ? `${MESES[p.proyMesDes - 1] ?? p.proyMesDes} ${p.proyAnnoDes}` : '';
  });

  horizonteHasta = computed(() => {
    const p = this.proyeccionSeleccionada();
    return p ? `${MESES[p.proyMesHas - 1] ?? p.proyMesHas} ${p.proyAnnoHas}` : '';
  });

  constructor(private readonly service: ProyeccionesService, private readonly messages: MessageService) {}

  onApsChange(apsaId: number | null): void {
    this.aps.set(apsaId);
    this.proyId.set(null);
    this.proyeccionSeleccionada.set(null);
    this.rows.set([]);
    this.editingKey.set(null);
  }

  onProyChange(proyId: number | null): void {
    this.proyId.set(proyId);
    this.editingKey.set(null);
    if (proyId) {
      this.consultar(proyId);
    } else {
      this.rows.set([]);
    }
  }

  onProyeccionChange(proyeccion: Proyeccion | null): void {
    this.proyeccionSeleccionada.set(proyeccion);
  }

  rowKey(row: any): string {
    return `${row.anno}-${row.mes}`;
  }

  iniciarEdicionFila(row: Record<string, unknown>): void {
    this.editingKey.set(this.rowKey(row));
    this.editDraft.set({ ...(row as unknown as LineaTiempoRow) });
  }

  cancelarEdicionFila(): void {
    this.editingKey.set(null);
    this.editDraft.set(null);
  }

  confirmarEdicionFila(): void {
    const key = this.editingKey();
    const draft = this.editDraft();
    if (!key || !draft) return;

    this.rows.update(rows => rows.map(r => (this.rowKey(r) === key ? draft : r)));
    this.editingKey.set(null);
    this.editDraft.set(null);
  }

  valorEditado(col: TablaColumn): number | null {
    const draft = this.editDraft();
    if (!draft) return null;
    return (draft as unknown as Record<string, number | null>)[col.field] ?? null;
  }

  actualizarDraft(campo: string, valor: number | null): void {
    const draft = this.editDraft();
    if (!draft) return;
    this.editDraft.set({ ...draft, [campo]: valor } as LineaTiempoRow);
  }

  guardar(): void {
    const proyId = this.proyId();
    const apsaId = this.aps();
    if (!proyId || !apsaId) return;

    this.saving.set(true);
    const payload = { proyId, apsaId, isNew: this.isNew(), rows: this.rows() };
    this.service.registrarLineaTiempo(payload).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.messages.add({ severity: r.status ? 'success' : 'error', summary: 'Línea de tiempo', detail: r.message });
        if (r.status) {
          this.consultar(proyId);
        }
      },
      error: () => this.saving.set(false)
    });
  }

  private consultar(proyId: number): void {
    this.loading.set(true);
    this.service.lineaTiempoByProyId(proyId).subscribe({
      next: (r) => {
        const data = r.data || [];
        this.isNew.set(data.length === 0);
        this.rows.set(data.length ? data : this.defaultRows());
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private defaultRows(): LineaTiempoRow[] {
    const p = this.proyeccionSeleccionada();
    if (!p) return [];

    const filas: LineaTiempoRow[] = [];
    let anno = p.proyAnnoDes;
    let mes = p.proyMesDes;

    while (anno < p.proyAnnoHas || (anno === p.proyAnnoHas && mes <= p.proyMesHas)) {
      filas.push({ proyId: this.proyId() || 0, apsaId: this.aps() || 0, anno, mes });
      mes++;
      if (mes > 12) {
        mes = 1;
        anno++;
      }
    }

    return filas;
  }
}
