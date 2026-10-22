import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { CrecimientoDriveTab, Proyeccion } from '../../models/proyecciones.models';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { ProyeccionSelectorComponent } from '../shared/proyeccion-selector.component';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';
import { columnasDesdeFilas, FilaDinamica } from '../shared/tabla-columnas.util';
import {
  ItemCrecimiento,
  mapearDescuentosDrive,
  mapearPropiaDrive,
  mapearTercerosDrive,
  mapearUsuariosDrive
} from './crecimiento-drive.mapper';

@Component({
  selector: 'app-crecimiento-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TabsModule, TextareaModule, ToastModule, ApsSelectorComponent, ProyeccionSelectorComponent, TablaAvanzadaComponent],
  providers: [MessageService],
  templateUrl: './crecimiento-page.component.html',
  styleUrls: ['./crecimiento-page.component.css']
})
export class CrecimientoPageComponent {
  apsaId = signal<number | null>(null);
  proyId = signal<number | null>(null);
  proyeccionSeleccionada = signal<Proyeccion | null>(null);

  cargandoDrive = signal(false);
  driveError = signal<string | null>(null);
  guardando = signal(false);

  usuarios = signal<FilaDinamica[]>([]);
  propia = signal<FilaDinamica[]>([]);
  terceros = signal<FilaDinamica[]>([]);
  descuentos = signal<FilaDinamica[]>([]);

  // computed() memoiza el resultado: solo se recalcula (y cambia de referencia)
  // cuando la señal fuente cambia. Si esto fuera un método plano llamado desde
  // el template (`columnas(usuarios())`), Object.keys().map() devolvería un
  // array NUEVO en cada ciclo de change detection -> [columnas] "cambia" siempre
  // -> ngOnChanges de app-tabla-avanzada se dispara en cada ciclo -> loop
  // infinito que frizza el tab (mismo bug ya visto en Detallado Tarifas).
  columnasUsuarios = computed(() => columnasDesdeFilas(this.usuarios()));
  columnasPropia = computed(() => columnasDesdeFilas(this.propia()));
  columnasTerceros = computed(() => columnasDesdeFilas(this.terceros()));
  columnasDescuentos = computed(() => columnasDesdeFilas(this.descuentos()));

  constructor(private readonly service: ProyeccionesService, private readonly messages: MessageService) {}

  onApsChange(apsaId: number | null): void {
    this.apsaId.set(apsaId);
    this.proyId.set(null);
    this.proyeccionSeleccionada.set(null);
    this.limpiarTabs();
  }

  cargarDesdeDrive(): void {
    const apsaId = this.apsaId();
    if (!apsaId) return;

    this.cargandoDrive.set(true);
    this.driveError.set(null);
    this.service.cargarCrecimientoDesdeDrive(apsaId).subscribe({
      next: (r) => {
        this.cargandoDrive.set(false);
        if (!r.status) {
          this.driveError.set(r.message);
          return;
        }
        this.limpiarTabs();
        for (const tab of r.data || []) {
          this.asignarTab(tab);
        }
      },
      error: (err) => {
        this.cargandoDrive.set(false);
        this.driveError.set(err?.error?.message || 'Error al cargar información desde Drive');
      }
    });
  }

  guardarUsuarios(): void {
    this.guardarTab('Usuarios', mapearUsuariosDrive, this.usuarios(), body => this.service.registrarCrecimientoUsuarios(body));
  }

  guardarPropia(): void {
    this.guardarTab('Información Propia', mapearPropiaDrive, this.propia(), body => this.service.registrarCrecimientoInfPropia(body));
  }

  guardarTerceros(): void {
    this.guardarTab('Información Terceros', mapearTercerosDrive, this.terceros(), body => this.service.registrarCrecimientoInfTerceros(body));
  }

  guardarDescuentos(): void {
    this.guardarTab('Descuentos', mapearDescuentosDrive, this.descuentos(), body => this.service.registrarDescuento(body));
  }

  // Las filas de Drive vienen con las cabeceras de la hoja; se traducen a los campos del
  // request antes de enviarlas (ver crecimiento-drive.mapper.ts).
  private guardarTab(
    etiqueta: string,
    mapear: (filas: FilaDinamica[]) => ItemCrecimiento[],
    filas: FilaDinamica[],
    enviar: (body: { apsaId: number; proyId: number; items: ItemCrecimiento[] }) => ReturnType<ProyeccionesService['registrarCrecimientoUsuarios']>
  ): void {
    const apsaId = this.apsaId();
    const proyId = this.proyId();
    if (!apsaId || !proyId) return;

    let items: ItemCrecimiento[];
    try {
      items = mapear(filas);
    } catch (error) {
      this.messages.add({ severity: 'error', summary: etiqueta, detail: (error as Error).message });
      return;
    }

    this.guardando.set(true);
    enviar({ apsaId, proyId, items }).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.messages.add({ severity: r.status ? 'success' : 'error', summary: etiqueta, detail: r.message });
      },
      error: () => this.guardando.set(false)
    });
  }

  private asignarTab(tab: CrecimientoDriveTab): void {
    if (tab.error) {
      this.messages.add({ severity: 'warn', summary: tab.sheetTitle, detail: tab.error });
      return;
    }

    switch (tab.sheetTitle) {
      case 'USUARIOS':
        this.usuarios.set(tab.rows);
        break;
      case 'INFORMACION_PROPIA':
        this.propia.set(tab.rows);
        break;
      case 'INFORMACION_TERCERO':
        this.terceros.set(tab.rows);
        break;
      case 'DESCUENTOS_COSTOS':
        this.descuentos.set(tab.rows);
        break;
    }
  }

  private limpiarTabs(): void {
    this.usuarios.set([]);
    this.propia.set([]);
    this.terceros.set([]);
    this.descuentos.set([]);
    this.driveError.set(null);
  }
}
