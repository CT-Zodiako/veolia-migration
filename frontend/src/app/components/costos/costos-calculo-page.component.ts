import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { VerificacionDialogComponent } from './verificacion-dialog.component';
import { CuadriculaCostoComponent } from './cuadricula-costo.component';
import { ResumenTarifasComponent } from './resumen-tarifas.component';
import { ResumenVariablesComponent } from './resumen-variables.component';
import { CostoItem, VerificacionDetalle } from '../../models/costos.models';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { CostosService } from '../../services/costos.service';
import { ValidacionesService } from '../../services/validaciones.service';
import { SuministrosService } from '../../services/suministros.service';
import { NotificationService } from '../../services/notification.service';
import { TarifaRow, TarifasService } from '../../services/tarifas.service';

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
    VerificacionDialogComponent,
    CuadriculaCostoComponent,
    ResumenTarifasComponent,
    ResumenVariablesComponent
  ],
  template: `
    <div class="card-section">
      <div class="grid">
        <div class="col-12 md:col-4">
          <app-aps-selector [selectedAps]="aps()" (selectedApsChange)="aps.set($event)" />
        </div>
        <div class="col-12 md:col-4">
          <app-anno-selector [selectedAnno]="anno()" (selectedAnnoChange)="anno.set($event)" />
        </div>
        <div class="col-12 md:col-4">
          <app-mes-selector [selectedMes]="mes()" (selectedMesChange)="mes.set($event)" />
        </div>
      </div>
    </div>

    <p-card>
      <div class="flex align-items-center justify-content-end mb-2 flex-wrap gap-2">
        <p-message *ngIf="globalLoading()" severity="info" text="Procesando solicitud..." />
      </div>

      <app-cuadricula-costo *ngIf="costos().length" [costos]="costos()" class="block mb-3" />

      <p-divider />

      <div class="grid">
        <div class="col-12">
          <div class="flex align-items-center gap-2 mb-3">
            <p-button
              label="VERIFICAR"
              icon="pi pi-check"
              severity="warn"
              [loading]="loadingVerificar()"
              [disabled]="!aps() || !periodoConsulta() || loadingVerificar()"
              (click)="verificar()"
            ></p-button>
            <p-button
              label="CERTIFICAR"
              icon="pi pi-check"
              [loading]="loadingCertificar()"
              [disabled]="!aps() || !periodoConsulta() || certificarDisabled() || loadingCertificar()"
              (click)="certificar()"
            ></p-button>
          </div>
        </div>

        <div class="col-12">
          <app-resumen-variables
            [aps]="aps()"
            [mes]="periodoConsulta()?.mes ?? null"
            [anno]="periodoConsulta()?.anno ?? null"
            (semestreTituloChange)="semestreTitulo.set($event)"
          />
        </div>

        <div class="col-12" *ngIf="!semestreTitulo() && resumen().length">
          <p-divider />
          <app-resumen-tarifas [resumen]="resumen()" />
        </div>
      </div>

      <app-verificacion-dialog
        [visible]="verificacionVisible()"
        (visibleChange)="verificacionVisible.set($event)"
        [detalle]="verificacionDetalle()"
        [applying]="applyingVerificacion()"
        (aplicar)="aplicar()"
      />
    </p-card>
  `,
  styles: [`
    .card-section {
      background: var(--color-bg-card);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
  `]
})
export class CostosCalculoPageComponent {
  private readonly storageKey = 'costos-calculo-filtros';
  readonly aps = signal<number | null>(null);
  readonly mes = signal<number | null>(null);
  readonly anno = signal<number | null>(new Date().getFullYear());

  // Regla de negocio legacy (Calculo.vue): el año/mes que se selecciona en
  // pantalla es el "mes actual", pero todo el pipeline (verificar, calcular,
  // certificar, consultas) opera sobre el mes YA CERRADO -- el anterior.
  readonly periodoConsulta = computed(() => {
    const anno = this.anno();
    const mes = this.mes();
    return anno && mes ? periodoAnterior(anno, mes) : null;
  });

