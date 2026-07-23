import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { ReversionesService } from '../../services/reversiones.service';

@Component({
  selector: 'app-autorizacion-reversiones',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ParametrosConsultaComponent],
  templateUrl: './autorizacion-reversiones.component.html'
})
export class AutorizacionReversionesComponent implements OnInit {
  aps: number | null = null;
  anno: number | null = null;
  mes: number | null = null;
  descripcion = '';

  loading = false;
  success = '';
  error = '';

  constructor(
    private readonly reversionesService: ReversionesService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    this.anno = date.getFullYear();
    this.mes = date.getMonth() + 1;
  }

  autorizar(): void {
    if (this.aps === null || this.anno === null || this.mes === null || !this.descripcion.trim()) {
      this.error = 'Debe seleccionar APS, año, mes y descripción';
      this.success = '';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.reversionesService
      .autorizarReversion({
        aps: this.aps,
        anno: this.anno,
        mes: this.mes,
        descripcion: this.descripcion.trim()
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.success = 'Autorización creada correctamente';
          this.descripcion = '';
          this.cdr.detectChanges();
        },
        error: err => {
          this.loading = false;
          this.error = err?.error?.message || err?.error?.data || 'Error al crear autorización';
          this.cdr.detectChanges();
        }
      });
  }
}
