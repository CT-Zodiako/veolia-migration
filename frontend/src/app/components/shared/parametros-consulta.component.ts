import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsSelectorComponent } from './aps-selector.component';
import { AnnoSelectorComponent } from './anno-selector.component';
import { MesSelectorComponent } from './mes-selector.component';

@Component({
  selector: 'app-parametros-consulta',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent],
  template: `
    <ng-container *ngIf="wrapInCard; else contenido">
      <p-card [header]="headerCard" styleClass="parametros-consulta-card">
        <ng-container *ngTemplateOutlet="contenido"></ng-container>
      </p-card>
    </ng-container>

    <ng-template #contenido>
      <div class="parametros-row">
        <app-aps-selector
          *ngIf="mostrarAps"
          [selectedAps]="aps"
          (selectedApsChange)="onApsChange($event)"
          label="APS"
        ></app-aps-selector>

        <app-anno-selector
          [selectedAnno]="anno"
          (selectedAnnoChange)="onAnnoChange($event)"
          label="Año"
        ></app-anno-selector>

        <app-mes-selector
          [selectedMes]="mes"
          (selectedMesChange)="onMesChange($event)"
          label="Mes"
        ></app-mes-selector>

        <div class="boton-wrapper" *ngIf="mostrarBoton && !autoConsultar">
          <label class="label-spacer">&nbsp;</label>
          <p-button
            icon="pi pi-search"
            [label]="labelBoton"
            [loading]="loading"
            (click)="consultar.emit()"
          ></p-button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .parametros-consulta-card { margin-bottom: 24px; }
    .parametros-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: flex-start;
    }
    app-aps-selector {
      flex: 0 1 220px;
      min-width: 180px;
    }
    app-anno-selector,
    app-mes-selector {
      flex: 0 1 130px;
      min-width: 110px;
    }
    .boton-wrapper {
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
    }
    .label-spacer {
      display: block;
      font-size: 13px;
      margin-bottom: 4px;
      line-height: 1;
      visibility: hidden;
    }
  `]
})
export class ParametrosConsultaComponent {
  @Input() aps: number | null = null;
  @Output() apsChange = new EventEmitter<number | null>();

  @Input() anno: number | null = null;
  @Output() annoChange = new EventEmitter<number | null>();

  @Input() mes: number | null = null;
  @Output() mesChange = new EventEmitter<number | null>();

  @Input() mostrarAps = true;
  @Input() mostrarBoton = true;
  @Input() autoConsultar = false;
  @Input() labelBoton = 'Consultar';
  @Input() loading = false;
  @Input() wrapInCard = true;
  @Input() headerCard = 'Parámetros de Consulta';

  @Output() consultar = new EventEmitter<void>();
  @Output() parametrosIncompletos = new EventEmitter<void>();

  onApsChange(value: number | null): void {
    this.aps = value;
    this.apsChange.emit(value);
    this.evaluarCompletos();
  }

  onAnnoChange(value: number | null): void {
    this.anno = value;
    this.annoChange.emit(value);
    this.evaluarCompletos();
  }

  onMesChange(value: number | null): void {
    this.mes = value;
    this.mesChange.emit(value);
    this.evaluarCompletos();
  }

  private evaluarCompletos(): void {
    const apsListo = !this.mostrarAps || this.aps !== null;
    const completos = apsListo && this.anno !== null && this.mes !== null;

    if (completos) {
      if (this.autoConsultar) {
        this.consultar.emit();
      }
    } else {
      this.parametrosIncompletos.emit();
    }
  }
}
