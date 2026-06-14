import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-informe-pgirs',
  standalone: true,
  imports: [CommonModule, CardModule],
  template: `
    <p-card header="Informe PGIRS">
      <div class="text-center py-5">
        <i class="pi pi-info-circle" style="font-size: 3rem; color: var(--primary-color)"></i>
        <h3 class="mt-3">Módulo en desarrollo</h3>
        <p class="text-secondary">
          El informe PGIRS requiere integración con el servicio externo de gestión de residuos.
          <br/>
          Los endpoints infoPgirs e informePgirs fueron deprecados por falta de implementación AS-IS verificable.
        </p>
      </div>
    </p-card>
  `
})
export class InformePgirsComponent {}
