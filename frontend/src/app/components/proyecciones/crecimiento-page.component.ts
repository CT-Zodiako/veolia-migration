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
    this.guardarTab(this.service.registrarCrecimientoUsuarios({ apsaId: this.apsaId(), proyId: this.proyId(), items: this.usuarios() }), 'Usuarios');
  }

  guardarPropia(): void {
    this.guardarTab(this.service.registrarCrecimientoInfPropia({ apsaId: this.apsaId(), proyId: this.proyId(), items: this.propia() }), 'Información Propia');
  }

  guardarTerceros(): void {
    this.guardarTab(this.service.registrarCrecimientoInfTerceros({ apsaId: this.apsaId(), proyId: this.proyId(), items: this.terceros() }), 'Información Terceros');
  }

  guardarDescuentos(): void {
    this.guardarTab(this.service.registrarDescuento({ apsaId: this.apsaId(), proyId: this.proyId(), items: this.descuentos() }), 'Descuentos');
  }

  private guardarTab(req$: ReturnType<ProyeccionesService['registrarCrecimientoUsuarios']>, etiqueta: string): void {
    if (!this.apsaId() || !this.proyId()) return;
    this.guardando.set(true);
    req$.subscribe({
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
