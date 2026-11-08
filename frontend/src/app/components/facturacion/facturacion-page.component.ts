import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ThemeService } from '../../services/theme.service';
import { FilaFacturacion, resumirFacturacion } from './facturacion-resumen';
import { PaletaGraficas, graficaClases, graficaComponentes, graficaTiposTarifa } from './facturacion-graficas';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { FacturacionService } from '../../services/facturacion.service';
import { FacturacionRequest, FacturacionResponse } from '../../models/facturacion.models';
import { redondearFilas } from '../../shared/redondeo.util';

Chart.register(...registerables);

type FacturacionTab = 'facturacion' | 'detafacturacion' | 'facturacionclus' | 'facturaciondinc' | 'facturacionelectronica';

const RESUMEN_ABIERTO_KEY = 'facturacion-resumen-abierto';

@Component({
  selector: 'app-facturacion-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent],
  template: `
    <section>
      <app-parametros-consulta
        [(aps)]="aps"
        [(anno)]="anno"
        [(mes)]="mes"
        [loading]="loading()"
        [autoConsultar]="true"
        (consultar)="consultar()"
        (parametrosIncompletos)="limpiar()"
      ></app-parametros-consulta>

      <div *ngIf="error()" class="error-message">{{ error() }}</div>

      <!-- Detallado de facturación (design/facturacion-detallado): only while the Facturación tab is active. -->
      @if (currentTab() === 'facturacion') {
        <button
          type="button"
          class="resumen-toggle"
          [attr.aria-expanded]="resumenAbierto()"
          aria-controls="facturacion-resumen-bloque"
          (click)="alternarResumen()"
        >
          <i class="pi pi-chart-bar" aria-hidden="true"></i>
          <span class="resumen-toggle-titulo">Resumen de tarifas</span>
          <span class="resumen-toggle-ayuda">Tarjetas y gráficas por tipo de factura y tarifa</span>
          <i class="pi resumen-toggle-chevron" [class.pi-chevron-down]="!resumenAbierto()" [class.pi-chevron-up]="resumenAbierto()" aria-hidden="true"></i>
        </button>
      }
      @if (currentTab() === 'facturacion' && resumenAbierto()) {
        <div id="facturacion-resumen-bloque" class="resumen-bloque">
        <div class="card-section filtros-resumen">
          <div class="form-group">
            <label for="facturacion-tipo-factura">Tipo de factura</label>
            <p-select
              inputId="facturacion-tipo-factura"
              [options]="resumen().opcionesTipoFactura"
              [ngModel]="resumen().tipoFactura"
              (ngModelChange)="tipoFactura.set($event)"
              [disabled]="!resumen().opcionesTipoFactura.length"
              placeholder="—"
              [style]="{ width: '100%' }"
            ></p-select>
          </div>
          <div class="form-group">
            <label for="facturacion-tipo-tarifa">Tipo de tarifa</label>
            <p-select
              inputId="facturacion-tipo-tarifa"
              [options]="resumen().opcionesTipoTarifa"
              [ngModel]="resumen().tipoTarifa"
              (ngModelChange)="tipoTarifa.set($event)"
              [disabled]="!resumen().opcionesTipoTarifa.length"
              placeholder="—"
              [style]="{ width: '100%' }"
            ></p-select>
          </div>
          <p class="nota-resumen">Tarjetas y gráficas se calculan con las filas que ya devuelve la tabla.</p>
        </div>

        <div class="facturacion-resumen">
          @if (loadingTabs().has('facturacion') || resumen().vacio) {
            <div class="card-section resumen-vacio">
              <i class="pi pi-chart-bar"></i>
              <span>{{ loadingTabs().has('facturacion')
                ? 'Cargando filas de facturación…'
                : filasResumen() === null
                  ? 'Seleccione APS, año y mes para ver las tarjetas y gráficas.'
                  : 'No hay filas de facturación para calcular las tarjetas y gráficas.' }}</span>
            </div>
          } @else {
            <div class="resumen-tarjetas">
              @for (t of tarjetasResumen(); track t.etiqueta) {
                <div class="resumen-tarjeta">
                  <span class="etiqueta">{{ t.etiqueta }}</span>
                  <span class="valor">{{ t.valor }}@if (t.unidad) {<span class="unidad"> {{ t.unidad }}</span>}</span>
                  <span [class]="'detalle tono-' + t.tono">{{ t.detalle }}</span>
                </div>
              }
            </div>

            <div class="resumen-graficas">
              <div class="resumen-grafica">
                <div class="encabezado">
                  <h2>Tarifa plena y lo que paga cada clase</h2>
                  <p class="subtitulo">{{ resumen().subtituloClases }}</p>
                </div>
                <ul class="leyenda">
                  <li><span class="punto punto-plena"></span>Tarifa plena</li>
                  <li><span class="punto tono-subsidio"></span>Paga menos (subsidio)</li>
                  <li><span class="punto tono-contribucion"></span>Paga más (contribución)</li>
                </ul>
                <div class="lienzo" [style.height.px]="resumen().clases.length * 23 + 34">
                  <canvas #graficaClases aria-label="Tarifa plena y lo que paga cada clase" role="img"></canvas>
                </div>
              </div>

              <div class="resumen-grafica">
                <div class="encabezado">
                  <h2>De qué se compone la tarifa plena</h2>
                  <p class="subtitulo">Estrato 4 · parte de cada componente</p>
                </div>
                <div class="lienzo" [style.height.px]="resumen().componentes.length * 31">
                  <canvas #graficaComponentes aria-label="De qué se compone la tarifa plena" role="img"></canvas>
                </div>
              </div>

              <div class="resumen-grafica">
                <div class="encabezado">
                  <h2>Lo que paga según el tipo de tarifa</h2>
                  <p class="subtitulo">{{ resumen().subtituloTarifas }}</p>
                </div>
                <ul class="leyenda">
                  <li><span class="cuadro tono-subsidio"></span>Estrato 1</li>
                  <li><span class="cuadro tono-neutro"></span>Estrato 4</li>
                  <li><span class="cuadro tono-contribucion"></span>Estrato 6</li>
                </ul>
                <div class="lienzo" [style.height.px]="resumen().porTipoTarifa.length * 64 + 34">
                  <canvas #graficaTarifas aria-label="Lo que paga según el tipo de tarifa" role="img"></canvas>
                </div>
              </div>
            </div>
          }
        </div>
        </div>
      }

      <div class="table-wrapper table-scroll">
      <p-tabs [value]="currentTab()" (valueChange)="onTabChange($event)">
        <p-tablist>
          <p-tab value="facturacion">Facturación</p-tab>
          <p-tab value="facturacionelectronica">Facturación Electrónica</p-tab>
          <p-tab value="detafacturacion">Det Facturación</p-tab>
          <p-tab value="facturacionclus">Det Facturación CLUS</p-tab>
          <p-tab value="facturaciondinc">Det Facturación DINC</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="facturacion">
            <app-tabla-avanzada
              [rowsPerPageOptionsList]="paginadorLegacy"
              [columnas]="columnasFacturacion"
              [rows]="resultados().facturacion?.filas || []"
              [loading]="loadingTabs().has('facturacion')"
                  storageKey="facturacion-facturacion"
              nombreExportar="InfoFacturacion"
            ></app-tabla-avanzada>
          </p-tabpanel>
          <p-tabpanel value="facturacionelectronica">
            <app-tabla-avanzada
              [rowsPerPageOptionsList]="paginadorLegacy"
              [columnas]="columnasFacturacionElectronica"
              [rows]="resultados().facturacionelectronica?.filas || []"
              [loading]="loadingTabs().has('facturacionelectronica')"
                  storageKey="facturacion-electronica"
              nombreExportar="InfoFacturacionElectronica"
            ></app-tabla-avanzada>
          </p-tabpanel>
          <p-tabpanel value="detafacturacion">
            <app-tabla-avanzada
              [rowsPerPageOptionsList]="paginadorLegacy"
              [columnas]="columnasDetaFacturacion"
              [rows]="resultados().detafacturacion?.filas || []"
              [loading]="loadingTabs().has('detafacturacion')"
                  storageKey="facturacion-detafacturacion"
              nombreExportar="InfoDetFactura"
            ></app-tabla-avanzada>
          </p-tabpanel>
          <p-tabpanel value="facturacionclus">
            <app-tabla-avanzada
              [rowsPerPageOptionsList]="paginadorLegacy"
              [columnas]="columnasFacturacionClus"
              [rows]="resultados().facturacionclus?.filas || []"
              [loading]="loadingTabs().has('facturacionclus')"
                  storageKey="facturacion-clus"
              nombreExportar="InfoFactClus"
            ></app-tabla-avanzada>
          </p-tabpanel>
          <p-tabpanel value="facturaciondinc">
            <app-tabla-avanzada
              [rowsPerPageOptionsList]="paginadorLegacy"
              [columnas]="columnasFacturacionDinc"
              [rows]="resultados().facturaciondinc?.filas || []"
              [loading]="loadingTabs().has('facturaciondinc')"
                  storageKey="facturacion-dinc"
              nombreExportar="InfoFactDINC"
            ></app-tabla-avanzada>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
      </div>
    </section>
  `,
  styles: [`
    .resumen-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      margin-bottom: 1rem;
      padding: 0.85rem 1.25rem;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 12px;
      background: var(--color-bg-card, #fff);
      color: var(--color-text-primary, #0f172a);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .resumen-toggle:hover { border-color: var(--color-brand-accent, #e30613); }
    .resumen-toggle:focus-visible { outline: 2px solid var(--color-brand-accent, #e30613); outline-offset: 2px; }
    .resumen-toggle-titulo { font-weight: 600; }
    .resumen-toggle-ayuda { color: var(--color-text-secondary, #64748b); font-size: 0.85rem; }
    .resumen-toggle-chevron { margin-left: auto; color: var(--color-text-secondary, #64748b); }

    /* Subsidio / contribución colors of the design; lighter in dark mode for contrast. */
    :host {
      --fact-subsidio: #1f5fbf;
      --fact-contribucion: #b45309;
      --fact-neutro: #8a94a6;
      --fact-componente: #16335a;
      --fact-pista: #eef1f6;
    }
    :host-context(.app-dark) {
      --fact-subsidio: #6ea2f0;
      --fact-contribucion: #f59e0b;
      --fact-neutro: #94a3b8;
      --fact-componente: #93b4e0;
      --fact-pista: #334155;
    }
    .card-section {
      background: var(--color-bg-card);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
    .filtros-resumen {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 16px;
      padding: 16px 20px;
    }
    .filtros-resumen .form-group { flex: 0 1 200px; min-width: 160px; }
    .filtros-resumen label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--color-text-body);
    }
    .nota-resumen {
      margin: 0 0 0 auto;
      max-width: 340px;
      font-size: 12px;
      color: var(--color-text-secondary);
      align-self: center;
    }
    .resumen-vacio {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--color-text-secondary);
      font-size: 14px;
    }
    .resumen-vacio .pi { font-size: 18px; }
    .resumen-tarjetas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }
    .resumen-tarjeta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 16px 18px;
      background: var(--color-bg-card);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .resumen-tarjeta .etiqueta { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); }
    .resumen-tarjeta .valor {
      font-size: 28px;
      font-weight: 600;
      line-height: 1.15;
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
    }
    .resumen-tarjeta .unidad { font-size: 14px; font-weight: 500; color: var(--color-text-secondary); }
    .resumen-tarjeta .detalle { font-size: 12px; color: var(--color-text-secondary); }
    .resumen-tarjeta .detalle.tono-subsidio { color: var(--fact-subsidio); }
    .resumen-tarjeta .detalle.tono-contribucion { color: var(--fact-contribucion); }
    .resumen-graficas {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
      gap: 14px;
      margin-bottom: 20px;
    }
    @media (max-width: 1100px) {
      .resumen-graficas { grid-template-columns: minmax(0, 1fr); }
    }
    .resumen-grafica {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 18px 20px;
      background: var(--color-bg-card);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .resumen-grafica .encabezado { display: flex; flex-direction: column; gap: 2px; }
    .resumen-grafica h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
    .resumen-grafica .subtitulo { margin: 0; font-size: 12px; color: var(--color-text-secondary); }
    .leyenda {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 12px;
      color: var(--color-text-secondary);
    }
    .leyenda li { display: flex; align-items: center; gap: 6px; }
    .leyenda .punto, .leyenda .cuadro { width: 10px; height: 10px; border-radius: 50%; }
    .leyenda .cuadro { border-radius: 2px; }
    .leyenda .punto-plena { background: var(--color-bg-card); border: 1.5px solid var(--fact-neutro); }
    .leyenda .tono-subsidio { background: var(--fact-subsidio); }
    .leyenda .tono-contribucion { background: var(--fact-contribucion); }
    .leyenda .tono-neutro { background: var(--fact-neutro); }
    .lienzo { position: relative; width: 100%; }
    .error-message {
      background: var(--color-bg-danger-soft);
      border: 1px solid var(--color-border-danger-soft);
      color: var(--color-brand-accent);
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
    }
  `]
})
export class FacturacionPageComponent implements OnDestroy {
  /** Legacy Facturación grids offered 10/20/100/200 rows per page. */
  readonly paginadorLegacy = [10, 20, 100, 200];

