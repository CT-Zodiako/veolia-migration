import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { VerificacionPanelComponent } from './verificacion-panel.component';
import { PrechecksPanelComponent, PrecheckUiItem } from './prechecks-panel.component';
import { EjecucionPanelComponent, PipelineStepUi } from './ejecucion-panel.component';
import { CertificacionPanelComponent } from './certificacion-panel.component';
import { ToneladasPanelComponent } from './toneladas-panel.component';
import { KilometrosPanelComponent } from './kilometros-panel.component';
import { CostosConsultaPanelComponent } from './costos-consulta-panel.component';
import { CalculartarifasResponse, CertificarTarifasResponse, ValidapreactualizaResponse } from '../../models/costos.models';

@Component({
  selector: 'app-costos-calculo-page',
  standalone: true,
  imports: [
    CommonModule,
    ...CommonPrimeNgModules,
    DividerModule,
    MessageModule,
    ApsSelectorComponent,
    MesSelectorComponent,
    AnnoSelectorComponent,
    VerificacionPanelComponent,
    PrechecksPanelComponent,
    EjecucionPanelComponent,
    CertificacionPanelComponent,
    ToneladasPanelComponent,
    KilometrosPanelComponent,
    CostosConsultaPanelComponent
  ],
  template: `
    <p-card>
      <div class="flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
        <h3 class="m-0">Fase 2 · Cálculo de Tarifas</h3>
        <p-message *ngIf="globalLoading()" severity="info" text="Procesando solicitud..." />
      </div>

      <div class="grid mb-2">
        <div class="col-12 md:col-4">
          <label class="text-sm text-color-secondary">APS <i class="pi pi-question-circle" pTooltip="Código APS a procesar"></i></label>
          <app-aps-selector [selectedAps]="aps()" (selectedApsChange)="aps.set($event)" />
        </div>
        <div class="col-12 md:col-4">
          <label class="text-sm text-color-secondary">Año <i class="pi pi-question-circle" pTooltip="Vigencia del período"></i></label>
          <app-anno-selector [selectedAnno]="anno()" (selectedAnnoChange)="anno.set($event)" />
        </div>
        <div class="col-12 md:col-4">
          <label class="text-sm text-color-secondary">Mes <i class="pi pi-question-circle" pTooltip="Mes de liquidación"></i></label>
          <app-mes-selector [selectedMes]="mes()" (selectedMesChange)="mes.set($event)" />
        </div>
      </div>

      <p-divider />

      <p-tabs value="calculo">
        <p-tablist>
          <p-tab value="calculo">Cálculo</p-tab>
          <p-tab value="toneladas">Toneladas</p-tab>
          <p-tab value="kilometros">Kilómetros</p-tab>
          <p-tab value="consultas">Consultas</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="calculo">
            <div class="grid">
              <div class="col-12 lg:col-6">
                <app-verificacion-panel
                  [aps]="aps()"
                  [mes]="mes()"
                  [anno]="anno()"
                  [enabled]="true"
                  [blocked]="globalLoading()"
                  [showSkeleton]="false"
                  (verified)="onVerified($event)"
                  (loadingChange)="setPanelLoading('verify', $event)"
                />
              </div>

              <div class="col-12 lg:col-6">
                <app-prechecks-panel
                  [aps]="aps()"
                  [mes]="mes()"
                  [anno]="anno()"
                  [enabled]="isPrecheckEnabled()"
                  [blocked]="globalLoading()"
                  [showSkeleton]="!isPrecheckEnabled()"
                  (prechecksCompleted)="onPrechecksCompleted($event)"
                  (loadingChange)="setPanelLoading('precheck', $event)"
                />
              </div>

              <div class="col-12"><p-divider /></div>

              <div class="col-12 lg:col-6">
                <app-ejecucion-panel
                  [enabled]="isExecutionEnabled()"
                  [blocked]="globalLoading()"
                  [showSkeleton]="!isExecutionEnabled()"
                  [aps]="aps()"
                  [mes]="mes()"
                  [anno]="anno()"
                  [isAps1031]="isAps1031()"
                  [pipelineSteps]="pipelineSteps()"
                  (calculated)="onCalculated($event)"
                  (loadingChange)="setPanelLoading('execute', $event)"
                />
              </div>

              <div class="col-12 lg:col-6">
                <app-certificacion-panel
                  [enabled]="isCertEnabled()"
                  [blocked]="globalLoading()"
                  [showSkeleton]="!isCertEnabled()"
                  [aps]="aps()"
                  [mes]="mes()"
                  [anno]="anno()"
                  [calculoResultado]="calculoResultado()"
                  (certified)="onCertified($event)"
                  (loadingChange)="setPanelLoading('cert', $event)"
                />
              </div>
            </div>
          </p-tabpanel>
          <p-tabpanel value="toneladas">
            <app-toneladas-panel [aps]="aps()" [anno]="anno()" [mes]="mes()" />
          </p-tabpanel>
          <p-tabpanel value="kilometros">
            <app-kilometros-panel [aps]="aps()" [anno]="anno()" [mes]="mes()" />
          </p-tabpanel>
          <p-tabpanel value="consultas">
            @if (aps() && anno() && mes()) {
              <app-costos-consulta-panel [aps]="aps()!" [anno]="anno()!" [mes]="mes()!" />
            } @else {
              <p>Seleccioná APS, año y mes para ver las consultas.</p>
            }
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </p-card>
  `
})
export class CostosCalculoPageComponent {
  private readonly storageKey = 'costos-calculo-filtros';
  readonly aps = signal<number | null>(null);
  readonly mes = signal<number | null>(null);
  readonly anno = signal<number | null>(new Date().getFullYear());
  readonly currentStep = signal<'idle' | 'verified' | 'prechecked' | 'calculated' | 'certified'>('idle');

