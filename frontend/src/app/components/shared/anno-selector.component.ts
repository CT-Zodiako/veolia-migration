import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';

interface AnnoOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-anno-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  template: `
    <div class="form-group">
      <label *ngIf="label">{{ label }}</label>
      <p-select
        [options]="annoOptions"
        [(ngModel)]="selectedAnno"
        optionLabel="label"
        optionValue="value"
        [placeholder]="placeholder"
        [showClear]="true"
        [style]="{width: '100%'}"
        (onChange)="onSelect($event.value)">
      </p-select>
    </div>
  `,
  styles: [`
    .form-group { margin-bottom: 12px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #334155; }
  `]
})
export class AnnoSelectorComponent {
  @Input() label = 'Año';
  @Input() placeholder = 'Seleccione año';
  @Input() selectedAnno: number | null = null;
  @Input() rangoInicio = 2020;
  @Input() rangoFin = 2025;
  
  @Output() selectedAnnoChange = new EventEmitter<number | null>();

  get annoOptions(): AnnoOption[] {
    const options: AnnoOption[] = [];
    for (let i = this.rangoFin; i >= this.rangoInicio; i--) {
      options.push({ label: String(i), value: i });
    }
    return options;
  }

  onSelect(value: number | string | null): void {
    const anno = value ? Number(value) : null;
    this.selectedAnno = anno;
    this.selectedAnnoChange.emit(anno);
  }
}
