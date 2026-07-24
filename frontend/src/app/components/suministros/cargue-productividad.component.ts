import { Component, signal } from '@angular/core';
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

@Component({
  selector: 'app-cargue-productividad',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ToastModule, AnnoSelectorComponent, MesSelectorComponent, PivotTablaComponent],
  providers: [MessageService],
  templateUrl: './cargue-productividad.component.html',
  styleUrls: ['./cargue-productividad.component.css']
})
export class CargueProductividadComponent {
  anno = signal<number | null>(new Date().getFullYear());
  mes = signal<number | null>(new Date().getMonth() + 1);

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

  constructor(
    private readonly service: SuministrosService,
    private readonly messages: MessageService,
    private readonly confirmation: ConfirmationService
  ) {}

  onAnnoChange(value: number | null): void {
    this.anno.set(value);
  }

  onMesChange(value: number | null): void {
    this.mes.set(value);
  }

  cargar(): void {
    const anno = this.anno();
    const mes = this.mes();
    if (anno === null || mes === null) return;

    const periodo = periodoAnterior(anno, mes);
    this.cargando.set(true);
    this.service.cargueProductividad(periodo.anno, periodo.mes).subscribe({
      next: (res) => {
        this.propios.set(res.data?.propios || []);
        this.terceros.set(res.data?.terceros || []);
        this.cargado.set(true);
        this.cargando.set(false);
        this.messages.add({ severity: 'success', summary: 'Cargue Productividad', detail: 'Datos cargados desde Google Sheets.' });
      },
      error: (err) => {
        this.cargando.set(false);
        this.messages.add({ severity: 'error', summary: 'Cargue Productividad', detail: err?.error?.message || 'Error al cargar los datos.' });
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
        this.messages.add({ severity: 'success', summary: 'Cargue Productividad', detail: 'Datos guardados correctamente.' });
      },
      error: (err) => {
        this.guardando.set(false);
        this.messages.add({ severity: 'error', summary: 'Cargue Productividad', detail: err?.error?.message || 'No se pudo guardar.' });
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
