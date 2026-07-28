import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ReliqTarificadorService } from '../../services/reliquidacion/reliq-tarificador.service';
import {
  AprobarReliquidacionContadores,
  EstadoReliquidacion,
  Reliquidacion,
  ResumenTarificadorFila
} from '../../models/reliquidacion.model';

/**
 * Catálogo RELQESTADO confirmado contra `doc migracion/modules/reliquidacion/reliq.md:192-194`
 * y el legacy `reliq/controller.js:192-194`: 1=Creada, 2=Aplicada. No hay otros valores
 * vigentes documentados (el `CASE` de la doc trae un `ELSE 'ANULADO'` defensivo sobre una
 * vista distinta, pero la columna real está restringida a IN ('1','2')). Cualquier valor
 * fuera del catálogo se muestra tal cual en vez de asumir un tercer estado.
 */
const ESTADO_LABELS: Record<string, string> = {
  '1': 'Creada',
  '2': 'Aplicada'
};

function estadoLabel(estado: string | null | undefined): string {
  if (!estado) return '-';
  const limpio = estado.trim();
  return ESTADO_LABELS[limpio] ?? limpio;
}

/**
 * Réplica de `formatResultadoValor` (legacy `Tarificador.vue:228-233`): en el modal de
 * resultado de aprobación, un contador null/undefined/''/'-'/'0' se muestra como "Ninguna"
 * en vez de un número/guion crudo.
 */
function formatContador(valor: unknown): string {
  if (valor === null || valor === undefined) return 'Ninguna';
  const txt = String(valor).trim();
  if (txt === '' || txt === '-' || txt === '0') return 'Ninguna';
  return txt;
}

interface CambioCelda {
  antes: unknown;
  despues: unknown;
}

function esCambioCelda(valor: unknown): valor is CambioCelda {
  return typeof valor === 'object' && valor !== null && 'antes' in valor && 'despues' in valor;
}

/**
 * Aplana `fila.cambios: [{col, antes, despues}]` en columnas dinámicas `row[col] = {antes,
 * despues}`, igual que el `cambiosMap` construido en cada
 * `Resumen*TablaCambios.vue` legacy (ver p.ej. ResumenUsuariosTablaCambios.vue:156-160).
 */
function aplanarCambios(fila: ResumenTarificadorFila): Record<string, CambioCelda> {
  const mapa: Record<string, CambioCelda> = {};
  for (const cambio of fila.cambios ?? []) {
    if (cambio?.col) {
      mapa[cambio.col] = { antes: cambio.antes, despues: cambio.despues };
    }
  }
  return mapa;
}

/** Columnas dinámicas (unión de todos los `col` de `cambios` en el set de filas de un tab). */
function columnasCambioDesdeFilas(filas: ResumenTarificadorFila[]): TablaColumn[] {
  const set = new Set<string>();
  for (const fila of filas) {
    for (const cambio of fila.cambios ?? []) {
      if (cambio?.col) set.add(cambio.col);
    }
  }
  return Array.from(set).sort().map((col) => ({ field: col, header: col }));
}

function textoPlano(valor: unknown): string {
  return (typeof valor === 'string' ? valor : valor == null ? '' : String(valor)).trim();
}

function comoRegistro(valor: unknown): Record<string, unknown> | undefined {
  return valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : undefined;
}

/**
 * Columnas y "aplanado" de fila confirmados contra el legacy Vue (campo por campo):
 * `front-tarificador/src/reliq/components/tarificador/Resumen*TablaCambios.vue`.
 */
const USUARIOS_COLUMNAS: TablaColumn[] = [
  { field: 'nomempr', header: 'Empresa', filtrable: true },
  { field: 'nommpio', header: 'Municipio', filtrable: true },
  { field: 'fact', header: 'Factor', filtrable: true },
  { field: 'claseuso', header: 'Clase uso', filtrable: true },
  { field: 'tipoaforo', header: 'Tipo aforo', filtrable: true },
  { field: 'anno', header: 'Año' },
  { field: 'mes', header: 'Mes' }
];

