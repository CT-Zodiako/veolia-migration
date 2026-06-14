import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { EmpresaItem, EmpresaMutationPayload } from '../../services/empresas.service';

@Component({
  selector: 'app-empresa-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './empresa-form.component.html',
  styleUrls: ['./empresa-form.component.css']
})
export class EmpresaFormComponent implements OnChanges {
  @Input() empresa: EmpresaItem | null = null;
  @Input() loading = false;

  @Output() save = new EventEmitter<EmpresaMutationPayload>();
  @Output() cancel = new EventEmitter<void>();

  nombre = '';
  estado = true;
  propia = true;
  nuap = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['empresa']) {
      this.syncForm();
    }
  }

  isEditing(): boolean {
    return !!this.empresa?.EMPR_EMPR;
  }

  onSubmit(): void {
    const normalizedNombre = this.capitalizeFirstLetter(this.nombre.trim());
    if (!normalizedNombre) {
      return;
    }

    this.save.emit({
      nombre: normalizedNombre,
      estado: this.estado ? 1 : 0,
      propia: this.propia ? 1 : 0,
      nuap: this.nuap.trim() || null
    });
  }

  private syncForm(): void {
    if (!this.empresa) {
      this.nombre = '';
      this.estado = true;
      this.propia = true;
      this.nuap = '';
      return;
    }

    this.nombre = this.empresa.EMPR_NOMBRE || '';
    this.estado = Number(this.empresa.EMPR_ESTADO ?? 1) === 1;
    this.propia = Number(this.empresa.EMPR_PROPIA ?? 1) === 1;
    this.nuap = this.empresa.EMPR_NUAP ?? '';
  }

  private capitalizeFirstLetter(value: string): string {
    if (!value) {
      return value;
    }

    return `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;
  }
}
