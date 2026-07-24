import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SubContService, SubContItem } from '../../services/subcont.service';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';

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
    const nombres = this.catalogo();
    const clasesOrdenadas = nombres.size > 0 ? Array.from(nombres.keys()).sort((a, b) => a - b) : Array.from({ length: 9 }, (_, i) => i + 1);

    return clasesOrdenadas.map((clase) => {
      const encontrado = data.find((d) => d.clasClase === clase);
      return {
        clase,
        nombre: this.nombreClase(clase),
        valor: encontrado ? encontrado.sucoValor : null,
        sucoId: encontrado?.sucoId,
        existe: !!encontrado
      };
    });
  }

  iniciarEdicion(item: ClaseItem): void {
    this.editingClase.set(item.clase);
    this.editingValor.set(item.valor);
  }

  cancelarEdicion(): void {
    this.editingClase.set(null);
  }

  confirmarGuardar(item: ClaseItem): void {
    this.confirmation.confirm({
      header: 'Guardar valor',
      message: `¿Confirmás guardar el nuevo valor de "${item.nombre}"?`,
      icon: 'pi pi-question-circle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.guardarValor(item)
    });
  }

  private guardarValor(item: ClaseItem): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    const valor = this.editingValor();
    if (!aps || anno === null || mes === null || valor === null) return;

    const periodo = periodoAnterior(anno, mes);
    const request = {
      aps,
      anno: periodo.anno,
      mes: periodo.mes,
      valores: [{ id: item.clase, val: valor }]
    };

    this.loading.set(true);
    const call = item.existe ? this.subContService.editar(request) : this.subContService.crear(request);
    call.subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.success) {
          this.editingClase.set(null);
          this.messages.add({ severity: 'success', summary: 'Subsidios y Contribuciones', detail: 'Valor guardado correctamente.' });
          this.consultar();
        } else {
          this.messages.add({ severity: 'error', summary: 'Subsidios y Contribuciones', detail: result.message || 'No se pudo guardar.' });
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Subsidios y Contribuciones', detail: err?.error?.data || 'No se pudo guardar.' });
      }
    });
  }
}
