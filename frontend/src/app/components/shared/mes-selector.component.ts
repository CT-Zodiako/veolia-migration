import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';

interface MesOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-mes-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  template: `
    <div class="form-group">
      <label *ngIf="label">{{ label }}</label>
      <p-select
        [options]="meses"
        [(ngModel)]="selectedMes"
        optionLabel="label"
        optionValue="value"
        [placeholder]="placeholder"
        [showClear]="true"
        [style]="{width: '100%'}"
        (onChange)="onSelect($event.value)"
      >
      </p-select>
    </div>
  `,
  styles: [`
    .form-group { margin-bottom: 12px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--color-text-body); }
  `]
})
export class MesSelectorComponent {
  @Input() label = 'Mes';
  @Input() placeholder = 'Seleccione mes';
  @Input() selectedMes: number | null = null;
  
  @Output() selectedMesChange = new EventEmitter<number | null>();

  readonly meses: MesOption[] = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  onSelect(value: number | string | null): void {
    const mes = value ? Number(value) : null;
    this.selectedMes = mes;
    this.selectedMesChange.emit(mes);
  }
}
