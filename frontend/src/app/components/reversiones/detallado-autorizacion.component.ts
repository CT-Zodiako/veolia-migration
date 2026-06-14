import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ReversionDetalleRow, ReversionesService } from '../../services/reversiones.service';

@Component({
  selector: 'app-detallado-autorizacion',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  templateUrl: './detallado-autorizacion.component.html'
})
export class DetalladoAutorizacionComponent implements OnInit {
  rows: ReversionDetalleRow[] = [];
  loading = false;
  error = '';

  readonly columns = [
    'APSA_NOMAPS',
    'AUTO_ANNO',
    'AUTO_MES',
    'AUTO_DESCRIPCION',
    'AUTO_FECCREA',
    'SISU_CORREO'
  ];

  constructor(
    private readonly reversionesService: ReversionesService,
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
}