  readonly verificacionVisible = signal(false);
  readonly verificacionDetalle = signal<VerificacionDetalle[]>([]);
  readonly costos = signal<CostoItem[]>([]);
  readonly resumen = signal<TarifaRow[]>([]);
  readonly semestreTitulo = signal('');

  readonly loadingVerificar = signal(false);
  readonly applyingVerificacion = signal(false);
  readonly loadingCertificar = signal(false);
  // Legacy: CERTIFICAR queda habilitado solo cuando existarifacert == 0
  // (hay tarifa calculada pero aún no certificada para el período).
  readonly certificarDisabled = signal(true);
  readonly globalLoading = computed(() => this.loadingVerificar() || this.applyingVerificacion() || this.loadingCertificar());

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly costosService: CostosService,
    private readonly validacionesService: ValidacionesService,
    private readonly suministrosService: SuministrosService,
    private readonly tarifasService: TarifasService,
    private readonly notification: NotificationService
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

    effect(() => {
      const aps = this.aps();
      const periodo = this.periodoConsulta();
      if (!aps || !periodo) {
        this.costos.set([]);
        this.resumen.set([]);
        this.certificarDisabled.set(true);
        return;
      }
      this.costosService.consultarCostos(aps, periodo.mes, periodo.anno).subscribe({
        next: (data) => this.costos.set(data || []),
        error: () => this.costos.set([])
      });
      this.tarifasService.getResumen(aps, periodo.anno, periodo.mes).subscribe({
        next: (data) => this.resumen.set(data || []),
        error: () => this.resumen.set([])
      });
      this.refreshCertificarEnabled();
    });
  }

  verificar(): void {
    const aps = this.aps();
    const periodo = this.periodoConsulta();
    if (!aps || !periodo || this.loadingVerificar()) return;

    this.loadingVerificar.set(true);
    this.costosService
      .validapreactualiza(aps, periodo.mes, periodo.anno, this.getUsuarioId())
      .pipe(finalize(() => this.loadingVerificar.set(false)))
      .subscribe({
        next: (resp) => {
          this.verificacionDetalle.set(resp.detalle ?? []);
          this.verificacionVisible.set(true);
        },
        error: (err: Error) => this.notification.error(err.message)
      });
  }

  // Legacy Calculo.vue "CalcularTarifas": existarifa -> prechecks -> calculartarifas.
  //
  // Bug fix: este precheck debe usar el mismo endpoint que Calculo.vue (legacy)
  // usaba para "existarifa": `Validaciones.js#fauco_existarifa()` -> POST
  // `suministros/cenrtificarEditar` -> `PK_VALGRAL.fauco_existarifa` (retorna
  // literal "0" cuando NO hay tarifa calculada, o un mensaje de error cuando sí
  // la hay -- ver backend/.../Database/Validaciones/PK_VALGRAL.sql).
  //
  // Antes llamaba a `validacionesService.faucoExistarifa()`, que pega contra
  // `validaciones/certificarfauco_existarifa`. Ese endpoint está correctamente
  // cableado AS-IS a `PK_VALGRAL.fauco_generasui` (una función distinta, con
  // semántica invertida: "1" = existen datos, usada también por SUI en
  // SuiRepository.cs) -- así se llama en el legacy real
  // (back-tarificador/src/modules/validaciones/controller.js) y así lo
  // documenta `doc migracion/modules/validaciones/funcionalidades/validaciones-core.md`.
  // No se debe tocar ese endpoint: el bug estaba en que esta pantalla
  // (Cálculo de Tarifas) consumía el endpoint equivocado, no en que el
  // endpoint mismo estuviera mal armado.
  aplicar(): void {
    const aps = this.aps();
    const periodo = this.periodoConsulta();
    if (!aps || !periodo || this.applyingVerificacion()) return;

    this.applyingVerificacion.set(true);
    this.suministrosService.cenrtificarEditar(aps, periodo.anno, periodo.mes).subscribe({
      next: (resp) => {
        const yaExisteTarifa = (resp?.data ?? '0').toString().trim() !== '0';
        if (yaExisteTarifa) {
          this.notification.warn('Ya existen tarifas calculadas para el APS y Periodo Seleccionado');
          this.applyingVerificacion.set(false);
          this.verificacionVisible.set(false);
          return;
        }
        this.runPrechecksThenCalculate(aps, periodo.mes, periodo.anno);
      },
      error: () => {
        this.applyingVerificacion.set(false);
        this.notification.error('No fue posible validar la existencia de tarifas calculadas.');
      }
    });
  }

  certificar(): void {
    const aps = this.aps();
    const periodo = this.periodoConsulta();
    if (!aps || !periodo || this.certificarDisabled() || this.loadingCertificar()) return;

    this.loadingCertificar.set(true);
    this.costosService
      .certificarTarifas(aps, periodo.mes, periodo.anno, this.getUsuarioId())
      .pipe(finalize(() => this.loadingCertificar.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Certificado');
          this.refreshCostos();
          this.refreshCertificarEnabled();
        },
        error: (err: Error) => this.notification.error(err.message)
      });
  }

  private runPrechecksThenCalculate(aps: number, mes: number, anno: number): void {
    const usuario = this.getUsuarioId();
    this.costosService.runPrechecks(aps, mes, anno, usuario).subscribe({
      next: (prechecks) => {
        if (!prechecks.puedeCalcular) {
          // Legacy: un toast de error por cada precheck fallido y no calcula.
          prechecks.prechecks
            .filter((p) => (p.estado || '').toLowerCase() === 'error')
            .forEach((p) => this.notification.error(p.mensaje || p.nombre));
          this.applyingVerificacion.set(false);
          this.verificacionVisible.set(false);
          return;
        }
        this.costosService
          .calculartarifas(aps, mes, anno, usuario)
          .pipe(finalize(() => this.applyingVerificacion.set(false)))
          .subscribe({
            next: (resp) => {
              if (!resp.exitoso) {
                this.notification.warn('Ya existen tarifas calculadas para el APS y Periodo Seleccionado');
                this.verificacionVisible.set(false);
                return;
              }
              this.notification.success('Tarifas Calculadas');
              this.verificacionVisible.set(false);
              this.refreshCostos();
              this.refreshCertificarEnabled();
            },
            error: (err: Error) => this.notification.error(err.message)
          });
      },
      error: (err: Error) => {
        this.applyingVerificacion.set(false);
        this.notification.error(err.message);
      }
    });
  }

  private refreshCertificarEnabled(): void {
    const aps = this.aps();
    const periodo = this.periodoConsulta();
    if (!aps || !periodo) {
      this.certificarDisabled.set(true);
      return;
    }
    this.validacionesService.faucoExistarifacert({ aps, anno: periodo.anno, mes: periodo.mes }).subscribe({
      next: (resp) => this.certificarDisabled.set(!resp.ok),
      error: () => this.certificarDisabled.set(true)
    });
  }

  private refreshCostos(): void {
    const aps = this.aps();
    const periodo = this.periodoConsulta();
    if (!aps || !periodo) return;
    this.costosService.consultarCostos(aps, periodo.mes, periodo.anno).subscribe({
      next: (data) => this.costos.set(data || []),
      error: () => {}
    });
    this.tarifasService.getResumen(aps, periodo.anno, periodo.mes).subscribe({
      next: (data) => this.resumen.set(data || []),
      error: () => {}
    });
  }

  private getUsuarioId(): number {
    try {
      const raw = localStorage.getItem('usuario');
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Number(parsed?.SISU_ID ?? 0);
    } catch {
      return 0;
    }
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
}
