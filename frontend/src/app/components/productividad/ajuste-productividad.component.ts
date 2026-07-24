import { Component, DestroyRef, inject, signal } from '@angular/core';
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
  anno = signal<number | null>(new Date().getFullYear());
  mes = signal<number | null>(new Date().getMonth() + 1);

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
            catchError((err) => {
              this.loading.set(false);
              this.messages.add({ severity: 'error', summary: 'Ajuste Productividad', detail: err?.error?.message || 'Error al consultar.' });
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

  iniciarEdicion(): void {
    this.editando.set(true);
    this.editingValor.set(this.item()?.prodValor ?? null);
  }

  cancelarEdicion(): void {
    this.editando.set(false);
  }

  confirmarGuardar(): void {
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

    const periodo = periodoAnterior(anno, mes);
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
      error: (err) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Ajuste Productividad', detail: err?.error?.message || 'No se pudo guardar.' });
      }
    });
  }
}
