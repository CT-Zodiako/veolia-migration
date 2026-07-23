import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { EmpresasService, EmpresaItem, EmpresaMutationPayload } from '../../services/empresas.service';
import { EmpresaFormComponent } from './empresa-form.component';

@Component({
  selector: 'app-empresas-config',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, EmpresaFormComponent],
  templateUrl: './empresas-config.component.html',
  styleUrls: ['./empresas-config.component.css']
})
export class EmpresasConfigComponent implements OnInit {
  empresas: EmpresaItem[] = [];
  loading = false;
  error = '';
  showForm = false;
  selectedEmpresa: EmpresaItem | null = null;
  nombreFilter = '';

  get filteredEmpresas(): EmpresaItem[] {
    const term = this.nombreFilter.trim().toLowerCase();
    if (!term) return this.empresas;
    return this.empresas.filter(item => (item.EMPR_NOMBRE ?? '').toLowerCase().includes(term));
  }

  constructor(
    private readonly empresasService: EmpresasService,
    private readonly confirmationService: ConfirmationService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    this.empresasService.getEmpresas().subscribe({
      next: data => {
        this.empresas = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al cargar empresas';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreate(): void {
    this.selectedEmpresa = null;
    this.showForm = true;
  }

  openEdit(item: EmpresaItem): void {
    this.loading = true;
    this.empresasService.getEmprbyId(item.EMPR_EMPR).subscribe({
      next: rows => {
        this.selectedEmpresa = rows?.[0] ?? item;
        this.showForm = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al cargar empresa para edición';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.selectedEmpresa = null;
  }

  eliminar(item: EmpresaItem): void {
    this.confirmationService.confirm({
      header: 'Eliminar empresa',
      message: `¿Seguro que querés eliminar la empresa "${item.EMPR_NOMBRE}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => this.confirmarEliminar(item)
    });
  }

  private confirmarEliminar(item: EmpresaItem): void {
    this.loading = true;
    this.empresasService.eliminar(item.EMPR_EMPR).subscribe({
      next: () => {
        this.loadData();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al eliminar empresa';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleEstado(item: EmpresaItem): void {
    this.empresasService.toggleEstado(item.EMPR_EMPR).subscribe({
      next: () => {
        item.EMPR_ESTADO = item.EMPR_ESTADO === 1 ? 0 : 1;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al cambiar estado';
        this.cdr.detectChanges();
      }
    });
  }

  save(payload: EmpresaMutationPayload): void {
    this.loading = true;

    const request$ = this.selectedEmpresa?.EMPR_EMPR
      ? this.empresasService.updtEmpr(this.selectedEmpresa.EMPR_EMPR, payload)
      : this.empresasService.newEmpr(payload);

    request$.subscribe({
      next: () => {
        this.closeForm();
        this.loadData();
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al guardar empresa';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
