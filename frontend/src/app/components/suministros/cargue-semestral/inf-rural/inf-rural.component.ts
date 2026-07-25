import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { SuministrosService } from '../../../../services/suministros.service';

@Component({
  selector: 'app-inf-rural',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, ...CommonPrimeNgModules],
  templateUrl: './inf-rural.component.html',
  styleUrl: './inf-rural.component.css'
})
export class InfRuralComponent {
  @Input({ required: true }) aps!: number;
  @Input({ required: true }) anno!: number;
  @Input({ required: true }) semestre!: number;
  @Output() guardado = new EventEmitter<void>();

  readonly qrtRural = signal<number | null>(null);
  readonly guardando = signal(false);
  readonly estado = signal('');

  constructor(
    private readonly service: SuministrosService,
    private readonly confirmation: ConfirmationService
  ) {}

  guardar(): void {
    this.confirmation.confirm({
      header: 'Guardar información de rural',
      message: '¿Confirmás guardar el QRT Rural para el APS, año y semestre seleccionados?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.confirmarGuardado()
    });
  }

  private confirmarGuardado(): void {
    this.guardando.set(true);
    this.service.guardarQRTRural({
      aps: this.aps,
      anno: this.anno,
      semestre: this.semestre,
      qrtRural: this.qrtRural() ?? 0
    }).subscribe({
      next: () => {
        this.estado.set('QRT Rural guardado correctamente.');
        this.guardando.set(false);
        this.qrtRural.set(null);
        this.guardado.emit();
      },
      error: (e) => {
        this.estado.set(e?.error?.message || 'No fue posible guardar el QRT Rural.');
        this.guardando.set(false);
      }
    });
  }
}