  readonly verificationResult = signal<ValidapreactualizaResponse | null>(null);
  readonly prechecksResult = signal<PrecheckUiItem[]>([]);
  readonly calculoResultado = signal<CalculartarifasResponse | null>(null);
  readonly certificacionResultado = signal<CertificarTarifasResponse | null>(null);

  readonly loadingVerify = signal(false);
  readonly loadingPrecheck = signal(false);
  readonly loadingExecute = signal(false);
  readonly loadingCert = signal(false);
  readonly globalLoading = computed(() => this.loadingVerify() || this.loadingPrecheck() || this.loadingExecute() || this.loadingCert());

  readonly isAps1031 = computed(() => this.aps() === 1031);
  readonly isPrecheckEnabled = computed(() => ['verified', 'prechecked', 'calculated', 'certified'].includes(this.currentStep()));
  readonly isExecutionEnabled = computed(() => ['prechecked', 'calculated', 'certified'].includes(this.currentStep()));
  readonly isCertEnabled = computed(() => ['calculated', 'certified'].includes(this.currentStep()));

  readonly pipelineSteps = signal<PipelineStepUi[]>(this.getInitialSteps());

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.restoreState();

    this.route.queryParamMap.subscribe((params) => {
      this.aps.set(this.readNumber(params.get('aps')) ?? this.aps());
      this.mes.set(this.readNumber(params.get('mes')) ?? this.mes());
      this.anno.set(this.readNumber(params.get('anno')) ?? this.anno());
    });

    effect(() => {
      const state = { aps: this.aps(), mes: this.mes(), anno: this.anno() };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { aps: state.aps ?? undefined, mes: state.mes ?? undefined, anno: state.anno ?? undefined },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });
  }

  setPanelLoading(panel: 'verify' | 'precheck' | 'execute' | 'cert', value: boolean): void {
    if (panel === 'verify') this.loadingVerify.set(value);
    if (panel === 'precheck') this.loadingPrecheck.set(value);
    if (panel === 'execute') this.loadingExecute.set(value);
    if (panel === 'cert') this.loadingCert.set(value);
  }

  onVerified(result: ValidapreactualizaResponse): void {
    this.verificationResult.set(result);
    this.prechecksResult.set([]);
    this.calculoResultado.set(null);
    this.certificacionResultado.set(null);
    this.currentStep.set(result.puedeCalcular ? 'verified' : 'idle');
    this.pipelineSteps.set(this.getInitialSteps());
  }

  onPrechecksCompleted(event: { allPassed: boolean; items: PrecheckUiItem[] }): void {
    this.prechecksResult.set(event.items);
    if (event.allPassed) this.currentStep.set('prechecked');
  }

  onCalculated(result: CalculartarifasResponse): void {
    this.calculoResultado.set(result);
    this.currentStep.set(result.exitoso ? 'calculated' : 'prechecked');
  }

  onCertified(result: CertificarTarifasResponse): void {
    this.certificacionResultado.set(result);
    if (result.certificado) this.currentStep.set('certified');
  }

  private restoreState(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { aps?: number; mes?: number; anno?: number };
      if (Number.isFinite(parsed.aps)) this.aps.set(Number(parsed.aps));
      if (Number.isFinite(parsed.mes)) this.mes.set(Number(parsed.mes));
      if (Number.isFinite(parsed.anno)) this.anno.set(Number(parsed.anno));
    } catch {
      // ignore invalid localStorage state
    }
  }

  private readNumber(value: string | null): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getInitialSteps(): PipelineStepUi[] {
    return [
      { step: 1, label: 'Inicializar', estado: 'pendiente' },
      { step: 2, label: 'Limpiar datos', estado: 'pendiente' },
      { step: 3, label: 'Calcular base', estado: 'pendiente' },
      { step: 4, label: 'Aplicar ajustes', estado: 'pendiente' },
      { step: 5, label: 'Generar resumen', estado: 'pendiente' },
      { step: 6, label: 'Finalizar', estado: 'pendiente' }
    ];
  }
}
