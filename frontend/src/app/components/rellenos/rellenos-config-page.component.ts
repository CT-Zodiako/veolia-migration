import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { RellenosService } from '../../services/rellenos.service';
import { CrearRellenoRequest, EditarRellenoRequest, RellenoItem } from '../../models/rellenos.models';
import { RellenoFormComponent } from './relleno-form.component';

@Component({
  selector: 'app-rellenos-config-page',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, RellenoFormComponent],
  templateUrl: './rellenos-config-page.component.html',
  styleUrls: ['./rellenos-config-page.component.css']
})
export class RellenosConfigPageComponent implements OnInit {
  rellenos: RellenoItem[] = [];
  loading = false;
  error = '';
  showForm = false;
  selectedRelleno: RellenoItem | null = null;
  nombreFilter = '';

  get filteredRellenos(): RellenoItem[] {
    const term = this.nombreFilter.trim().toLowerCase();
    if (!term) return this.rellenos;
    return this.rellenos.filter(item => (item.RELL_NOMRELLENO ?? '').toLowerCase().includes(term));
  }

  constructor(
    private readonly rellenosService: RellenosService,
    private readonly confirmationService: ConfirmationService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    this.rellenosService.getRellenos().subscribe({
      next: rows => {
        this.rellenos = rows || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al cargar rellenos';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreate(): void {
    this.selectedRelleno = null;
    this.showForm = true;
  }

  openEdit(item: RellenoItem): void {
    this.loading = true;
    this.rellenosService.consultarRelleno({ rell_id: item.RELL_ID }).subscribe({
      next: rows => {
        this.selectedRelleno = rows?.[0] ?? item;
        this.showForm = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al cargar relleno para edición';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminar(item: RellenoItem): void {
    this.confirmationService.confirm({
      header: 'Eliminar relleno',
      message: `¿Seguro que querés eliminar lógicamente el relleno "${item.RELL_NOMRELLENO}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => this.confirmarEliminar(item)
    });
  }

  private confirmarEliminar(item: RellenoItem): void {
    this.loading = true;
    this.rellenosService.eliminarRelleno(item.RELL_ID).subscribe({
      next: () => {
        this.loadData();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al eliminar relleno';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleEstado(item: RellenoItem): void {
    const nuevoEstado = item.RELL_ESTADO === 1 ? 2 : 1;
    const payload: EditarRellenoRequest = {
      rell_nomrelleno: item.RELL_NOMRELLENO,
      rell_descripcion: item.RELL_DESCRIPCION ?? '',
      rell_estado: nuevoEstado,
      rell_propio: item.RELL_PROPIO,
      rell_regional: item.RELL_REGIONAL,
      rell_nusd: item.RELL_NUSD ?? null
    };

    this.rellenosService.editarRelleno(item.RELL_ID, payload).subscribe({
      next: () => {
        item.RELL_ESTADO = nuevoEstado;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al cambiar estado';
        this.cdr.detectChanges();
      }
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.selectedRelleno = null;
  }

  save(payload: CrearRellenoRequest): void {
    this.loading = true;
    const request$ = this.selectedRelleno?.RELL_ID
      ? this.rellenosService.editarRelleno(this.selectedRelleno.RELL_ID, payload)
      : this.rellenosService.crearRelleno(payload);

    request$.subscribe({
      next: () => {
        this.closeForm();
        this.loadData();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al guardar relleno';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
