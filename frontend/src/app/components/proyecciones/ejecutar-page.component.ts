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

// Legacy ConsultarLineasdeTiempo.vue:15-79,117-119: AÑO..IND IPCC (sin IPC TCL), valores
// redondeados a 5 decimales (Math.round). Solo consulta, previa a ejecutar.
const COLUMNAS_LINEA_TIEMPO: TablaColumn[] = [
  { field: 'anno', header: 'AÑO' },
  { field: 'mes', header: 'MES' },
  { field: 'deltipc', header: 'IPC', numero: true, decimales: 5 },
  { field: 'deltipcc', header: 'IPCC', numero: true, decimales: 5 },
  { field: 'deltsmlv', header: 'SMLV', numero: true, decimales: 5 },
  { field: 'deltioexp', header: 'IOEXP', numero: true, decimales: 5 },
  { field: 'deltfacproduc', header: 'FACT PROD', numero: true, decimales: 5 },
  { field: 'deltindipcc', header: 'IND IPCC', numero: true, decimales: 5 }
];

// Legacy components/proyecciones/CrecimientoUsuarios.vue:6-63 (MES muestra SEMESTRE).
const COLUMNAS_USUARIOS: TablaColumn[] = [
  { field: 'codAps', header: 'APS' },
  { field: 'anno', header: 'AÑO' },
  { field: 'semestre', header: 'MES' },
  { field: 'coduso', header: 'COD_USO' },
  { field: 'nomclaseuso', header: 'CLASE_USO' },
  { field: 'codfactor', header: 'COD_FACTOR' },
  { field: 'valorfactor', header: 'VLR_FACTOR' },
  { field: 'codtipopred', header: 'COD_TIPRED' },
  { field: 'nomtipopred', header: 'TIPO_PRED' },
  { field: 'cantidad', header: 'CANTIDAD', numero: true },
  { field: 'toneladas', header: 'TONELADAS', numero: true }
];
const CAMPOS_4_DECIMALES = new Set(['cantidad', 'toneladas']);

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

  cargandoLineaTiempo = signal(false);
  cargandoCrecimiento = signal(false);

  lineaTiempoRows = signal<LineaTiempoRow[]>([]);
  usuarios = signal<FilaDinamica[]>([]);
  propia = signal<FilaDinamica[]>([]);
  terceros = signal<FilaDinamica[]>([]);
  descuentos = signal<FilaDinamica[]>([]);

  columnasUsuarios = computed(() => COLUMNAS_USUARIOS);
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
        // Legacy ProyService.js:547-558: éxito solo con res === 1; si no, "<res> Error al ejecutar la proyeccion ".
        this.messages.add(exito
          ? { severity: 'success', summary: 'Proceso ejecutado correctamente' }
          : { severity: 'error', summary: `${r.data?.resultado} Error al ejecutar la proyeccion ` });
      },
      error: (err) => {
        this.ejecutando.set(false);
        this.resultadoExito.set(false);
        this.resultado.set(err?.error?.message || 'Error al ejecutar la proyección');
      }
    });
  }

  // Legacy CrecimientoUsuarios.vue:89-96 (roundToDecimals): 0/null se muestra 0, el resto con toFixed(4).
  valorUsuario(value: unknown, field: string): unknown {
    if (!CAMPOS_4_DECIMALES.has(field)) return value;
    const numero = Number(value || 0);
    return numero === 0 ? 0 : numero.toFixed(4);
  }

  private cargarDatos(proyId: number): void {
    this.cargandoLineaTiempo.set(true);
    this.service.lineaTiempoByProyId(proyId).subscribe({
      next: (r) => {
        this.lineaTiempoRows.set(r.data || []);
        this.cargandoLineaTiempo.set(false);
      },
      error: () => this.cargandoLineaTiempo.set(false)
    });

    this.cargandoCrecimiento.set(true);
    this.service.consultarCrecimiento(this.apsaId()!, proyId).subscribe({
      next: (r) => {
        this.usuarios.set((r.data?.usuarios || []) as unknown as FilaDinamica[]);
        this.propia.set((r.data?.propia || []) as unknown as FilaDinamica[]);
        this.terceros.set((r.data?.terceros || []) as unknown as FilaDinamica[]);
        this.descuentos.set((r.data?.descuentos || []) as unknown as FilaDinamica[]);
        this.cargandoCrecimiento.set(false);
      },
      error: () => this.cargandoCrecimiento.set(false)
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
