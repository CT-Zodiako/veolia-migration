import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductividadService, ProductividadItem } from '../../services/productividad.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { periodoInicial } from '../shared/periodo-inicial.util';

const FORMATO_VALOR = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 6 });
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

@Component({
  selector: 'app-ajuste-productividad',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...CommonPrimeNgModules,
    ToastModule,
    ApsSelectorComponent,
    AnnoSelectorComponent,
    MesSelectorComponent
  ],
  providers: [MessageService],
  templateUrl: './ajuste-productividad.component.html',
  styleUrls: ['./ajuste-productividad.component.css']
})
export class AjusteProductividadComponent {
  aps = signal<number | null>(null);
  private readonly periodo = periodoInicial(inject(ParametrosConsultaStateService));
  anno = signal<number | null>(this.periodo.anno);
  mes = signal<number | null>(this.periodo.mes);

  loading = signal(false);
  item = signal<ProductividadItem | null>(null);
  consultado = signal(false);

  editando = signal(false);
  editingValor = signal<number | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly consultarTrigger$ = new Subject<void>();

  constructor(
    private readonly service: ProductividadService,
    private readonly messages: MessageService,
    private readonly confirmation: ConfirmationService
  ) {
    // switchMap cancela automáticamente la consulta anterior si todavía está en vuelo
    // cuando el usuario cambia de selector de nuevo -- evita que una respuesta vieja
    // (de un período/APS ya abandonado) llegue tarde y pise el resultado correcto.
    this.consultarTrigger$
      .pipe(
        switchMap(() => {
          const aps = this.aps();
          const anno = this.anno();
          const mes = this.mes();
          if (!aps || !anno || !mes) return EMPTY;

          this.loading.set(true);
          const periodo = periodoAnterior(anno, mes);
          return this.service.consultar({ aps, anno: periodo.anno, mes: periodo.mes }).pipe(
            catchError(() => {
              // A failed consulta behaves as "no record" so Agregar stays reachable.
              // httpErrorInterceptor already toasted the failure.
              this.item.set(null);
              this.consultado.set(true);
              this.loading.set(false);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.item.set(res.data);
        this.consultado.set(true);
        this.loading.set(false);
      });
  }

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

  consultar(): void {
    if (!this.aps() || !this.anno() || !this.mes()) return;
    this.editando.set(false);
    this.consultarTrigger$.next();
  }

  // Legacy Productividad.vue openBasic: a new value starts at 0, an existing one is
  // pre-filled rounded to 6 decimals.
  iniciarEdicion(): void {
    const item = this.item();
    this.editando.set(true);
    this.editingValor.set(item ? redondeo(item.prodValor) : 0);
  }

  // design/suministros-pantallas/16: stored value in es-CO with up to 6 decimals (legacy redondeo); '' when not set,
  // which the template shows as "Sin valor · Pendiente".
  valorMostrado(): string {
    const item = this.item();
    return item ? FORMATO_VALOR.format(redondeo(item.prodValor)) : '';
  }

  // Selected period shown in the row, e.g. "Marzo 2026".
  readonly periodoTexto = computed(() => {
    const anno = this.anno();
    const mes = this.mes();
    return anno && mes ? `${MESES[mes - 1]} ${anno}` : '';
  });

  cancelarEdicion(): void {
    this.editando.set(false);
  }

  confirmarGuardar(): void {
    if (this.editingValor() === null) return;
    const existe = this.item() !== null;
    this.confirmation.confirm({
      header: existe ? 'Actualizar productividad' : 'Registrar productividad',
      message: existe
        ? '¿Confirmás actualizar el valor de productividad para este período?'
        : '¿Confirmás registrar un nuevo valor de productividad para este período?',
      icon: 'pi pi-question-circle',
      acceptLabel: existe ? 'Actualizar' : 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.guardarValor(existe)
    });
  }

  private guardarValor(existe: boolean): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    const valor = this.editingValor();
    if (!aps || anno === null || mes === null || valor === null) return;

    // Legacy Productividad.vue makeOperation inserts into the selected month, while
    // uptProductividad (suministros/controller.js:536) updates the previous month it reads.
    const periodo = existe ? periodoAnterior(anno, mes) : { anno, mes };
    const payload = { aps, anno: periodo.anno, mes: periodo.mes, valor };

    this.loading.set(true);
    const call = existe ? this.service.editar(payload) : this.service.crear(payload);
    call.subscribe({
      next: () => {
        this.loading.set(false);
        this.editando.set(false);
        this.messages.add({ severity: 'success', summary: 'Ajuste Productividad', detail: 'Valor guardado correctamente.' });
        this.consultar();
      },
      // httpErrorInterceptor already toasted the failure.
      error: () => this.loading.set(false)
    });
  }
}

function redondeo(valor: number): number {
  return parseFloat(Number(valor).toFixed(6));
}
