import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { FacturacionService } from '../../services/facturacion.service';
import { FacturacionRequest, FacturacionResponse } from '../../models/facturacion.models';
import { FacturacionTableComponent } from './facturacion-table.component';

type FacturacionTab = 'facturacion' | 'detafacturacion' | 'facturacionclus' | 'facturaciondinc' | 'facturacionelectronica';

@Component({
  selector: 'app-facturacion-page',
  standalone: true,
  imports: [CommonModule, MessageModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, FacturacionTableComponent],
  template: `
    <p-card>
      <h3>Fase 4 · Facturación</h3>
      <div class="grid">
        <div class="col-12 md:col-4"><app-aps-selector [selectedAps]="aps()" (selectedApsChange)="aps.set($event)" /></div>
        <div class="col-12 md:col-4"><app-anno-selector [selectedAnno]="anno()" (selectedAnnoChange)="anno.set($event)" /></div>
        <div class="col-12 md:col-4"><app-mes-selector [selectedMes]="mes()" (selectedMesChange)="mes.set($event)" /></div>
      </div>

      <div class="flex gap-2 mb-2">
        <button pButton label="Consultar" (click)="consultar()" [disabled]="loading() || !filtrosValidos()"></button>
      </div>

      <p-message *ngIf="loading()" severity="info" text="Consultando facturación..." />
      <p-message *ngIf="periodoInfo()" severity="warn" [text]="periodoInfo()" />
      <p-message *ngIf="error()" severity="error" [text]="error()" />

      <p-tabs [value]="currentTab()" (valueChange)="onTabChange($event)">
        <p-tablist>
          <p-tab value="facturacion">Facturación</p-tab>
          <p-tab value="detafacturacion">Detalle Facturación</p-tab>
          <p-tab value="facturacionclus">Facturación Clus</p-tab>
          <p-tab value="facturaciondinc">Facturación Dinc</p-tab>
          <p-tab value="facturacionelectronica">Factura Electrónica</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="facturacion"><app-facturacion-table [rows]="resultados().facturacion?.filas || []" /></p-tabpanel>
          <p-tabpanel value="detafacturacion"><app-facturacion-table [rows]="resultados().detafacturacion?.filas || []" /></p-tabpanel>
          <p-tabpanel value="facturacionclus"><app-facturacion-table [rows]="resultados().facturacionclus?.filas || []" /></p-tabpanel>
          <p-tabpanel value="facturaciondinc"><app-facturacion-table [rows]="resultados().facturaciondinc?.filas || []" /></p-tabpanel>
          <p-tabpanel value="facturacionelectronica"><app-facturacion-table [rows]="resultados().facturacionelectronica?.filas || []" /></p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </p-card>
  `
})
export class FacturacionPageComponent {
  readonly aps = signal<number | null>(null);
  readonly mes = signal<number | null>(null);
  readonly anno = signal<number | null>(new Date().getFullYear());
  readonly currentTab = signal<FacturacionTab>('facturacion');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly resultados = signal<Partial<Record<FacturacionTab, FacturacionResponse>>>({});
  readonly filtrosValidos = computed(() => !!this.aps() && !!this.mes() && !!this.anno());
  readonly periodoInfo = computed(() => {
    const selected = this.resultados()[this.currentTab()];
    const p = selected?.periodo;
    if (!p) return '';
    return `Mostrando período anterior: ${p.mesConsultado}/${p.annoConsultado} (seleccionado: ${p.mes}/${p.anno}).`;
  });

  constructor(
    private readonly service: FacturacionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.restore();
    this.route.queryParamMap.subscribe((params) => {
      const tab = (params.get('tab') as FacturacionTab) || this.currentTab();
      this.currentTab.set(['facturacion', 'detafacturacion', 'facturacionclus', 'facturaciondinc', 'facturacionelectronica'].includes(tab) ? tab : 'facturacion');
      this.aps.set(this.readNumber(params.get('aps')) ?? this.aps());
      this.mes.set(this.readNumber(params.get('mes')) ?? this.mes());
      this.anno.set(this.readNumber(params.get('anno')) ?? this.anno());
    });
    effect(() => {
      const state = { aps: this.aps(), mes: this.mes(), anno: this.anno(), tab: this.currentTab() };
      localStorage.setItem('facturacion-state', JSON.stringify(state));
      this.router.navigate([], { relativeTo: this.route, queryParams: state, queryParamsHandling: 'merge', replaceUrl: true });
    });
  }

  consultar(): void {
    if (!this.filtrosValidos()) return;
    this.loading.set(true);
    this.error.set('');
    const payload: FacturacionRequest = { aps: this.aps()!, mes: this.mes()!, anno: this.anno()! };

    forkJoin({
      facturacion: this.service.facturacion(payload),
      detafacturacion: this.service.detafacturacion(payload),
      facturacionclus: this.service.facturacionclus(payload),
      facturaciondinc: this.service.facturaciondinc(payload),
      facturacionelectronica: this.service.facturacionelectronica(payload)
    }).subscribe({
      next: (resp) => {
        this.resultados.set(resp);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'Error consultando facturación.');
        this.loading.set(false);
      }
    });
  }

  onTabChange(value: string | number | undefined): void {
    this.currentTab.set(String(value ?? 'facturacion') as FacturacionTab);
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem('facturacion-state');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { aps?: number; mes?: number; anno?: number; tab?: FacturacionTab };
      if (Number.isFinite(parsed.aps)) this.aps.set(Number(parsed.aps));
      if (Number.isFinite(parsed.mes)) this.mes.set(Number(parsed.mes));
      if (Number.isFinite(parsed.anno)) this.anno.set(Number(parsed.anno));
      if (parsed.tab) this.currentTab.set(parsed.tab);
    } catch {
      // ignore
    }
  }

  private readNumber(value: string | null): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
