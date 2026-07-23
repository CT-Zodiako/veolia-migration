import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { ComplementoDialogComponent } from './complemento-dialog.component';
import { FormatoTableComponent } from './formato-table.component';
import { SuiApplicability, SuiComplementoItemRequest, SuiFormato, SuiPrecheckResponse } from '../../models/sui-integracion.models';
import { SuiIntegracionService } from '../../services/sui-integracion.service';
import { ApsService } from '../../services/aps.service';

@Component({
  selector: 'app-sui-integracion-page',
  standalone: true,
  imports: [CommonModule, MessageModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, FormatoTableComponent, ComplementoDialogComponent],
  template: `
    <p-card>
      <h3>SUI Integración</h3>
      <div class="grid">
        <div class="col-12 md:col-4"><app-aps-selector [selectedAps]="aps()" (selectedApsChange)="aps.set($event)" /></div>
        <div class="col-12 md:col-4"><app-anno-selector [selectedAnno]="anno()" (selectedAnnoChange)="anno.set($event)" /></div>
        <div class="col-12 md:col-4"><app-mes-selector [selectedMes]="mes()" (selectedMesChange)="mes.set($event)" /></div>
      </div>

      <div class="flex gap-2 mb-2">
        <button pButton label="Consultar" (click)="consultar()" [disabled]="loading() || !filtrosValidos()"></button>
        <button pButton label="Prevalidar" severity="secondary" (click)="prevalidar()" [disabled]="loading() || !filtrosValidos()"></button>
        <button pButton label="Procesar" severity="success" (click)="procesar()" [disabled]="loading() || !puedeProcesar() || !filtrosValidos()"></button>
        <button pButton label="Complemento" severity="contrast" (click)="openComplemento()" [disabled]="!canEditComplemento()"></button>
      </div>

      <p-message *ngIf="estado()" severity="info" [text]="estado()"></p-message>
      <p-message *ngIf="error()" severity="error" [text]="error()"></p-message>

      <p-tabs [value]="currentTab()" (valueChange)="onTabChange($event)">
        <p-tablist>
          <p-tab value="F19" [disabled]="!isTabVisible('F19')">
            <span class="tab-label">F19 <small [class.no-aplica]="getApplicability('F19') === 'NO APLICA'">{{ getApplicability('F19') }}</small></span>
          </p-tab>
          <p-tab value="F23" [disabled]="!isTabVisible('F23')">
            <span class="tab-label">F23 <small [class.no-aplica]="getApplicability('F23') === 'NO APLICA'">{{ getApplicability('F23') }}</small></span>
          </p-tab>
          <p-tab value="F24" [disabled]="!isTabVisible('F24')">
            <span class="tab-label">F24 <small [class.no-aplica]="getApplicability('F24') === 'NO APLICA'">{{ getApplicability('F24') }}</small></span>
          </p-tab>
          <p-tab value="F35" [disabled]="!isTabVisible('F35')">
            <span class="tab-label">F35 <small [class.no-aplica]="getApplicability('F35') === 'NO APLICA'">{{ getApplicability('F35') }}</small></span>
          </p-tab>
          <p-tab value="F36" [disabled]="!isTabVisible('F36')">
            <span class="tab-label">F36 <small [class.no-aplica]="getApplicability('F36') === 'NO APLICA'">{{ getApplicability('F36') }}</small></span>
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="F19"><app-sui-formato-table [rows]="formatoData()['F19'] || []" /></p-tabpanel>
          <p-tabpanel value="F23"><app-sui-formato-table [rows]="formatoData()['F23'] || []" /></p-tabpanel>
          <p-tabpanel value="F24"><app-sui-formato-table [rows]="formatoData()['F24'] || []" /></p-tabpanel>
          <p-tabpanel value="F35"><app-sui-formato-table [rows]="formatoData()['F35'] || []" /></p-tabpanel>
          <p-tabpanel value="F36"><app-sui-formato-table [rows]="formatoData()['F36'] || []" /></p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <app-sui-complemento-dialog
        [visible]="showComplemento()"
        [formato]="currentTab()"
        [items]="complementoItems()"
        (close)="showComplemento.set(false)"
        (save)="guardarComplemento($event)"
      />
    </p-card>
  `,
  styles: [`
    .tab-label { display: inline-flex; align-items: center; gap: .4rem; }
    .tab-label small {
      font-size: .68rem;
      border-radius: 12px;
      padding: .12rem .45rem;
      font-weight: 700;
      color: var(--color-text-success);
      background: var(--color-bg-success-soft);
      border: 1px solid var(--color-border-success-soft);
    }
    .tab-label small.no-aplica {
      color: var(--color-brand-accent);
      background: var(--color-bg-danger-soft-alt);
      border-color: var(--color-border-danger-soft);
    }
  `]
})
export class SuiIntegracionPageComponent {
  readonly aps = signal<number | null>(null);
  readonly mes = signal<number | null>(null);
  readonly anno = signal<number | null>(new Date().getFullYear());
  readonly currentTab = signal<SuiFormato>('F19');
  readonly formatoData = signal<Record<SuiFormato, Array<Record<string, unknown>>>>({ F19: [], F23: [], F24: [], F35: [], F36: [] });
  readonly estado = signal('');
  readonly error = signal('');
  readonly loading = signal(false);
  readonly puedeProcesar = signal(false);
  readonly showComplemento = signal(false);
  readonly complementoItems = signal<SuiComplementoItemRequest[]>([]);
  readonly apsaSoloRell = signal<number | null>(null);
  readonly apsaPropio = signal<number | null>(null);
  readonly applicability = signal<Record<SuiFormato, SuiApplicability>>({
    F19: 'DESCONOCIDO',
    F23: 'DESCONOCIDO',
    F24: 'DESCONOCIDO',
    F35: 'DESCONOCIDO',
    F36: 'DESCONOCIDO'
  });
  readonly filtrosValidos = computed(() => !!this.aps() && !!this.mes() && !!this.anno());