  aps: number | null = null;
  anno: number | null = null;
  mes: number | null = null;

  readonly currentTab = signal<FacturacionTab>('facturacion');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly resultados = signal<Partial<Record<FacturacionTab, FacturacionResponse>>>({});
  /** Tabs con consulta en vuelo (puede haber más de una si el usuario
   *  cambia de pestaña mientras otra carga). */
  readonly loadingTabs = signal<ReadonlySet<FacturacionTab>>(new Set());

  /** Facturación rows before rounding (rounding turns a missing value into 0; the summary shows "—"). */
  readonly filasResumen = signal<FilaFacturacion[] | null>(null);
  readonly tipoFactura = signal<string | null>(null);
  /** The summary block starts collapsed; the user's last choice is remembered. */
  readonly resumenAbierto = signal(localStorage.getItem(RESUMEN_ABIERTO_KEY) === 'true');
  readonly tipoTarifa = signal<string | null>(null);
  readonly resumen = computed(() =>
    resumirFacturacion(this.filasResumen() ?? [], { tipoFactura: this.tipoFactura(), tipoTarifa: this.tipoTarifa() })
  );
  readonly tarjetasResumen = computed(() => this.resumen().tarjetas);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly theme = inject(ThemeService);
  private readonly lienzoClases = viewChild<ElementRef<HTMLCanvasElement>>('graficaClases');
  private readonly lienzoComponentes = viewChild<ElementRef<HTMLCanvasElement>>('graficaComponentes');
  private readonly lienzoTarifas = viewChild<ElementRef<HTMLCanvasElement>>('graficaTarifas');
  private graficas: Chart[] = [];

