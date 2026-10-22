import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SubContService, SubContItem } from '../../services/subcont.service';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';

// Legacy SubCon.vue:231-239: the nine clases of the dialog (est1..est6, com, indu, ofi) and their labels (:78-198).
const CLASES_LEGACY: { clase: number; nombre: string }[] = [
  { clase: 1, nombre: 'ESTRATO 1' },
  { clase: 2, nombre: 'ESTRATO 2' },
  { clase: 3, nombre: 'ESTRATO 3' },
  { clase: 4, nombre: 'ESTRATO 4' },
  { clase: 5, nombre: 'ESTRATO 5' },
  { clase: 6, nombre: 'ESTRATO 6' },
  { clase: 7, nombre: 'COMERCIAL' },
  { clase: 8, nombre: 'INDUSTRIAL' },
  { clase: 9, nombre: 'OFICIAL' }
];

interface ClaseItem {
  clase: number;
  nombre: string;
  valor: number | null;
  sucoId?: number;
  existe: boolean;
}

@Component({
  selector: 'app-subcont-page',
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
  templateUrl: './subcont-page.component.html',
  styleUrls: ['./subcont-page.component.css']
})
export class SubContPageComponent implements OnInit {
  aps = signal<number | null>(null);
  anno = signal<number | null>(new Date().getFullYear());
  mes = signal<number | null>(new Date().getMonth() + 1);

  loading = signal(false);
  clases = signal<ClaseItem[]>([]);
  catalogo = signal<Map<number, string>>(new Map());

  editingClase = signal<number | null>(null);
  editingValor = signal<number | null>(null);
  readonly clasesLegacy = CLASES_LEGACY;
  dialogVisible = signal(false);
  valoresDialogo = signal<Map<number, number | null>>(new Map());

  // Legacy SubCon.vue:15-28: the grid lists only the stored rows; value "%" + SUCO_VALOR.toFixed(4).
  readonly registros = computed(() =>
    this.clases()
      .filter((c) => c.existe)
      .map((c) => ({ nombre: c.nombre, valor: c.valor === null ? '' : `%${c.valor.toFixed(4)}` }))
  );
  // Legacy SubCon.vue:35-52,364-370: "Agregar" when the period has no rows, "Editar" otherwise.
  readonly esNuevo = computed(() => !this.clases().some((c) => c.existe));
  readonly tituloDialogo = computed(() => (this.esNuevo() ? 'Registrar Nuevo Sub&Con' : 'Modificar Sub&Con'));

  private readonly destroyRef = inject(DestroyRef);
  private readonly consultarTrigger$ = new Subject<void>();

  constructor(
    private readonly subContService: SubContService,
    private readonly proyeccionesService: ProyeccionesService,
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

          this.editingClase.set(null);
          this.loading.set(true);
          const periodo = periodoAnterior(anno, mes);
          return this.subContService.consultar({ aps, anno: periodo.anno, mes: periodo.mes }).pipe(
            catchError((err) => {
              this.loading.set(false);
              this.messages.add({ severity: 'error', summary: 'Subsidios y Contribuciones', detail: err?.error?.data || 'Error al consultar.' });
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.clases.set(this.mapearClases(data));
        this.loading.set(false);
      });
  }

  ngOnInit(): void {
    this.cargarCatalogo();
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

  nombreClase(clase: number): string {
    return this.catalogo().get(clase) ?? `Clase ${clase}`;
  }

  private cargarCatalogo(): void {
    this.proyeccionesService.consultarClasesUso().subscribe({
      next: (res) => {
        const mapa = new Map<number, string>();
        for (const item of res.data || []) {
          mapa.set(item.clasClase, item.clasNombre);
        }
        this.catalogo.set(mapa);
      }
    });
  }

  consultar(): void {
    if (!this.aps() || !this.anno() || !this.mes()) return;
    this.consultarTrigger$.next();
  }

  private mapearClases(data: SubContItem[]): ClaseItem[] {
    return CLASES_LEGACY.map(({ clase, nombre }) => {
      const encontrado = data.find((d) => d.clasClase === clase);
      return {
        clase,
        nombre: this.catalogo().get(clase) ?? nombre,
        valor: encontrado ? encontrado.sucoValor : null,
        sucoId: encontrado?.sucoId,
        existe: !!encontrado
      };
    });
  }

  // Legacy SubCon.vue:293-337 (openBasic): Agregar starts the nine values blank; Editar loads the stored ones.
  abrirDialogo(): void {
    this.valoresDialogo.set(new Map(this.clases().map((c) => [c.clase, this.esNuevo() ? null : c.valor])));
    this.dialogVisible.set(true);
  }

  cerrarDialogo(): void {
    this.dialogVisible.set(false);
  }

  valorDialogo(clase: number): number | null {
    return this.valoresDialogo().get(clase) ?? null;
  }

  onValorDialogoChange(clase: number, value: number | string | null): void {
    const mapa = new Map(this.valoresDialogo());
    mapa.set(clase, this.parsear(value));
    this.valoresDialogo.set(mapa);
  }

  iniciarEdicion(item: ClaseItem): void {
    if (!this.dialogVisible()) this.abrirDialogo();
    this.editingClase.set(item.clase);
    this.editingValor.set(this.valorDialogo(item.clase));
  }

  cancelarEdicion(): void {
    this.editingClase.set(null);
    this.cerrarDialogo();
  }

  onEditingValorChange(value: number | string | null): void {
    this.editingValor.set(this.parsear(value));
    const clase = this.editingClase();
    if (clase !== null) this.onValorDialogoChange(clase, value);
  }

  private parsear(value: number | string | null): number | null {
    if (value === null || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  confirmarGuardar(_item?: ClaseItem): void {
    this.confirmation.confirm({
      header: 'Guardar valores',
      message: '¿Confirmás guardar los valores de Subsidios y Contribuciones?',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.guardarValores()
    });
  }

  // Legacy SubCon.vue:262-292 (makeOperation): the nine clases go in one request (blank = null), crear when the period
  // has no rows, editar otherwise; SubConService.js:62-80,102-120 toasts.
  private guardarValores(): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    if (!aps || anno === null || mes === null) return;

    const periodo = periodoAnterior(anno, mes);
    const request = {
      aps,
      anno: periodo.anno,
      mes: periodo.mes,
      valores: CLASES_LEGACY.map(({ clase }) => ({ id: clase, val: this.valorDialogo(clase) }))
    };

    const nuevo = this.esNuevo();
    const exito = nuevo ? 'Creada Correctamente' : 'Modificado Correctamente';
    const fallo = nuevo ? 'Error al crear' : 'Error al modificar';
    this.loading.set(true);
    const call = nuevo ? this.subContService.crear(request) : this.subContService.editar(request);
    call.subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.success) {
          this.editingClase.set(null);
          this.cerrarDialogo();
          this.messages.add({ severity: 'success', summary: exito });
          this.consultar();
        } else {
          this.messages.add({ severity: 'error', summary: fallo, detail: result.message ?? undefined });
        }
      },
      error: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: fallo });
      }
    });
  }
}