  constructor(
    private readonly service: SuiIntegracionService,
    private readonly apsService: ApsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.restore();
    this.route.queryParamMap.subscribe((params) => {
      const tab = (params.get('tab') as SuiFormato) || this.currentTab();
      this.currentTab.set(['F19', 'F23', 'F24', 'F35', 'F36'].includes(tab) ? tab : 'F19');
      this.aps.set(this.readNumber(params.get('aps')) ?? this.aps());
      this.mes.set(this.readNumber(params.get('mes')) ?? this.mes());
      this.anno.set(this.readNumber(params.get('anno')) ?? this.anno());
    });
    effect(() => {
      const state = { aps: this.aps(), mes: this.mes(), anno: this.anno(), tab: this.currentTab() };
      localStorage.setItem('sui-integracion-state', JSON.stringify(state));
      this.router.navigate([], { relativeTo: this.route, queryParams: state, queryParamsHandling: 'merge', replaceUrl: true });
    });
  }

  consultar(): void {
    if (!this.filtrosValidos()) return;
    this.loading.set(true);
    this.error.set('');
    const payload = { aps: this.aps()!, mes: this.mes()!, anno: this.anno()! };
    this.loadApsApplicability(payload.aps);
    forkJoin({
      F19: this.service.consuformu19(payload),
      F23: this.service.consuformu23(payload),
      F24: this.service.consuforma24(payload),
      F35: this.service.consuforma35(payload),
      F36: this.service.consuforma36(payload)
    }).subscribe({
      next: (resp) => {
        this.formatoData.set({ F19: resp.F19.filas || [], F23: resp.F23.filas || [], F24: resp.F24.filas || [], F35: resp.F35.filas || [], F36: resp.F36.filas || [] });
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'Error consultando formatos');
        this.loading.set(false);
      }
    });
  }

  prevalidar(): void {
    if (!this.filtrosValidos()) return;
    this.loading.set(true);
    this.service.getcanCertificate({ aps: this.aps()!, mes: this.mes()!, anno: this.anno()! }).subscribe({
      next: (res: SuiPrecheckResponse) => {
        this.puedeProcesar.set(res.puedeProcesar);
        this.estado.set(res.mensajes.join(' | ') || 'Prevalidación sin observaciones');
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'Error de prevalidación');
        this.loading.set(false);
      }
    });
  }

  procesar(): void {
    if (!this.filtrosValidos()) return;
    const usuario = Number(JSON.parse(localStorage.getItem('usuario') || '{}')?.SISU_ID || 0);
    this.loading.set(true);
    this.service.procesar({ aps: this.aps()!, mes: this.mes()!, anno: this.anno()!, usuario }).subscribe({
      next: (res) => {
        this.estado.set(`Estado: ${res.estado}. Formatos: ${res.formatosProcesados.join(', ')}`);
        this.loading.set(false);
        this.consultar();
      },
      error: (e) => {
        this.error.set(e?.message || 'Error en Procesar');
        this.loading.set(false);
      }
    });
  }

  onTabChange(value: string | number | undefined): void { this.currentTab.set(String(value ?? 'F19') as SuiFormato); }
  openComplemento(): void { this.showComplemento.set(true); }
  canEditComplemento(): boolean { return ['F24', 'F35', 'F36'].includes(this.currentTab()) && this.isTabVisible(this.currentTab()); }
  isTabVisible(tab: SuiFormato): boolean { return this.getApplicability(tab) !== 'NO APLICA'; }
  getApplicability(tab: SuiFormato): SuiApplicability { return this.applicability()[tab] ?? 'DESCONOCIDO'; }

  guardarComplemento(items: SuiComplementoItemRequest[]): void {
    if (!this.canEditComplemento() || !this.filtrosValidos()) return;
    this.loading.set(true);
    this.service.setCargueInfComplemento({ aps: this.aps()!, mes: this.mes()!, anno: this.anno()!, formato: this.currentTab() as 'F24'|'F35'|'F36', complementoData: items }).subscribe({
      next: (res) => {
        this.estado.set(`Complemento guardado: ${res.filasAfectadas} filas afectadas.`);
        this.showComplemento.set(false);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'No fue posible guardar complemento');
        this.loading.set(false);
      }
    });
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem('sui-integracion-state');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { aps?: number; mes?: number; anno?: number; tab?: SuiFormato };
      if (Number.isFinite(parsed.aps)) this.aps.set(Number(parsed.aps));
      if (Number.isFinite(parsed.mes)) this.mes.set(Number(parsed.mes));
      if (Number.isFinite(parsed.anno)) this.anno.set(Number(parsed.anno));
      if (parsed.tab) this.currentTab.set(parsed.tab);
    } catch { /* ignore */ }
  }

  private readNumber(value: string | null): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private loadApsApplicability(aps: number): void {
    this.apsService.consultaAps(aps).subscribe({
      next: (items) => {
        const apsInfo = items?.[0];
        const soloRell = Number(apsInfo?.APSA_SOLORELL ?? 0);
        const propio = Number(apsInfo?.APSA_PROPIO ?? 0);

        this.apsaSoloRell.set(Number.isFinite(soloRell) ? soloRell : 0);
        this.apsaPropio.set(Number.isFinite(propio) ? propio : 0);
        this.applicability.set(this.resolveApplicability(this.apsaSoloRell() ?? 0, this.apsaPropio() ?? 0));
        this.ensureCurrentTabIsApplicable();
      },
      error: () => {
        this.apsaSoloRell.set(null);
        this.apsaPropio.set(null);
        this.applicability.set({ F19: 'DESCONOCIDO', F23: 'DESCONOCIDO', F24: 'DESCONOCIDO', F35: 'DESCONOCIDO', F36: 'DESCONOCIDO' });
      }
    });
  }

  private resolveApplicability(apsaSoloRell: number, apsaPropio: number): Record<SuiFormato, SuiApplicability> {
    const base = apsaSoloRell === 1 ? 'NO APLICA' : 'APLICA';
    const rellenoAplica = apsaSoloRell === 1 || apsaPropio === 1;
    return {
      F19: base,
      F23: base,
      F24: base,
      F35: rellenoAplica ? 'APLICA' : 'NO APLICA',
      F36: rellenoAplica ? 'APLICA' : 'NO APLICA'
    };
  }

  private ensureCurrentTabIsApplicable(): void {
    if (this.isTabVisible(this.currentTab())) return;
    const fallback = (['F19', 'F23', 'F24', 'F35', 'F36'] as SuiFormato[]).find((tab) => this.isTabVisible(tab));
    this.currentTab.set(fallback ?? 'F19');
  }
}
