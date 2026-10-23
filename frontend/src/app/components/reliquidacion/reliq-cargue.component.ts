import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TablaAvanzadaComponent, TablaColumn, valorMostrado } from '../shared/tabla-avanzada.component';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { ReliInfoAdicional, ReliInfoAps, ReliInfoEmpresa, ReliInfoRelleno, ReliInfoUsuarios, Reliquidacion } from '../../models/reliquidacion.model';

type CargueTab = 'usuarios' | 'empresa' | 'aps' | 'relleno' | 'adicional';

interface PlResult {
  isError: boolean;
  code: string | null;
  message: string;
}

// Legacy Cargue.vue parsePlResult: freli_reliquidar devuelve "TAG|code|mensaje";
// cualquier TAG que empiece con ERR es error.
export function parsePlResult(raw: unknown): PlResult {
  const txt = String(raw ?? '').trim();
  if (!txt) return { isError: false, code: null, message: '' };
  const parts = txt.split('|');
  const tag = (parts[0] || '').toUpperCase();
  if (tag.startsWith('ERR')) {
    return {
      isError: true,
      code: parts[1] || null,
      message: parts.slice(2).join('|') || 'Error en la ejecución.'
    };
  }
  return {
    isError: false,
    code: parts[1] || null,
    message: parts.slice(2).join('|') || txt
  };
}

