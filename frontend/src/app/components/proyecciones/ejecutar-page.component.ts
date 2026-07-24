import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { LineaTiempoRow, Proyeccion } from '../../models/proyecciones.models';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { ProyeccionSelectorComponent } from '../shared/proyeccion-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { columnasDesdeFilas, FilaDinamica } from '../shared/tabla-columnas.util';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Mismas columnas que Líneas de Tiempo (Año/Mes de solo lectura, deltas alineados
// a la derecha) -- acá la tabla es de solo consulta, previa a ejecutar.
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
  selector: 'app-ejecutar-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule,
    TextareaModule, TabsModule, ToastModule, ApsSelectorComponent, ProyeccionSelectorComponent, TablaAvanzadaComponent
  ],
  providers: [MessageService],
  templateUrl: './ejecutar-page.component.html',
  styleUrls: ['./ejecutar-page.component.css']
})
export class EjecutarPageComponent {
  readonly columnasLineaTiempo = COLUMNAS_LINEA_TIEMPO;

  apsaId = signal<number | null>(null);
  proyId = signal<number | null>(null);
  proyeccionSeleccionada = signal<Proyeccion | null>(null);

  ejecutando = signal(false);
  resultado = signal<string | null>(null);
  resultadoExito = signal(false);

  lineaTiempoRows = signal<LineaTiempoRow[]>([]);
  usuarios = signal<FilaDinamica[]>([]);
  propia = signal<FilaDinamica[]>([]);
  terceros = signal<FilaDinamica[]>([]);
  descuentos = signal<FilaDinamica[]>([]);

  columnasUsuarios = computed(() => columnasDesdeFilas(this.usuarios()));
  columnasPropia = computed(() => columnasDesdeFilas(this.propia()));
  columnasTerceros = computed(() => columnasDesdeFilas(this.terceros()));
  columnasDescuentos = computed(() => columnasDesdeFilas(this.descuentos()));

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
    this.apsaId.set(apsaId);
    this.proyId.set(null);
    this.proyeccionSeleccionada.set(null);
    this.limpiarDatos();
  }

  onProyChange(proyId: number | null): void {
    this.proyId.set(proyId);
    this.resultado.set(null);
    if (proyId) {
      this.cargarDatos(proyId);
    } else {
      this.limpiarDatos();
    }
  }

  onProyeccionChange(proyeccion: Proyeccion | null): void {
    this.proyeccionSeleccionada.set(proyeccion);
  }

  ejecutar(): void {
    const apsaId = this.apsaId();
    const proyId = this.proyId();
    if (!apsaId || !proyId) return;

    this.ejecutando.set(true);
    this.resultado.set(null);
    this.service.ejecutarProyectar(apsaId, proyId).subscribe({
      next: (r) => {
        this.ejecutando.set(false);
        const exito = !!r.data?.success;
        this.resultadoExito.set(exito);
        this.resultado.set(r.message || (exito ? 'Proceso ejecutado correctamente.' : 'Ejecución finalizada con observaciones.'));
        this.messages.add({ severity: exito ? 'success' : 'warn', summary: 'Proyectar', detail: this.resultado() || '' });
      },
      error: (err) => {
        this.ejecutando.set(false);
        this.resultadoExito.set(false);
        this.resultado.set(err?.error?.message || 'Error al ejecutar la proyección');
      }
    });
  }

  private cargarDatos(proyId: number): void {
    this.service.lineaTiempoByProyId(proyId).subscribe({ next: (r) => this.lineaTiempoRows.set(r.data || []) });

    this.service.consultarCrecimiento(this.apsaId()!, proyId).subscribe({
      next: (r) => {
        this.usuarios.set((r.data?.usuarios || []) as unknown as FilaDinamica[]);
        this.propia.set((r.data?.propia || []) as unknown as FilaDinamica[]);
        this.terceros.set((r.data?.terceros || []) as unknown as FilaDinamica[]);
        this.descuentos.set((r.data?.descuentos || []) as unknown as FilaDinamica[]);
      }
    });
  }

  private limpiarDatos(): void {
    this.lineaTiempoRows.set([]);
    this.usuarios.set([]);
    this.propia.set([]);
    this.terceros.set([]);
    this.descuentos.set([]);
  }
}
