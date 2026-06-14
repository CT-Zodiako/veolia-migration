import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { RellenosService } from '../../services/rellenos.service';
import { CrearRellenoRequest, RellenoItem } from '../../models/rellenos.models';
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

  constructor(
    private readonly rellenosService: RellenosService,
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
    const accepted = window.confirm(`¿Seguro que querés eliminar lógicamente el relleno "${item.RELL_NOMRELLENO}"?`);
    if (!accepted) {
      return;
    }

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
