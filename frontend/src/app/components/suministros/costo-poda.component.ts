import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { EMPTY, forkJoin, Subject } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SuministrosService, PodaItem, PodaEmpresa } from '../../services/suministros.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { periodoInicial } from '../shared/periodo-inicial.util';

interface ModalItem {
  EMPR_EMPR: number;
  EMPR_NOMBRE: string;
  valor: number | null;
}

const FORMATO_PESOS = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

@Component({
  selector: 'app-costo-poda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...CommonPrimeNgModules,
    ToastModule,
    DialogModule,
    ApsSelectorComponent,
    AnnoSelectorComponent,
    MesSelectorComponent
  ],
  providers: [MessageService],
  templateUrl: './costo-poda.component.html',
  styleUrls: ['./costo-poda.component.css']
})
export class CostoPodaComponent {
  aps = signal<number | null>(null);
  private readonly periodo = periodoInicial(inject(ParametrosConsultaStateService));
  anno = signal<number | null>(this.periodo.anno);
  mes = signal<number | null>(this.periodo.mes);

  loading = signal(false);
  items = signal<PodaItem[]>([]);
  bloqueado = signal<string | null>(null);

  editingEmprEmpr = signal<number | null>(null);
  editingValor = signal<number | null>(null);

  modalVisible = signal(false);
  modalItems = signal<ModalItem[]>([]);
  modalGuardando = signal(false);

  private readonly destroyRef = inject(DestroyRef);
  private readonly consultarTrigger$ = new Subject<void>();