  readonly columnasFacturacion: TablaColumn[] = [
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'TIPO_FACT', header: 'Tipo Fac', filtrable: true },
    { field: 'FAPR_NOMBRE', header: 'Factor P.', filtrable: true },
    { field: 'TARI_MES', header: 'Mes' },
    { field: 'FAPR_VALOR', header: 'Vlr Factor.', numero: true },
    { field: 'TARI_SUBCONT', header: 'Sub & Con', numero: true },
    { field: 'TARI_TC', header: 'TC', numero: true },
    { field: 'TARI_TBL', header: 'TBL', numero: true },
    { field: 'TARI_TLU', header: 'TLU', numero: true },
    { field: 'TARI_TRT', header: 'TRT', numero: true },
    { field: 'TARI_TDF', header: 'TDF', numero: true },
    { field: 'TARI_TTL', header: 'TTL', numero: true },
    { field: 'TARI_TA', header: 'TA', numero: true },
    { field: 'TARIFAPLENA', header: 'T. Plena', numero: true },
    { field: 'TARI_TCSC', header: 'TC SC', numero: true },
    { field: 'TARI_TBLSC', header: 'TBL SC', numero: true },
    { field: 'TARI_TLUSC', header: 'TLU SC', numero: true },
    { field: 'TARI_TRTSC', header: 'TRT SC', numero: true },
    { field: 'TARI_TDFSC', header: 'TDF SC', numero: true },
    { field: 'TARI_TTLSC', header: 'TTL SC', numero: true },
    { field: 'TARI_TASC', header: 'TA SC', numero: true },
    { field: 'TARIFASYC', header: 'Tar. S&C', numero: true },
    { field: 'TARI_TRNA', header: 'TRNA', numero: true },
    { field: 'TARI_TAFNA', header: 'TAFNA', numero: true },
    { field: 'TARI_TAFA', header: 'TAFA', numero: true },
    { field: 'TARI_TRA', header: 'TRA', numero: true },
    { field: 'TARI_TRBL', header: 'TRBL', numero: true },
    { field: 'TARI_TRLU', header: 'TRLU', numero: true },
    { field: 'TARI_TRRA', header: 'TRRA', numero: true },
    { field: 'TARI_CRT', header: 'CRT', numero: true },
    { field: 'TARI_CDF', header: 'CFT', numero: true },
    { field: 'TARI_CTL', header: 'CTL', numero: true },
    { field: 'TARI_VBA', header: 'VBA', numero: true },
    { field: 'TARI_CP', header: 'CP', numero: true },
    { field: 'TARI_CLAV', header: 'CLAV', numero: true },
    { field: 'TARI_CLP', header: 'CLP', numero: true },
    { field: 'TARI_CCEI', header: 'CCEI', numero: true },
    { field: 'TARI_CCEM', header: 'CCEM', numero: true }
  ];

  private readonly decimalesFacturacion: Record<string, number> = {
    FAPR_VALOR: 2, TARI_SUBCONT: 2, TARI_TC: 6, TARI_TBL: 2, TARI_TLU: 2, TARI_TRT: 2, TARI_TDF: 2, TARI_TTL: 2,
    TARI_TA: 2, TARIFAPLENA: 2, TARI_TCSC: 2, TARI_TBLSC: 2, TARI_TLUSC: 2, TARI_TRTSC: 2, TARI_TDFSC: 2,
    TARI_TTLSC: 2, TARI_TASC: 2, TARIFASYC: 2, TARI_TRNA: 6, TARI_TAFNA: 6, TARI_TAFA: 6, TARI_TRA: 6,
    TARI_TRBL: 6, TARI_TRLU: 6, TARI_TRRA: 6, TARI_CRT: 6, TARI_CDF: 6, TARI_CTL: 6, TARI_VBA: 6, TARI_CP: 6,
    TARI_CLAV: 6, TARI_CLP: 6, TARI_CCEI: 6, TARI_CCEM: 6
  };

  readonly columnasDetaFacturacion: TablaColumn[] = [
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'RETA_VARIABLE', header: 'Tarifa' },
    { field: 'RETA_VALORMES', header: 'Valor Mes', numero: true },
    { field: 'RETA_VALORPROM', header: 'Promedio', numero: true }
  ];

  private readonly decimalesDetaFacturacion: Record<string, number> = {
    RETA_VALORMES: 6, RETA_VALORPROM: 6
  };

  readonly columnasFacturacionClus: TablaColumn[] = [
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'FACTURA', header: 'Tipo Fac', filtrable: true },
    { field: 'FAPR_NOMBRE', header: 'Factor P.', filtrable: true },
    { field: 'FAPR_VALOR', header: 'Vlr Factor.', numero: true },
    { field: 'TARI_SUBCONT', header: 'Sub & Con', numero: true },
    { field: 'TARI_TC', header: 'TC', numero: true },
    { field: 'TARI_TBL', header: 'TBL', numero: true },
    { field: 'TCP', header: 'TCP', numero: true },
    { field: 'TCCC', header: 'TCCC', numero: true },
    { field: 'TCLAV', header: 'TCLAV', numero: true },
    { field: 'TCLP', header: 'TCLP', numero: true },
    { field: 'TCCEI', header: 'TCCEI', numero: true },
    { field: 'TCCEM', header: 'TCCEM', numero: true },
    { field: 'TARI_TRT', header: 'TRT', numero: true },
    { field: 'TARI_TTL', header: 'TTL', numero: true },
    { field: 'TARI_TA', header: 'TA', numero: true },
    { field: 'TARIFAPLENA', header: 'T. Plena', numero: true },
    { field: 'TARI_TCSC', header: 'TC SC', numero: true },
    { field: 'TCPSC', header: 'TCP SC', numero: true },
    { field: 'TCCCSC', header: 'TCCC SC', numero: true },
    { field: 'TCLAVSC', header: 'TCLAV SC', numero: true },
    { field: 'TCLPSC', header: 'TCLP SC', numero: true },
    { field: 'TCCEISC', header: 'TCCEI SC', numero: true },
    { field: 'TCCEMSC', header: 'TCCEM SC', numero: true },
    { field: 'TARI_TRTSC', header: 'TRT SC', numero: true },
    { field: 'TARI_TTLSC', header: 'TTL SC', numero: true },
    { field: 'TARI_TASC', header: 'TA SC', numero: true },
    { field: 'TARI_TRNA', header: 'TRNA', numero: true },
    { field: 'TARI_TAFNA', header: 'TAFNA', numero: true },
    { field: 'TARI_TAFA', header: 'TAFA', numero: true },
    { field: 'TARI_TRA', header: 'TRA', numero: true },
    { field: 'TARI_TRBL', header: 'TRBL', numero: true },
    { field: 'TARI_TRLU', header: 'TRLU', numero: true },
    { field: 'TARI_TRRA', header: 'TRRA', numero: true },
    { field: 'TARI_CRT', header: 'CRT', numero: true },
    { field: 'TARI_CDF', header: 'CFT', numero: true },
    { field: 'TARI_CTL', header: 'CTL', numero: true },
    { field: 'TARI_VBA', header: 'VBA', numero: true }
  ];

  private readonly decimalesFacturacionClus: Record<string, number> = {
    FAPR_VALOR: 2, TARI_SUBCONT: 2, TARI_TC: 2, TARI_TBL: 2, TCP: 2, TCCC: 2, TCLAV: 2, TCLP: 2, TCCEI: 2,
    TCCEM: 2, TARI_TRT: 2, TARI_TTL: 2, TARI_TA: 2, TARIFAPLENA: 2, TARI_TCSC: 2, TCPSC: 2, TCCCSC: 2,
    TCLAVSC: 2, TCLPSC: 2, TCCEISC: 2, TCCEMSC: 2, TARI_TRTSC: 2, TARI_TTLSC: 2, TARI_TASC: 2, TARI_TRNA: 6,
    TARI_TAFNA: 6, TARI_TAFA: 6, TARI_TRA: 6, TARI_TRBL: 6, TARI_TRLU: 6, TARI_TRRA: 6, TARI_CRT: 6,
    TARI_CDF: 6, TARI_CTL: 6, TARI_VBA: 6
  };

  readonly columnasFacturacionDinc: TablaColumn[] = [
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'TIPO_FACT', header: 'Tipo Fac', filtrable: true },
    { field: 'FAPR_NOMBRE', header: 'Factor P.', filtrable: true },
    { field: 'FAPR_VALOR', header: 'Vlr Factor.', numero: true },
    { field: 'TARI_SUBCONT', header: 'Sub & Con', numero: true },
    { field: 'DINC', header: 'SDINC', numero: true },
    { field: 'TARI_TC', header: 'TC', numero: true },
    { field: 'TARI_TBL', header: 'TBL', numero: true },
    { field: 'TARI_TLU', header: 'TLU', numero: true },
    { field: 'TARI_TRT', header: 'TRT', numero: true },
    { field: 'TARI_TDF', header: 'TDF', numero: true },
    { field: 'TARI_TTL', header: 'TTL', numero: true },
    { field: 'TARI_TA', header: 'TA', numero: true },
    { field: 'TARIFAPLENA', header: 'T. Plena', numero: true },
    { field: 'TARI_TCSC', header: 'TC SC', numero: true },
    { field: 'TARI_TBLSC', header: 'TBL SC', numero: true },
    { field: 'TARI_TLUSC', header: 'TLU SC', numero: true },
    { field: 'TARI_TRTSC', header: 'TRT SC', numero: true },
    { field: 'TARI_TDFSC', header: 'TDF SC', numero: true },
    { field: 'TARI_TTLSC', header: 'TTL SC', numero: true },
    { field: 'TARI_TASC', header: 'TA SC', numero: true },
    { field: 'TARIFASYC', header: 'Tar. S&C', numero: true },
    { field: 'TARI_TRNA', header: 'TRNA', numero: true },
    { field: 'TARI_TAFNA', header: 'TAFNA', numero: true },
    { field: 'TARI_TAFA', header: 'TAFA', numero: true },
    { field: 'TARI_TRA', header: 'TRA', numero: true },
    { field: 'TARI_TRBL', header: 'TRBL', numero: true },
    { field: 'TARI_TRLU', header: 'TRLU', numero: true },
    { field: 'TARI_TRRA', header: 'TRRA', numero: true },
    { field: 'TARI_CRT', header: 'CRT', numero: true },
    { field: 'TARI_CDF', header: 'CFT', numero: true },
    { field: 'TARI_CTL', header: 'CTL', numero: true },
    { field: 'TARI_VBA', header: 'VBA', numero: true },
    { field: 'TARI_CP', header: 'CP', numero: true },
    { field: 'TARI_CCC', header: 'CCC', numero: true },
    { field: 'TARI_CLAV', header: 'CLAV', numero: true },
    { field: 'TARI_CLP', header: 'CLP', numero: true },
    { field: 'TARI_CCEI', header: 'CCEI', numero: true },
    { field: 'TARI_CCEM', header: 'CCEM', numero: true }
  ];

  private readonly decimalesFacturacionDinc: Record<string, number> = {
    FAPR_VALOR: 2, TARI_SUBCONT: 2, DINC: 2, TARI_TC: 2, TARI_TBL: 2, TARI_TLU: 2, TARI_TRT: 2, TARI_TDF: 2,
    TARI_TTL: 2, TARI_TA: 2, TARIFAPLENA: 2, TARI_TCSC: 2, TARI_TBLSC: 2, TARI_TLUSC: 2, TARI_TRTSC: 2,
    TARI_TDFSC: 2, TARI_TTLSC: 2, TARI_TASC: 2, TARIFASYC: 2, TARI_TRNA: 2, TARI_TAFNA: 6, TARI_TAFA: 6,
    TARI_TRA: 6, TARI_TRBL: 6, TARI_TRLU: 6, TARI_TRRA: 6, TARI_CRT: 6, TARI_CDF: 6, TARI_CTL: 6, TARI_VBA: 6,
    TARI_CP: 6, TARI_CCC: 6, TARI_CLAV: 6, TARI_CLP: 6, TARI_CCEI: 6, TARI_CCEM: 6
  };

  readonly columnasFacturacionElectronica: TablaColumn[] = [
    { field: 'CLASEUSO', header: 'Clase Uso', filtrable: true },
    { field: 'TIPOTARIFA', header: 'Tipo Tarifa', filtrable: true },
    { field: 'SERVFACTURA', header: 'Tipo Fac', filtrable: true },
    { field: 'FACTOR', header: 'Factor P.', filtrable: true },
    { field: 'VALORFACTOR', header: 'Vlr Factor.', numero: true },
    { field: 'PORCSUBCONT', header: 'Sub & Con', numero: true },
    { field: 'TC', header: 'TC', numero: true },
    { field: 'TCAPROV', header: 'TCAPROV', numero: true },
    { field: 'TCAPROVPROP', header: 'TCAPROVPROP', numero: true },
    { field: 'TCAPROVTERC', header: 'TCAPROVTERC', numero: true },
    { field: 'TBL', header: 'TBL', numero: true },
    { field: 'TLU', header: 'TLU', numero: true },
    { field: 'TRT', header: 'TRT', numero: true },
    { field: 'TDF', header: 'TDF', numero: true },
    { field: 'TIAT', header: 'TIAT', numero: true },
    { field: 'TINCEN', header: 'TINCEN', numero: true },
    { field: 'TTL', header: 'TTL', numero: true },
    { field: 'TA', header: 'TA', numero: true },
    { field: 'TARIFAPLENA', header: 'T. Plena', numero: true },
    { field: 'TCSC', header: 'TCSC', numero: true },
    { field: 'TCAPROVSC', header: 'TCAPROVSC', numero: true },
    { field: 'TCAPROVPROPSC', header: 'TCAPROVPROPSC', numero: true },
    { field: 'TCAPROVTERCSC', header: 'TCAPROVTERCSC', numero: true },
    { field: 'TBLSC', header: 'TBLSC', numero: true },
    { field: 'TLUSC', header: 'TLUSC', numero: true },
    { field: 'TRTSC', header: 'TRTSC', numero: true },
    { field: 'TDFSC', header: 'TDFSC', numero: true },
    { field: 'TIATSC', header: 'TIATSC', numero: true },
    { field: 'TINCENSC', header: 'TINCENSC', numero: true },
    { field: 'TTLSC', header: 'TTLSC', numero: true },
    { field: 'TASC', header: 'TASC', numero: true },
    { field: 'TARIFASYC', header: 'Tar. S&C', numero: true },
    { field: 'TRNA', header: 'TRNA', numero: true },
    { field: 'TAFNA', header: 'TAFNA', numero: true },
    { field: 'TAFA', header: 'TAFA', numero: true },
    { field: 'TRA', header: 'TRA', numero: true },
    { field: 'TRBL', header: 'TRBL', numero: true },
    { field: 'TRLU', header: 'TRLU', numero: true },
    { field: 'TRRA', header: 'TRRA', numero: true },
    { field: 'CRT', header: 'CRT', numero: true },
    { field: 'CDF', header: 'CFT', numero: true },
    { field: 'COSTIAT', header: 'COSTIAT', numero: true },
    { field: 'COSTINCEN', header: 'COSTINCEN', numero: true },
    { field: 'CTL', header: 'CTL', numero: true },
    { field: 'VBA', header: 'VBA', numero: true },
    { field: 'CP', header: 'CP', numero: true },
    { field: 'CCC', header: 'CCC', numero: true },
    { field: 'CLAV', header: 'CLAV', numero: true },
    { field: 'CLP', header: 'CLP', numero: true },
    { field: 'CCEI', header: 'CCEI', numero: true },
    { field: 'CCEM', header: 'CCEM', numero: true }
  ];

  private readonly decimalesFacturacionElectronica: Record<string, number> = {
    VALORFACTOR: 2, PORCSUBCONT: 2, TC: 6, TCAPROV: 6, TCAPROVPROP: 6, TCAPROVTERC: 6, TBL: 2, TLU: 2, TRT: 2,
    TDF: 2, TIAT: 6, TINCEN: 6, TTL: 2, TA: 2, TARIFAPLENA: 2, TCSC: 2, TCAPROVSC: 6, TCAPROVPROPSC: 6,
    TCAPROVTERCSC: 6, TBLSC: 2, TLUSC: 2, TRTSC: 2, TDFSC: 2, TIATSC: 6, TINCENSC: 6, TTLSC: 2, TASC: 2,
    TARIFASYC: 2, TRNA: 6, TAFNA: 6, TAFA: 6, TRA: 6, TRBL: 6, TRLU: 6, TRRA: 6, CRT: 6, CDF: 6, COSTIAT: 6,
    COSTINCEN: 6, CTL: 6, VBA: 6, CP: 6, CCC: 6, CLAV: 6, CLP: 6, CCEI: 6, CCEM: 6
  };

  constructor(private readonly service: FacturacionService) {
    // Redraw the charts when their data, the theme or the rendered canvases change.
    afterRenderEffect(() => {
      const resumen = this.resumen();
      this.theme.oscuro();
      const lienzos = [this.lienzoClases(), this.lienzoComponentes(), this.lienzoTarifas()];
      this.destruirGraficas();
      if (lienzos.some((l) => !l)) return;
      const paleta = this.paleta();
      const configs = [graficaClases(resumen, paleta), graficaComponentes(resumen, paleta), graficaTiposTarifa(resumen, paleta)];
      lienzos.forEach((lienzo, i) => {
        const ctx = lienzo!.nativeElement.getContext('2d');
        if (ctx) this.graficas.push(new Chart(ctx, configs[i]));
      });
    });
  }

  ngOnDestroy(): void {
    this.destruirGraficas();
  }

  private destruirGraficas(): void {
    this.graficas.forEach((g) => g.destroy());
    this.graficas = [];
  }

  private paleta(): PaletaGraficas {
    const css = getComputedStyle(this.host.nativeElement);
    const v = (nombre: string) => css.getPropertyValue(nombre).trim();
    return {
      subsidio: v('--fact-subsidio'),
      contribucion: v('--fact-contribucion'),
      neutro: v('--fact-neutro'),
      componente: v('--fact-componente'),
      pista: v('--fact-pista'),
      fondo: v('--color-bg-card'),
      texto: v('--color-text-body'),
      textoSuave: v('--color-text-secondary'),
      rejilla: v('--color-border'),
      fuente: css.fontFamily
    };
  }

  alternarResumen(): void {
    const abierto = !this.resumenAbierto();
    this.resumenAbierto.set(abierto);
    localStorage.setItem(RESUMEN_ABIERTO_KEY, String(abierto));
  }

  consultar(): void {
    const aps = this.aps;
    const anno = this.anno;
    const mes = this.mes;
    const apsValido = aps !== null && aps > 0;
    const annoValido = anno !== null && anno >= 2000 && anno <= 2999;
    const mesValido = mes !== null && mes >= 1 && mes <= 12;
    if (!apsValido || !annoValido || !mesValido || aps === null || anno === null || mes === null) return;

    // Lazy per-tab: params changed -> drop cached results and load ONLY the
    // visible tab. The forkJoin version fetched all 5 queries up-front and
    // blocked the page on the slowest one (fatelectronica > 2 min in Oracle).
    this.error.set('');
    this.resultados.set({});
    this.filasResumen.set(null);
    this.cargarTab(this.currentTab());
  }

  private cargarTab(tab: FacturacionTab): void {
    const aps = this.aps;
    const anno = this.anno;
    const mes = this.mes;
    if (aps === null || anno === null || mes === null) return;
    if (this.resultados()[tab]) return; // already loaded for current params
    if (this.loadingTabs().has(tab)) return; // already in flight

    const payload: FacturacionRequest = { aps, mes, anno };
    this.loadingTabs.update(actual => new Set(actual).add(tab));
    this.loading.set(true);

    this.llamadaServicio(tab, payload).subscribe({
      next: (resp) => {
        // Params guard: if the user changed APS/anno/mes while this query was
        // in flight, DISCARD the stale response instead of mixing periods.
        if (this.aps === aps && this.anno === anno && this.mes === mes) {
          this.resultados.update(actual => ({ ...actual, [tab]: this.transformarFilas(tab, resp) }));
          if (tab === 'facturacion') this.filasResumen.set(resp.filas ?? []);
        }
        this.finalizarCarga(tab);
      },
      error: (e) => {
        if (this.aps === aps && this.anno === anno && this.mes === mes) {
          this.error.set(e?.error?.message || e?.message || 'Error consultando facturación.');
        }
        this.finalizarCarga(tab);
      }
    });
  }

  private finalizarCarga(tab: FacturacionTab): void {
    this.loadingTabs.update(actual => {
      const siguiente = new Set(actual);
      siguiente.delete(tab);
      return siguiente;
    });
    this.loading.set(this.loadingTabs().size > 0);
  }

  private llamadaServicio(tab: FacturacionTab, payload: FacturacionRequest) {
    switch (tab) {
      case 'facturacion': return this.service.facturacion(payload);
      case 'detafacturacion': return this.service.detafacturacion(payload);
      case 'facturacionclus': return this.service.facturacionclus(payload);
      case 'facturaciondinc': return this.service.facturaciondinc(payload);
      case 'facturacionelectronica': return this.service.facturacionelectronica(payload);
    }
  }

  private transformarFilas(tab: FacturacionTab, resp: FacturacionResponse): FacturacionResponse {
    switch (tab) {
      case 'facturacion':
        return {
          ...resp,
          filas: redondearFilas(
            resp.filas.map((fila) => ({ ...fila, TARI_MES: ((Number(fila['TARI_MES']) || 0) % 12) + 1 })),
            this.decimalesFacturacion
          )
        };
      case 'detafacturacion':
        return { ...resp, filas: redondearFilas(resp.filas, this.decimalesDetaFacturacion) };
      case 'facturacionclus':
        return { ...resp, filas: redondearFilas(resp.filas, this.decimalesFacturacionClus) };
      case 'facturaciondinc':
        return { ...resp, filas: redondearFilas(resp.filas, this.decimalesFacturacionDinc) };
      case 'facturacionelectronica':
        return { ...resp, filas: redondearFilas(resp.filas, this.decimalesFacturacionElectronica) };
    }
  }

  limpiar(): void {
    this.resultados.set({});
    this.filasResumen.set(null);
    this.error.set('');
  }

  onTabChange(value: string | number | undefined): void {
    const tab = String(value ?? 'facturacion') as FacturacionTab;
    this.currentTab.set(tab);
    this.cargarTab(tab);
  }
}
