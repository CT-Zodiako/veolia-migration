import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CrearRellenoRequest, RellenoItem } from '../../models/rellenos.models';

@Component({
  selector: 'app-relleno-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './relleno-form.component.html',
  styleUrls: ['./relleno-form.component.css']
})
export class RellenoFormComponent implements OnChanges {
  @Input() relleno: RellenoItem | null = null;
  @Input() loading = false;

  @Output() save = new EventEmitter<CrearRellenoRequest>();
  @Output() cancel = new EventEmitter<void>();

  rell_nomrelleno = '';
  rell_descripcion = '';
  rell_estado = true;
  rell_propio = false;
  rell_regional = false;
  rell_nusd = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['relleno']) {
      this.syncForm();
    }
  }

  isEditing(): boolean {
    return !!this.relleno?.RELL_ID;
  }

  onSubmit(): void {
    if (!this.rell_nomrelleno.trim() || !this.rell_descripcion.trim()) {
      return;
    }

    this.save.emit({
      rell_nomrelleno: this.rell_nomrelleno.trim(),
      rell_descripcion: this.rell_descripcion.trim(),
      rell_estado: this.rell_estado ? 1 : 2,
      rell_propio: this.rell_propio ? 1 : 0,
      rell_regional: this.rell_regional ? 1 : 0,
      rell_nusd: this.rell_nusd?.trim() || null
    });
  }

  private syncForm(): void {
    if (!this.relleno) {
      this.rell_nomrelleno = '';
      this.rell_descripcion = '';
      this.rell_estado = true;
      this.rell_propio = false;
      this.rell_regional = false;
      this.rell_nusd = '';
      return;
    }

    this.rell_nomrelleno = this.relleno.RELL_NOMRELLENO || '';
    this.rell_descripcion = this.relleno.RELL_DESCRIPCION || '';
    this.rell_estado = (this.relleno.RELL_ESTADO ?? 1) === 1;
    this.rell_propio = (this.relleno.RELL_PROPIO ?? 0) === 1;
    this.rell_regional = (this.relleno.RELL_REGIONAL ?? 0) === 1;
    this.rell_nusd = this.relleno.RELL_NUSD || '';
  }
}