  constructor(
    private readonly service: SuministrosService,
    private readonly messages: MessageService,
    private readonly confirmation: ConfirmationService
  ) {
    // switchMap cancela la consulta anterior si todavía está en vuelo cuando el
    // usuario cambia de selector de nuevo -- evita que una respuesta vieja pise
    // el resultado del período correcto.
    this.consultarTrigger$
      .pipe(
        switchMap(() => {
          const aps = this.aps();
          const anno = this.anno();
          const mes = this.mes();
          if (!aps || !anno || !mes) return EMPTY;

          this.loading.set(true);
          this.editingEmprEmpr.set(null);
          const periodo = periodoAnterior(anno, mes);
          return forkJoin({
            poda: this.service.getPoda(aps, periodo.anno, periodo.mes),
            bloqueo: this.service.cenrtificarEditar(aps, periodo.anno, periodo.mes)
          }).pipe(
            catchError((err: any) => {
              this.loading.set(false);
              this.messages.add({ severity: 'error', summary: 'Costo de Poda', detail: err?.error?.message || 'Error al consultar.' });
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ poda, bloqueo }) => {
        this.loading.set(false);
        this.items.set(poda.data || []);
        const estado = bloqueo.data;
        const estaBloqueado = !!estado && estado !== '0';
        this.bloqueado.set(estaBloqueado ? estado : null);
        if (estaBloqueado) {
          this.messages.add({ severity: 'warn', summary: 'Costo de Poda', detail: estado! });
        }
      });
  }

  // design/suministros-pantallas/13: both costs in Colombian pesos with 2 decimals (legacy showed the SUI value raw and
  // the facturación with es-MX thousands).
  formatoPesos(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    const numero = Number(valor);
    return Number.isFinite(numero) ? FORMATO_PESOS.format(numero) : String(valor);
  }

  readonly totales = computed(() => {
    const suma = (campo: 'CPTE_VALORSUI' | 'CPTE_VALORFACT') =>
      this.items().reduce((acc, item) => acc + (Number(item[campo]) || 0), 0);
    return { techo: suma('CPTE_VALORSUI'), facturacion: suma('CPTE_VALORFACT') };
  });

  // Legacy paginated 15 rows; the page only needs the paginator when there are more empresas than that.
  readonly paginar = computed(() => this.items().length > 15);

  readonly resumenPie = computed(() => {
    const items = this.items();
    if (!items.length) return '';
    const manuales = items.filter((item) => item.CPTE_TIPINGRESO === 1).length;
    const empresas = `${items.length} ${items.length === 1 ? 'empresa' : 'empresas'}`;
    if (manuales === 0) return `${empresas} · ${items.length === 1 ? 'con' : 'todas con'} ingreso automático`;
    if (manuales === items.length) return `${empresas} · ${items.length === 1 ? 'con' : 'todas con'} ingreso manual`;
    return `${empresas} · ${manuales} con ingreso manual`;
  });

  onApsChange(value: number | null): void {
    this.aps.set(value);
    this.consultar();
  }

  onAnnoChange(value: number | null): void {
    this.anno.set(value);
    this.consultar();
  }

  onMesChange(value: number | null): void {
    this.mes.set(value);
    this.consultar();
  }

  private consultar(): void {
    if (!this.aps() || !this.anno() || !this.mes()) return;
    this.consultarTrigger$.next();
  }

  iniciarEdicion(item: PodaItem): void {
    this.editingEmprEmpr.set(item.EMPR_EMPR);
    this.editingValor.set(item.CPTE_VALORSUI);
  }

  cancelarEdicion(): void {
    this.editingEmprEmpr.set(null);
  }

  confirmarGuardar(item: PodaItem): void {
    this.confirmation.confirm({
      header: 'Guardar costo techo SUI',
      message: `¿Confirmás guardar el nuevo valor para "${item.EMPR_NOMBRE}"?`,
      icon: 'pi pi-question-circle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.guardarEdicion(item)
    });
  }

  private guardarEdicion(item: PodaItem): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    const valor = this.editingValor();
    if (!aps || anno === null || mes === null || valor === null) return;

    const periodo = periodoAnterior(anno, mes);
    this.loading.set(true);
    this.service.registrarPoda(item.EMPR_EMPR, valor, aps, periodo.anno, periodo.mes).subscribe({
      next: () => {
        this.loading.set(false);
        this.editingEmprEmpr.set(null);
        this.messages.add({ severity: 'success', summary: 'Costo de Poda', detail: 'Valor actualizado correctamente.' });
        this.consultar();
      },
      error: (err) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Costo de Poda', detail: err?.error?.message || 'No se pudo guardar.' });
      }
    });
  }

  abrirNuevo(): void {
    const aps = this.aps();
    if (!aps) return;

    this.service.consultaCostoPoda(aps).subscribe({
      next: (res) => {
        this.modalItems.set((res.data || []).map((empresa: PodaEmpresa) => ({ ...empresa, valor: null })));
        this.modalVisible.set(true);
      },
      error: (err) => {
        this.messages.add({ severity: 'error', summary: 'Costo de Poda', detail: err?.error?.message || 'No se pudo cargar el catálogo de empresas.' });
      }
    });
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
  }

  confirmarNuevo(): void {
    this.confirmation.confirm({
      header: 'Registrar costos de poda',
      message: '¿Confirmás registrar los costos de poda para este período?',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.guardarNuevo()
    });
  }

  private guardarNuevo(): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    if (!aps || anno === null || mes === null) return;

    const periodo = periodoAnterior(anno, mes);
    const datos = this.modalItems().map((item) => ({
      EMPR_EMPR: item.EMPR_EMPR,
      EMPR_NOMBRE: item.EMPR_NOMBRE,
      valor: item.valor ?? 0
    }));

    this.modalGuardando.set(true);
    this.service.newCostoPoda(datos, aps, periodo.anno, periodo.mes).subscribe({
      next: () => {
        this.modalGuardando.set(false);
        this.modalVisible.set(false);
        this.messages.add({ severity: 'success', summary: 'Costo de Poda', detail: 'Costos registrados correctamente.' });
        this.consultar();
      },
      error: (err) => {
        this.modalGuardando.set(false);
        this.messages.add({ severity: 'error', summary: 'Costo de Poda', detail: err?.error?.message || 'No se pudo guardar.' });
      }
    });
  }
}
