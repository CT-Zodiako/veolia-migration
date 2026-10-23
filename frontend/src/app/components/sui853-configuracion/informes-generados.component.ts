import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { Sui853DriveLoadScreen } from '../../models/sui853-configuracion-drive-load';
import { DriveLoadResult, LegacyEnvelope } from '../../services/sui853-configuracion.service';

/** 30005 Cargue Facturación (legacy sui853/views/configuracion/informesGenerados.vue). */
@Component({
  selector: 'app-sui853-informes-generados',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ButtonModule, DialogModule, PrimeTemplate],
  templateUrl: './informes-generados.component.html',
  styleUrl: './informes-generados.component.css'
})
export class InformesGeneradosComponent extends Sui853DriveLoadScreen {
  readonly withMonth: boolean = false;

  protected request(apsId: number, anno: number, mes: string | null): Observable<LegacyEnvelope<DriveLoadResult>> {
    return this.service.cargueFacturacion(apsId, anno, mes);
  }
}