// ResumenUsuariosTablaCambios.vue:163-169
function prepararFilaUsuarios(fila: ResumenTarificadorFila): Record<string, unknown> {
  const emprEmpr = comoRegistro(fila['empr_empr']);
  const diviDivi = comoRegistro(fila['divi_divi']);
  const faprCodigo = comoRegistro(fila['fapr_codigo']);
  const clasClaseuso = comoRegistro(fila['clas_claseuso']);
  const paraTiptar = comoRegistro(fila['para_tiptar20012']);

  return {
    nomempr: textoPlano(emprEmpr?.['nomempr']),
    nommpio: textoPlano(diviDivi?.['nommpio']),
    fact: textoPlano(faprCodigo?.['nomfact']),
    claseuso: textoPlano(clasClaseuso?.['nomclase']),
    tipoaforo: textoPlano(paraTiptar?.['nomclase']),
    anno: fila['iuae_anno'],
    mes: fila['iuae_mes'],
    ...aplanarCambios(fila)
  };
}

const EMPRESA_COLUMNAS: TablaColumn[] = [
  { field: 'nomempr', header: 'Empresa', filtrable: true },
  { field: 'nommpio', header: 'Municipio', filtrable: true },
  { field: 'anno', header: 'Año' },
  { field: 'mes', header: 'Mes' }
];

// ResumenEmpresaTablaCambios.vue:151-155
function prepararFilaEmpresa(fila: ResumenTarificadorFila): Record<string, unknown> {
  const emprEmpr = comoRegistro(fila['empr_empr']);
  const diviDivi = comoRegistro(fila['divi_divi']);

  return {
    nomempr: textoPlano(emprEmpr?.['nomempr']),
    nommpio: textoPlano(diviDivi?.['nommpio']),
    anno: fila['ined_anno'] ?? '',
    mes: fila['ined_mes'] ?? '',
    ...aplanarCambios(fila)
  };
}

const ADICIONAL_COLUMNAS: TablaColumn[] = [
  { field: 'nomempr', header: 'Empresa', filtrable: true },
  { field: 'nommpio', header: 'Municipio', filtrable: true },
  { field: 'anno', header: 'Año' },
  { field: 'mes', header: 'Mes' }
];

// ResumenAdicionalTablaCambios.vue:144-148
function prepararFilaAdicional(fila: ResumenTarificadorFila): Record<string, unknown> {
  const emprEmpr = comoRegistro(fila['empr_empr']);
  const diviDivi = comoRegistro(fila['divi_divi']);

  return {
    nomempr: textoPlano(emprEmpr?.['nomempr']),
    nommpio: textoPlano(diviDivi?.['nommpio']),
    anno: fila['cead_anno'] ?? '',
    mes: fila['cead_mes'] ?? '',
    ...aplanarCambios(fila)
  };
}

const RELLENO_COLUMNAS: TablaColumn[] = [
  { field: 'nomrelleno', header: 'Nombre Relleno', filtrable: true },
  { field: 'anno', header: 'Año' },
  { field: 'mes', header: 'Mes' }
];

// ResumenRellenoTablaCambios.vue:129-131
function prepararFilaRelleno(fila: ResumenTarificadorFila): Record<string, unknown> {
  const rellId = comoRegistro(fila['rell_id']);

  return {
    nomrelleno: textoPlano(rellId?.['nomrelleno']),
    anno: fila['iare_anno'] ?? '',
    mes: fila['iare_mes'] ?? '',
    ...aplanarCambios(fila)
  };
}

const APS_COLUMNAS: TablaColumn[] = [
  { field: 'nomempr', header: 'Nombre Empresa', filtrable: true },
  { field: 'nommpio', header: 'Nombre Municipio' },
  { field: 'anno', header: 'Año' },
  { field: 'mes', header: 'Mes' }
];

// ResumenApsTablaCambios.vue:131-134
function prepararFilaAps(fila: ResumenTarificadorFila): Record<string, unknown> {
  const emprEmpr = comoRegistro(fila['empr_empr']);
  const diviDivi = comoRegistro(fila['divi_divi']);

  return {
    nomempr: textoPlano(emprEmpr?.['nomempr']),
    nommpio: textoPlano(diviDivi?.['nommpio']),
    anno: (fila['iaed_anno'] ?? fila['iare_anno']) ?? '',
    mes: (fila['iaed_mes'] ?? fila['iare_mes']) ?? '',
    ...aplanarCambios(fila)
  };
}

