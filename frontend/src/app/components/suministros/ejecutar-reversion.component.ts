import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { SuministrosService } from '../../services/suministros.service';
import { ValidacionesService } from '../../services/validaciones.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

@Component({
  selector: 'app-ejecutar-reversion',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent],
  templateUrl: './ejecutar-reversion.component.html',
  styleUrl: './ejecutar-reversion.component.css'
})
export class EjecutarReversionComponent {
  aps: number | null = null;
  anno: number | null = null;
  mes: number | null = null;
  motivo = '';

  loading = false;
  success = '';
  error = '';

  private periodoReversion: { anno: number; mes: number } | null = null;

  constructor(
    private readonly suministrosService: SuministrosService,
    private readonly validacionesService: ValidacionesService,
    private readonly confirmationService: ConfirmationService,
    private readonly cdr: ChangeDetectorRef
  ) {
    const date = new Date();
    this.anno = date.getFullYear();
    this.mes = date.getMonth() + 1;
  }

  ejecutar(): void {
    if (this.aps === null || this.anno === null || this.mes === null || !this.motivo.trim()) {
      this.error = 'Debe seleccionar APS, año, mes y motivo';
      this.success = '';
      this.cdr.detectChanges();
      return;
    }

    this.error = '';
    this.success = '';
    this.loading = true;
    this.cdr.detectChanges();

    // Paridad AS-IS: antes de reversar, el sistema viejo exige que el gate
    // fauco_integracion devuelva OK; si no, bloquea la reversión. El mes que
    // se selecciona en pantalla es el "mes actual" -- la reversión real
    // siempre opera sobre el mes YA CERRADO (mes anterior).
    this.periodoReversion = periodoAnterior(this.anno, this.mes);
    this.validacionesService.faucoIntegracion({ aps: this.aps, anno: this.periodoReversion.anno, mes: this.periodoReversion.mes }).subscribe({
      next: (validacion) => {
        if (!validacion.ok) {
          this.loading = false;
          this.error = validacion.message || 'El período no está en condiciones de ser reversado';
          this.cdr.detectChanges();
          return;
        }
        this.loading = false;
        this.cdr.detectChanges();
        this.confirmarYEjecutar();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.error?.data || 'Error al validar el período';
        this.cdr.detectChanges();
      }
    });
  }

  private confirmarYEjecutar(): void {
    const periodo = this.periodoReversion!;
    this.confirmationService.confirm({
      header: 'Ejecutar reversión',
      message: `Esta acción es DESTRUCTIVA: va a borrar y resguardar la información certificada de la APS seleccionada para ${periodo.mes}/${periodo.anno}. ¿Confirmás que querés continuar?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reversar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => this.ejecutarReversion()
    });
  }

  private ejecutarReversion(): void {
    this.loading = true;
    this.cdr.detectChanges();

    const periodo = this.periodoReversion!;
    this.suministrosService.setReversion({
      aps: this.aps!,
      anno: periodo.anno,
      mes: periodo.mes,
      motivo: this.motivo.trim()
    }).subscribe({
      next: (data) => {
        this.loading = false;
        if (data?.ok) {
          this.success = `Reversión ejecutada correctamente (ID: ${data.reversionId ?? 'N/A'})`;
          this.motivo = '';
        } else {
          this.error = data?.message || 'No fue posible ejecutar la reversión';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.error?.data || 'Error al ejecutar reversión';
        this.cdr.detectChanges();
      }
    });
  }
}