@Component({
  selector: 'app-reliq-cargue',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, ...CommonPrimeNgModules, TablaAvanzadaComponent, ApsSelectorComponent],
  providers: [MessageService],
  templateUrl: './reliq-cargue.component.html',
  styleUrls: ['./reliq-cargue.component.css']
})
export class ReliqCargueComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly selectedAps = signal<number | null>(null);
  // Fila completa de la reliquidación elegida: alimenta Descripción y Horizonte
  // (Desde/Hasta) del selector, replicando el layout del legacy seleccionReliq.vue.
  readonly reliqSeleccionada = computed(() =>
    this.reliquidaciones().find((r) => r.relqId === this.selectedReliq()) ?? null
  );
  readonly currentTab = signal<CargueTab>('usuarios');
  readonly loading = signal(false);
  readonly reliquidando = signal(false);
  readonly guardando = signal(false);
  // Modo edición: apagado por defecto. Las celdas se ven como texto y no hay
  // botón "Guardar" hasta que se activa -- evita ediciones accidentales al
  // solo consultar. Exclusivo de esta pantalla (Cargue); no toca otras tablas.
  readonly editando = signal(false);
  readonly cambiandoModoEdicion = signal(false);
  readonly usuarios = signal<ReliInfoUsuarios[]>([]);
  readonly empresa = signal<ReliInfoEmpresa[]>([]);
  readonly aps = signal<ReliInfoAps[]>([]);
  readonly relleno = signal<ReliInfoRelleno[]>([]);
  readonly adicional = signal<ReliInfoAdicional[]>([]);

  // app-tabla-avanzada pide Record<string, unknown>[]; el casteo mantiene las
  // mismas referencias de fila, así la edición inline sigue pegándole a los
  // objetos que guardar() envía al backend.
  readonly usuariosRows = computed(() => this.usuarios() as unknown as Record<string, unknown>[]);
  readonly empresaRows = computed(() => this.empresa() as unknown as Record<string, unknown>[]);
  readonly apsRows = computed(() => this.aps() as unknown as Record<string, unknown>[]);
  readonly rellenoRows = computed(() => this.relleno() as unknown as Record<string, unknown>[]);
  readonly adicionalRows = computed(() => this.adicional() as unknown as Record<string, unknown>[]);

  // Filtros "Contiene" y redondeo a 2 decimales replicados de los Resum*.vue del
  // legacy (reliq/components/cargue/): cada tab filtra solo las columnas que filtraba allá.
  readonly columnasUsuarios: TablaColumn[] = [
    { field: 'anno', header: 'Año', filtrable: true },
    { field: 'mes', header: 'Mes', filtrable: true },
    { field: 'clasNombre', header: 'Clase Uso', filtrable: true },
    { field: 'tipoTarifaNombre', header: 'Tipo Tarifa', filtrable: true },
    { field: 'factorProduccionNombre', header: 'Factor Prod', filtrable: true },
    { field: 'cantidad', header: 'Cantidad', numero: true, decimales: 2 },
    { field: 'toneladas', header: 'Toneladas', numero: true, decimales: 2 }
  ];

  readonly columnasEmpresa: TablaColumn[] = [
    { field: 'anno', header: 'Año', filtrable: true },
    { field: 'mes', header: 'Mes', filtrable: true },
    { field: 'empresaNombre', header: 'Empresa', filtrable: true },
    { field: 'cblj', header: 'CBLJ', numero: true, decimales: 2 },
    { field: 'lblj', header: 'LBLJ', numero: true, decimales: 2 },
    { field: 'n', header: 'N', numero: true, decimales: 2 },
    { field: 'm3agua', header: 'M3AGUA', numero: true, decimales: 2 },
    { field: 'cp', header: 'CP', numero: true, decimales: 2 },
    { field: 'm2ccj', header: 'M2CCJ', numero: true, decimales: 2 },
    { field: 'm2lavj', header: 'M2LAVJ', numero: true, decimales: 2 },
    { field: 'tij', header: 'TIJ', numero: true, decimales: 2 },
    { field: 'klpj', header: 'KLPJ', numero: true, decimales: 2 },
    { field: 'tmj', header: 'TMJ', numero: true, decimales: 2 },
    { field: 'clavj', header: 'CLAVJ', numero: true, decimales: 2 },
    { field: 'qrtj', header: 'QRTJ', numero: true, decimales: 2 }
  ];

  readonly columnasAps: TablaColumn[] = [
    { field: 'anno', header: 'Año', filtrable: true },
    { field: 'mes', header: 'Mes', filtrable: true },
    { field: 'empresaNombre', header: 'Empresa', filtrable: true },
    { field: 'qrtz', header: 'QRTZ', numero: true, decimales: 2 },
    { field: 'cpe', header: 'CPE', numero: true, decimales: 2 },
    { field: 't', header: 'T', numero: true, decimales: 2 },
    { field: 'qbl', header: 'QBL', numero: true, decimales: 2 },
    { field: 'qlu', header: 'QLU', numero: true, decimales: 2 },
    { field: 'qr', header: 'QR', numero: true, decimales: 2 },
    { field: 'tafa', header: 'TAFA', numero: true, decimales: 2 },
    { field: 'nd', header: 'ND', numero: true, decimales: 2 },
    { field: 'na', header: 'NA', numero: true, decimales: 2 },
    { field: 'qna', header: 'QNA', numero: true, decimales: 2 },
    { field: 'tafna', header: 'TAFNA', numero: true, decimales: 2 },
    { field: 'qa', header: 'QA', numero: true, decimales: 2 },
    { field: 'aprovecha', header: 'APROVECHA', numero: true, decimales: 2 },
    { field: 'crtcomp', header: 'CRTCOMP', numero: true, decimales: 2 },
    { field: 'cdfcomp', header: 'CDFCOMP', numero: true, decimales: 2 },
    { field: 'qrscomp', header: 'QRSCOMP', numero: true, decimales: 2 },
    { field: 'naa', header: 'NAA', numero: true, decimales: 2 },
    { field: 'nda', header: 'NDA', numero: true, decimales: 2 }
  ];

  readonly columnasRelleno: TablaColumn[] = [
    { field: 'anno', header: 'Año', filtrable: true },
    { field: 'mes', header: 'Mes', filtrable: true },
    { field: 'qrs', header: 'QRS', numero: true, decimales: 2 },
    { field: 'c', header: 'QRSmunrecep', numero: true, decimales: 2 },
    { field: 'vl', header: 'VL', numero: true, decimales: 2 },
    { field: 'ctmlx', header: 'CTMLX', numero: true, decimales: 2 },
    { field: 'ctlk', header: 'CTLK', numero: true, decimales: 2 },
    { field: 'escenario', header: 'ESCENARIO', numero: true, decimales: 2 }
  ];

  readonly columnasAdicional: TablaColumn[] = [
    { field: 'anno', header: 'Año' },
    { field: 'mes', header: 'Mes' },
    { field: 'cdf', header: 'CDF', numero: true, decimales: 2 },
    { field: 'ctl', header: 'CTL', numero: true, decimales: 2 }
  ];

  // Campos editables de las 5 tabs. Los sets son disjuntos entre tabs y ninguno
  // pisa un campo de texto, así un único cellTemplate compartido alcanza.
  private readonly camposEditables = new Set([
    'cantidad', 'toneladas',
    'cblj', 'lblj', 'n', 'm3agua', 'cp', 'm2ccj', 'm2lavj', 'tij', 'klpj', 'tmj', 'clavj', 'qrtj',
    'qrtz', 'cpe', 't', 'qbl', 'qlu', 'qr', 'tafa', 'nd', 'na', 'qna', 'tafna', 'qa',
    'aprovecha', 'crtcomp', 'cdfcomp', 'qrscomp', 'naa', 'nda',
    'qrs', 'c', 'vl', 'ctmlx', 'ctlk', 'escenario',
    'cdf', 'ctl'
  ]);

  // Columnas de texto cuyo valor de display cae al código cuando el nombre viene null.
  private readonly fallbackTexto: Record<string, string> = {
    clasNombre: 'clasClaseUso',
    tipoTarifaNombre: 'paraTipTar20012',
    factorProduccionNombre: 'faprCodigo'
  };

  constructor(
    private readonly reliqService: ReliquidacionService,
    private readonly cargueService: ReliqCargueService,
    private readonly messages: MessageService,
    private readonly confirmationService: ConfirmationService,
    private readonly parametrosState: ParametrosConsultaStateService
  ) {
    this.cargarReliquidaciones(null);
  }

  esCampoEditable(field: string): boolean {
    return this.editando() && this.camposEditables.has(field);
  }

  toggleEditar(): void {
    // Tabs grandes (ej. APS, 20 columnas editables) tardan un tick en
    // re-renderizar todas las celdas como input; el spinner cubre ese
    // instante en vez de dejar el botón "colgado" sin feedback.
    // setTimeout(fn) sin delay (0ms) no alcanza a pintar el frame con el
    // spinner antes de apagarlo -- 250ms es lo mínimo para que el ojo lo
    // registre como "cargando" en vez de un parpadeo imperceptible.
    this.cambiandoModoEdicion.set(true);
    setTimeout(() => {
      this.editando.set(!this.editando());
      this.cambiandoModoEdicion.set(false);
    }, 250);
  }

  valorCeldaTexto(row: Record<string, unknown>, col: TablaColumn, value: unknown): unknown {
    if (col.decimales !== undefined) return valorMostrado(value, col);
    const fallback = this.fallbackTexto[col.field];
    const resuelto = value ?? (fallback ? row[fallback] : null);
    return resuelto ?? '';
  }

  onReliqChange(reliqId: number | null): void {
    this.selectedReliq.set(reliqId);
    this.parametrosState.setReliquidacion(reliqId);
    if (reliqId !== null) {
      this.consultar();
    }
  }

  // Legacy seleccionReliq.vue: el selector filtra las reliquidaciones por APS.
  // Con APS elegida trae getReliquidacionByAps (lista); al limpiar el APS vuelve
  // al listado completo de getReliquidaciones.
  onApsChange(apsId: number | null): void {
    this.selectedAps.set(apsId);
    this.selectedReliq.set(null);
    this.limpiarDatos();
    this.cargarReliquidaciones(apsId);
  }

  // Carga las opciones del selector de reliquidaciones. El requestId descarta
  // respuestas viejas: el APS restaurado por app-aps-selector dispara una segunda
  // carga apenas inicia la pantalla y solo la última respuesta debe ganar.
  private reliqRequestId = 0;

  private cargarReliquidaciones(apsId: number | null): void {
    const requestId = ++this.reliqRequestId;
    const source$ = apsId
      ? this.reliqService.getReliquidacionByAps(apsId)
      : this.reliqService.getReliquidaciones();
    source$.subscribe((res) => {
      if (requestId !== this.reliqRequestId) return;

      const data = res.data || [];
      this.reliquidaciones.set(data);

      // Restaura la última reliquidación elegida (en esta u otra pantalla del
      // módulo, ej. Comparar Tarifas / Comparar Costos) si sigue en la lista
      // filtrada por APS.
      if (this.selectedReliq() === null) {
        const guardada = this.parametrosState.getReliquidacion();
        if (guardada !== null && data.some((r) => r.relqId === guardada)) {
          this.onReliqChange(guardada);
        }
      }
    });
  }

  // RELQDESDE/RELQHASTA vienen como YYYYMM; se muestran como YYYY/MM en el
  // horizonte readonly del selector.
  formatPeriodo(value: string | null | undefined): string {
    if (!value || value.length !== 6) return '';
    return `${value.slice(0, 4)}/${value.slice(4, 6)}`;
  }

  private limpiarDatos(): void {
    this.usuarios.set([]);
    this.empresa.set([]);
    this.aps.set([]);
    this.relleno.set([]);
    this.adicional.set([]);
  }

  consultar(): void {
    if (!this.selectedReliq()) return;
    this.loading.set(true);
    const reliqId = this.selectedReliq()!;
    forkJoin({
      usuarios: this.cargueService.getReliInfoUsuarios(reliqId),
      empresa: this.cargueService.getResumenEmpresa(reliqId),
      aps: this.cargueService.getResumenAps(reliqId),
      relleno: this.cargueService.getResumenRelleno(reliqId),
      adicional: this.cargueService.getReliInfoAdicional(reliqId)
    }).subscribe({
      next: (res) => {
        this.usuarios.set(res.usuarios.data || []);
        this.empresa.set(res.empresa.data || []);
        this.aps.set(res.aps.data || []);
        this.relleno.set(res.relleno.data || []);
        this.adicional.set(res.adicional.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Reliquidación - Cargue', detail: 'No se pudo consultar la información.' });
      }
    });
  }

  reliquidarTarifa(): void {
    const reliqId = this.selectedReliq();
    if (!reliqId) return;

    const reliq = this.reliquidaciones().find((r) => r.relqId === reliqId);
    const apsaId = reliq?.apsaId;
    if (!apsaId) {
      this.messages.add({ severity: 'error', summary: 'Reliquidar Tarifa', detail: 'No se pudo determinar el APS de la reliquidación seleccionada.' });
      return;
    }

    this.confirmationService.confirm({
      header: 'Reliquidar Tarifa',
      message: '¿Seguro que querés reliquidar la tarifa de esta reliquidación?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reliquidar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => this.confirmarReliquidarTarifa(reliqId, apsaId)
    });
  }

  private confirmarReliquidarTarifa(reliqId: number, apsaId: number): void {
    this.reliquidando.set(true);
    this.cargueService.compararCostosCargue(reliqId, apsaId).subscribe({
      next: (res) => {
        this.reliquidando.set(false);
        // Legacy Cargue.vue compararCostosCargue: el sobre puede ser "ok" y el
        // paquete igual informar ERR|code|msg en su resultado.
        const ok = res.status === 'ok' || res.status === true;
        const parsed = parsePlResult(res.data?.resultado);
        if (!ok || parsed.isError) {
          const codeTxt = parsed.code ? ` (${parsed.code})` : '';
          const msg = parsed.message || 'No se ejecutó.';
          this.messages.add({ severity: 'error', summary: 'Reliquidar Tarifa', detail: `${msg}${codeTxt}. No se ejecutó.`, life: 6000 });
          return;
        }

        this.messages.add({ severity: 'success', summary: 'Reliquidar Tarifa', detail: parsed.message || 'Proceso ejecutado correctamente.', life: 4000 });
        // Legacy refrescaba las 5 tabs después de reliquidar.
        this.consultar();
      },
      error: (err) => {
        this.reliquidando.set(false);
        this.messages.add({ severity: 'error', summary: 'Reliquidar Tarifa', detail: err?.error?.message || 'No se pudo reliquidar la tarifa.' });
      }
    });
  }

  guardar(tab: CargueTab): void {
    this.guardando.set(true);
    const req$ =
      tab === 'usuarios' ? this.cargueService.updateReliInfoUsuarios(this.usuarios()) :
      tab === 'empresa' ? this.cargueService.updateResumenEmpresa(this.empresa()) :
      tab === 'aps' ? this.cargueService.updateResumenAps(this.aps()) :
      tab === 'relleno' ? this.cargueService.updateResumenRelleno(this.relleno()) :
      this.cargueService.updateResumenAdicional(this.adicional());

    req$.subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (res.status) {
          this.editando.set(false);
        }
        this.messages.add({ severity: res.status ? 'success' : 'error', summary: 'Reliquidación - Cargue', detail: res.message || 'Cambios guardados.' });
      },
      error: (err) => {
        this.guardando.set(false);
        this.messages.add({ severity: 'error', summary: 'Reliquidación - Cargue', detail: err?.error?.message || 'No se pudo guardar.' });
      }
    });
  }

  onTabChange(value: string | number | undefined): void {
    this.currentTab.set(String(value || 'usuarios') as CargueTab);
  }
}