@Component({
  selector: 'app-reliq-tarificador',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, TablaAvanzadaComponent, ...CommonPrimeNgModules],
  templateUrl: './reliq-tarificador.component.html',
  styleUrls: ['./reliq-tarificador.component.css']
})
export class ReliqTarificadorComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly loading = signal(false);
  readonly aprobando = signal(false);
  readonly showApproveModal = signal(false);
  readonly showResultadoModal = signal(false);
  readonly estado = signal<EstadoReliquidacion | null>(null);
  readonly estadoTexto = computed(() => estadoLabel(this.estado()?.estado));

  readonly aprobacionMensaje = signal('');
  readonly aprobacionResultado = signal<AprobarReliquidacionContadores | null>(null);
  readonly formatContador = formatContador;
  readonly esCambioCelda = esCambioCelda;

  private readonly resumenUsuariosRaw = signal<ResumenTarificadorFila[]>([]);
  private readonly resumenEmpresaRaw = signal<ResumenTarificadorFila[]>([]);
  private readonly resumenAdicionalRaw = signal<ResumenTarificadorFila[]>([]);
  private readonly resumenRellenoRaw = signal<ResumenTarificadorFila[]>([]);
  private readonly resumenApsRaw = signal<ResumenTarificadorFila[]>([]);

  readonly filasUsuarios = computed(() => this.resumenUsuariosRaw().map(prepararFilaUsuarios));
  readonly columnasUsuarios = computed<TablaColumn[]>(() => [...USUARIOS_COLUMNAS, ...columnasCambioDesdeFilas(this.resumenUsuariosRaw())]);

  readonly filasEmpresa = computed(() => this.resumenEmpresaRaw().map(prepararFilaEmpresa));
  readonly columnasEmpresa = computed<TablaColumn[]>(() => [...EMPRESA_COLUMNAS, ...columnasCambioDesdeFilas(this.resumenEmpresaRaw())]);

  readonly filasAdicional = computed(() => this.resumenAdicionalRaw().map(prepararFilaAdicional));
  readonly columnasAdicional = computed<TablaColumn[]>(() => [...ADICIONAL_COLUMNAS, ...columnasCambioDesdeFilas(this.resumenAdicionalRaw())]);

  readonly filasRelleno = computed(() => this.resumenRellenoRaw().map(prepararFilaRelleno));
  readonly columnasRelleno = computed<TablaColumn[]>(() => [...RELLENO_COLUMNAS, ...columnasCambioDesdeFilas(this.resumenRellenoRaw())]);

  readonly filasAps = computed(() => this.resumenApsRaw().map(prepararFilaAps));
  readonly columnasAps = computed<TablaColumn[]>(() => [...APS_COLUMNAS, ...columnasCambioDesdeFilas(this.resumenApsRaw())]);

  constructor(
    private readonly reliqService: ReliquidacionService,
    private readonly tarificadorService: ReliqTarificadorService
  ) {
    this.reliqService.getReliquidaciones().subscribe((res) => this.reliquidaciones.set(res.data || []));
  }

  consultar(): void {
    if (!this.selectedReliq()) return;
    const reliq = this.selectedReliq()!;
    this.loading.set(true);
    forkJoin({
      usuarios: this.tarificadorService.resumenUsuarios(reliq),
      empresa: this.tarificadorService.resumenEmpresa(reliq),
      adicional: this.tarificadorService.resumenAdicional(reliq),
      relleno: this.tarificadorService.resumenRelleno(reliq),
      aps: this.tarificadorService.resumenAps(reliq),
      estado: this.tarificadorService.estadoReliquidacion(reliq)
    }).subscribe({
      next: (res) => {
        this.resumenUsuariosRaw.set(res.usuarios.data?.resumen?.filas ?? []);
        this.resumenEmpresaRaw.set(res.empresa.data?.resumen?.filas ?? []);
        this.resumenAdicionalRaw.set(res.adicional.data?.resumen?.filas ?? []);
        this.resumenRellenoRaw.set(res.relleno.data?.resumen?.filas ?? []);
        this.resumenApsRaw.set(res.aps.data?.resumen?.filas ?? []);
        this.estado.set(res.estado.data ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  abrirAprobar(): void {
    this.showApproveModal.set(true);
  }

  aprobar(): void {
    if (!this.selectedReliq()) return;
    this.aprobando.set(true);
    this.tarificadorService.aprobarReliquidacion(this.selectedReliq()!).subscribe({
      next: (res) => {
        this.aprobando.set(false);
        this.showApproveModal.set(false);

        const data = res.data;
        this.aprobacionMensaje.set(data?.mensaje || res.message || 'Proceso ejecutado correctamente.');
        this.aprobacionResultado.set(data?.resultado?.resultados ?? null);
        this.showResultadoModal.set(true);

        this.consultar();
      },
      error: () => this.aprobando.set(false)
    });
  }
}
