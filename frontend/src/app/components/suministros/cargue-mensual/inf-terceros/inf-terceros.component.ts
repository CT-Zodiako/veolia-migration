import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { SuministrosService } from '../../../../services/suministros.service';
import { periodoAnterior } from '../../../../shared/periodo-anterior.util';

@Component({
  selector: 'app-inf-terceros',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, ...CommonPrimeNgModules],
  templateUrl: './inf-terceros.component.html',
  styleUrl: './inf-terceros.component.css'
})
export class InfTercerosComponent {
  @Input({ required: true }) aps!: number;
  @Input({ required: true }) anno!: number;
  @Input({ required: true }) mes!: number;
  @Output() guardado = new EventEmitter<void>();

  readonly cdf = signal<number | null>(null);
  readonly ctl = signal<number | null>(null);
  readonly incentivo = signal<number | null>(null);
  readonly guardando = signal(false);
  readonly estado = signal('');

  constructor(
    private readonly service: SuministrosService,
    private readonly confirmation: ConfirmationService
  ) {}

  guardar(): void {
    this.confirmation.confirm({
      header: 'Guardar información de terceros',
      message: '¿Confirmás guardar la información de terceros para el período seleccionado?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.confirmarGuardado()
    });
  }

  private confirmarGuardado(): void {
    this.guardando.set(true);
    const periodo = periodoAnterior(this.anno, this.mes);
    this.service.setTerceros({
      aps: this.aps,
      anno: periodo.anno,
      mes: periodo.mes,
      cdf: this.cdf() ?? 0,
      ctl: this.ctl() ?? 0,
      incentivo: this.incentivo() ?? 0
    }).subscribe({
      next: () => {
        this.estado.set('Información de terceros guardada correctamente.');
        this.guardando.set(false);
        this.guardado.emit();
      },
      error: (e) => {
        this.estado.set(e?.error?.message || 'No fue posible guardar la información de terceros.');
        this.guardando.set(false);
      }
    });
  }
}
