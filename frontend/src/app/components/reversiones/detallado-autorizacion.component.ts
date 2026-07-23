import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ReversionDetalleRow, ReversionesService } from '../../services/reversiones.service';

@Component({
  selector: 'app-detallado-autorizacion',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  providers: [DatePipe],
  templateUrl: './detallado-autorizacion.component.html',
  styleUrl: './detallado-autorizacion.component.css'
})
export class DetalladoAutorizacionComponent implements OnInit {
  rows: ReversionDetalleRow[] = [];
  loading = false;
  error = '';

  apsFilter = '';
  annoFilter = '';
  mesFilter = '';
  fechaFilter = '';
  usuarioFilter = '';

  get filteredRows(): ReversionDetalleRow[] {
    return this.rows.filter(row =>
      this.coincide(row['APSA_NOMAPS'], this.apsFilter) &&
      this.coincide(row['AUTO_ANNO'], this.annoFilter) &&
      this.coincide(row['AUTO_MES'], this.mesFilter) &&
      this.coincide(this.datePipe.transform(row['AUTO_FECCREA'] as string, 'dd/MM/yyyy'), this.fechaFilter) &&
      this.coincide(row['SISU_CORREO'], this.usuarioFilter)
    );
  }

  constructor(
    private readonly reversionesService: ReversionesService,
    private readonly datePipe: DatePipe,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = '';

    this.reversionesService.detalladoAutorizacion().subscribe({
      next: data => {
        this.rows = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.message || err?.error?.data || 'Error al consultar detallado';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private coincide(valor: unknown, filtro: string): boolean {
    const term = filtro.trim().toLowerCase();
    if (!term) return true;
    return String(valor ?? '').toLowerCase().includes(term);
  }
}
