import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { SuministrosService, ProductividadCargueRow, ProductividadCargueGuardarItem } from '../../services/suministros.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { PivotTablaComponent } from '../shared/pivot-tabla.component';
import { PivotColumnDef } from '../../shared/pivot.util';
import { periodoInicial } from '../shared/periodo-inicial.util';

@Component({
  selector: 'app-cargue-productividad',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ToastModule, AnnoSelectorComponent, MesSelectorComponent, PivotTablaComponent],
  providers: [MessageService],
  templateUrl: './cargue-productividad.component.html',
  styleUrls: ['./cargue-productividad.component.css']
})
export class CargueProductividadComponent implements OnInit {
  private readonly periodo = periodoInicial(inject(ParametrosConsultaStateService));
  anno = signal<number | null>(this.periodo.anno);
  mes = signal<number | null>(this.periodo.mes);

  cargando = signal(false);
  guardando = signal(false);
  cargado = signal(false);

  propios = signal<ProductividadCargueRow[]>([]);
  terceros = signal<ProductividadCargueRow[]>([]);

  // Igual que columnDefsInit en Propios.vue/Terceros.vue (legacy): colmOper:1 = agrupable.
  readonly columnas: PivotColumnDef[] = [
    { field: 'COD APS', headerName: 'COD APS', agrupable: true },
    { field: 'APS', headerName: 'APS', agrupable: true },
    { field: 'COD EMPRESA', headerName: 'COD EMPRESA', agrupable: true },
    { field: 'EMPRESA', headerName: 'EMPRESA', agrupable: true },
    { field: 'ANNO', headerName: 'ANO', agrupable: true },
    { field: 'MES', headerName: 'MES', agrupable: true },
    { field: 'CCS', headerName: 'CCS', agrupable: false },
    { field: 'CBLS', headerName: 'CBLS', agrupable: false },
    { field: 'CLUS', headerName: 'CLUS', agrupable: false },
    { field: 'CRT', headerName: 'CRT', agrupable: false },
    { field: 'CDF', headerName: 'CDF', agrupable: false },
    { field: 'CTL', headerName: 'CTL', agrupable: false }
  ];

  // In-flight load; replaced (and its response ignored) when the period changes before it answers.
  private consulta?: Subscription;

  constructor(
    private readonly service: SuministrosService,
    private readonly messages: MessageService,
    private readonly confirmation: ConfirmationService
  ) {
    inject(DestroyRef).onDestroy(() => this.consulta?.unsubscribe());
  }

  // Legacy loaded only on the Cargar button; the user asked to load with the preselected period
  // and whenever the selector changes (S5).
  ngOnInit(): void {
    this.cargar();
  }

  onAnnoChange(value: number | null): void {
    if (value === this.anno()) return;
    this.anno.set(value);
    this.cargar();
  }

  onMesChange(value: number | null): void {
    if (value === this.mes()) return;
    this.mes.set(value);
    this.cargar();
  }

  cargar(): void {
    const anno = this.anno();
    const mes = this.mes();
    if (anno === null || mes === null) return;

    const periodo = periodoAnterior(anno, mes);
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.consulta = this.service.cargueProductividad(periodo.anno, periodo.mes).subscribe({
      next: (res) => {
        this.propios.set(res.data?.propios || []);
        this.terceros.set(res.data?.terceros || []);
        this.cargado.set(true);
        this.cargando.set(false);
        // Legacy service/CargueProductividad.js:20-24.
        this.messages.add({ severity: 'success', summary: 'Consulta realizada correctamente', life: 3000 });
      },
      error: (err) => {
        this.propios.set([]);
        this.terceros.set([]);
        this.cargado.set(false);
        this.cargando.set(false);
        // Backend 500 body (legacy suministros/controller.js:135-143): { message, detail }.
        this.messages.add({ severity: 'error', summary: 'Error al consultar Cargue Productividad', detail: err?.error?.detail ?? err?.error?.message, life: 5000 });
      }
    });
  }

  confirmarGuardar(): void {
    this.confirmation.confirm({
      header: 'Guardar cargue de productividad',
      message: '¿Confirmás guardar los datos de productividad cargados para este período? Esto reemplaza cualquier registro existente para el mismo período.',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.guardar()
    });
  }

  private guardar(): void {
    const dataPropios = this.propios().map((row) => this.aGuardarItem(row));
    const dataTerceros = this.terceros().map((row) => this.aGuardarItem(row));

    this.guardando.set(true);
    this.service.guardarProductividad(dataPropios, dataTerceros).subscribe({
      next: () => {
        this.guardando.set(false);
        // Legacy service/CargueProductividad.js:53-57.
        this.messages.add({ severity: 'success', summary: 'Cargue Productividad guardado correctamente', life: 3000 });
      },
      error: (err) => {
        this.guardando.set(false);
        this.messages.add({ severity: 'error', summary: 'Error al guardar Cargue Productividad', detail: err?.error?.message, life: 3000 });
      }
    });
  }

  private aGuardarItem(row: ProductividadCargueRow): ProductividadCargueGuardarItem {
    return {
      COD_APS: row['COD APS'],
      APS: row.APS,
      COD_EMPRESA: row['COD EMPRESA'],
      EMPRESA: row.EMPRESA,
      ANNO: row.ANNO,
      MES: row.MES,
      CCS: row.CCS,
      CBLS: row.CBLS,
      CLUS: row.CLUS,
      CRT: row.CRT,
      CDF: row.CDF,
      CTL: row.CTL
    };
  }
}
