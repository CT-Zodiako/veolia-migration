import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsConfigItem, ApsMutationPayload } from '../../services/aps.service';

@Component({
  selector: 'app-aps-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, RadioButtonModule],
  templateUrl: './aps-form.component.html',
  styleUrls: ['./aps-form.component.css']
})
export class ApsFormComponent implements OnChanges {
  @Input() aps: ApsConfigItem | null = null;
  @Input() loading = false;

  @Output() save = new EventEmitter<ApsMutationPayload>();
  @Output() cancel = new EventEmitter<void>();

  // Legacy formAps.vue: Resolución radio 720/351, default 720.
  readonly resolucionOptions = [720, 351];
  readonly resolucionDefault = 720;
  nombre = '';
  idsui: string | null = null;
  resolucion: number | null = 720;
  propio = false;
  relleno = false;
  estado = true;
  iat = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aps']) {
      this.syncForm();
    }
  }

  isEditing(): boolean {
    return !!this.aps?.APSA_ID;
  }

  onSubmit(): void {
    if (!this.nombre.trim() || !this.resolucionOptions.includes(Number(this.resolucion))) {
      return;
    }

    this.save.emit({
      nombre: this.nombre.trim(),
      idsui: this.idsui,
      resolucion: Number(this.resolucion),
      propio: this.propio ? 1 : 0,
      relleno: this.relleno ? 1 : 0,
      estado: this.estado ? 1 : 0,
      iat: this.iat ? 1 : 0
    });
  }

  private syncForm(): void {
    if (!this.aps) {
      this.nombre = '';
      this.idsui = null;
      this.resolucion = this.resolucionDefault;
      this.propio = false;
      this.relleno = false;
      this.estado = true;
      this.iat = false;
      return;
    }

    this.nombre = this.aps.APSA_NOMAPS || '';
    this.idsui = this.aps.APSA_IDSUI ?? null;
    this.resolucion = this.aps.APSA_RESOLUCION == null ? null : Number(this.aps.APSA_RESOLUCION);
    this.propio = (this.aps.APSA_PROPIO ?? 0) === 1;
    this.relleno = (this.aps.APSA_SOLORELL ?? 0) === 1;
    this.estado = (this.aps.APSA_ESTADO ?? 1) === 1;
    this.iat = (this.aps.APSA_VIAT ?? 0) === 1;
  }
}
