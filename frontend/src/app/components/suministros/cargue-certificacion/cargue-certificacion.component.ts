import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { CargueComercialComponent } from './cargue-comercial/cargue-comercial.component';
import { CargueComercialSemComponent } from './cargue-comercial-sem/cargue-comercial-sem.component';
import { InfoPropiaComponent } from './info-propia/info-propia.component';
import { InfoCompetidorComponent } from './info-competidor/info-competidor.component';
import { TercerosQrtComponent } from './terceros-qrt/terceros-qrt.component';
import { ProductividadComponent } from './productividad/productividad.component';
import { PrevalidacionComponent } from './prevalidacion/prevalidacion.component';
import { CertificacionComponent } from './certificacion/certificacion.component';
import { FiltrosCertificacion } from '../../../models/fase1-certificacion.models';

@Component({
  selector: 'app-cargue-certificacion',
  standalone: true,
  imports: [
    CommonModule,
    ...CommonPrimeNgModules,
    CargueComercialComponent,
    CargueComercialSemComponent,
    InfoPropiaComponent,
    InfoCompetidorComponent,
    TercerosQrtComponent,
    ProductividadComponent,
    PrevalidacionComponent,
    CertificacionComponent
  ],
  template: `
    <p-card>
      <h3 class="m-0 mb-3">Fase 1 · Cargue y Certificación</h3>
      <p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)">
        <p-tablist>
          <p-tab value="0">Parámetros</p-tab>
          <p-tab value="1" [disabled]="!canNuevoCargue()">Nuevo Cargue</p-tab>
          <p-tab value="2" [disabled]="!canCargaArchivo()">Carga Archivo</p-tab>
          <p-tab value="3" [disabled]="!canPrevalidacion()">Prevalidación</p-tab>
          <p-tab value="4" [disabled]="!canResumen()">Resumen</p-tab>
          <p-tab value="5" [disabled]="!canValidacionReglas()">Validación Reglas</p-tab>
          <p-tab value="6" [disabled]="!canEjecucion()">Ejecución</p-tab>
          <p-tab value="7" [disabled]="!canResultados()">Resultados</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0"><app-cargue-comercial [filtros]="filtrosSignal()" (filtrosChange)="filtrosSignal.set($event)" /></p-tabpanel>
          <p-tabpanel value="1"><app-cargue-comercial-sem [filtros]="filtrosSignal()" [cargueActual]="cargueActualSignal()" (cargueChange)="onCargueCreated($event)" /></p-tabpanel>
          <p-tabpanel value="2"><app-info-propia [cargueActual]="cargueActualSignal()" [filtros]="filtrosSignal()" (archivoChange)="archivoSignal.set($event)" /></p-tabpanel>
          <p-tabpanel value="3"><app-prevalidacion [cargueActual]="cargueActualSignal()" [archivo]="archivoSignal()" /></p-tabpanel>
          <p-tabpanel value="4"><app-info-competidor [cargueActual]="cargueActualSignal()" /></p-tabpanel>
          <p-tabpanel value="5"><app-productividad [cargueActual]="cargueActualSignal()" (validacionChange)="validacionSignal.set($event)" /></p-tabpanel>
          <p-tabpanel value="6"><app-terceros-qrt [cargueActual]="cargueActualSignal()" [validacion]="validacionSignal()" (ejecucionChange)="ejecucionSignal.set($event)" /></p-tabpanel>
          <p-tabpanel value="7"><app-certificacion [cargueActual]="cargueActualSignal()" [ejecucion]="ejecucionSignal()" /></p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </p-card>
  `
})
export class CargueCertificacionComponent {
  readonly activeTab = signal('0');
  readonly filtrosSignal = signal<FiltrosCertificacion>({ vigencia: new Date().getFullYear(), departamentoId: null, municipioId: null, prestadorId: null, tipoCargueId: null });
  readonly cargueActualSignal = signal<{ cargueId: number; estado: string } | null>(null);
  readonly archivoSignal = signal<{ archivoId: number; filasLeidas: number; filasInvalidas: number } | null>(null);
  readonly validacionSignal = signal<{ validacionId: number; estado: string } | null>(null);
  readonly ejecucionSignal = signal<{ ejecucionId: number; estado: string } | null>(null);

  readonly canNuevoCargue = computed(() => !!this.filtrosSignal().vigencia);
  readonly canCargaArchivo = computed(() => !!this.cargueActualSignal()?.cargueId);
  readonly canPrevalidacion = computed(() => !!this.archivoSignal()?.archivoId);
  readonly canResumen = computed(() => !!this.cargueActualSignal()?.cargueId);
  readonly canValidacionReglas = computed(() => !!this.cargueActualSignal()?.cargueId);
  readonly canEjecucion = computed(() => ['finalizado', 'completado'].includes((this.validacionSignal()?.estado || '').toLowerCase()));
  readonly canResultados = computed(() => ['finalizado', 'completado'].includes((this.ejecucionSignal()?.estado || '').toLowerCase()));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab') ?? '0';
      this.activeTab.set(this.sanitizeTab(tab));
      const cargueId = this.readNumber(params.get('cargueId'));
      if (cargueId) {
        this.cargueActualSignal.set({ cargueId, estado: 'CREADO' });
      }
    });

    effect(() => {
      const cargue = this.cargueActualSignal();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: this.activeTab(), cargueId: cargue?.cargueId ?? undefined },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });
  }

  onTabChange(value: string | number | undefined): void {
    const tab = this.sanitizeTab(String(value ?? '0'));
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private sanitizeTab(value: string): string {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 7) {
      return '0';
    }
    return String(parsed);
  }

  private readNumber(value: string | null): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  onCargueCreated(cargue: { cargueId: number; estado: string } | null): void {
    this.cargueActualSignal.set(cargue);
    this.archivoSignal.set(null);
    this.validacionSignal.set(null);
    this.ejecucionSignal.set(null);
  }
}
