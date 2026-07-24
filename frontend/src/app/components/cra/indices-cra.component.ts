import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IndicesCraService } from '../../services/indices-cra.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';

@Component({
  selector: 'app-indices-cra',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ToastModule, AnnoSelectorComponent, MesSelectorComponent],
  providers: [MessageService],
  templateUrl: './indices-cra.component.html',
  styleUrls: ['./indices-cra.component.css']
})
export class IndicesCraComponent implements OnInit {
  anno = signal<number | null>(new Date().getFullYear());
  mes = signal<number | null>(new Date().getMonth() + 1);
  loading = signal(false);
  rows = signal<any[]>([]);
  catalogo = signal<Map<number, string>>(new Map());

  editingParaId = signal<number | null>(null);
  editingValor = signal<number | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly consultarTrigger$ = new Subject<void>();

  constructor(
    private readonly service: IndicesCraService,
    private readonly messages: MessageService,
    private readonly confirmation: ConfirmationService
  ) {
    // switchMap cancela la consulta anterior si todavía está en vuelo cuando el
    // usuario cambia de selector de nuevo -- evita que una respuesta vieja pise
    // el resultado del período correcto.
    this.consultarTrigger$
      .pipe(
        switchMap(() => {
          const anno = this.anno();
          const mes = this.mes();
          if (!anno || !mes) return EMPTY;

          this.editingParaId.set(null);
          this.loading.set(true);
          const periodo = periodoAnterior(anno, mes);
          return this.service.consultar(periodo.anno, periodo.mes).pipe(
            catchError((err: any) => {
              this.loading.set(false);
              this.messages.add({ severity: 'error', summary: 'Índices CRA', detail: err?.error?.message || 'Error al consultar índices.' });
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.rows.set(res.data || []);
        this.loading.set(false);
      });
  }

  ngOnInit(): void {
    this.cargarCatalogo();
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

  nombreIndice(paraIndice20011: number): string {
    return this.catalogo().get(paraIndice20011) ?? `Índice ${paraIndice20011}`;
  }

  private cargarCatalogo(): void {
    this.service.catalogo().subscribe({
      next: (res) => {
        const mapa = new Map<number, string>();
        for (const item of res.data || []) {
          mapa.set(item.paraPara, item.paraNombre);
        }
        this.catalogo.set(mapa);
      }
    });
  }

  consultar(): void {
    if (!this.anno() || !this.mes()) return;
    this.consultarTrigger$.next();
  }

  iniciarEdicion(row: any): void {
    this.editingParaId.set(row.paraIndice20011);
    this.editingValor.set(row.indiValor);
  }

  cancelarEdicion(): void {
    this.editingParaId.set(null);
  }

  confirmarGuardar(row: any): void {
    this.confirmation.confirm({
      header: 'Guardar índice',
      message: `¿Confirmás guardar el nuevo valor de "${this.nombreIndice(row.paraIndice20011)}"?`,
      icon: 'pi pi-question-circle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.guardarValor(row)
    });
  }

  private guardarValor(row: any): void {
    const anno = this.anno();
    const mes = this.mes();
    const valor = this.editingValor();
    if (anno === null || mes === null || valor === null) return;

    const periodo = periodoAnterior(anno, mes);
    this.loading.set(true);
    this.service.editar({ anno: periodo.anno, mes: periodo.mes, valores: [{ id: row.paraIndice20011, val: valor }] }).subscribe({
      next: () => {
        this.loading.set(false);
        this.editingParaId.set(null);
        this.messages.add({ severity: 'success', summary: 'Índices CRA', detail: 'Índice actualizado.' });
        this.consultar();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Índices CRA', detail: err?.error?.message || 'No se pudo guardar.' });
      }
    });
  }
}
