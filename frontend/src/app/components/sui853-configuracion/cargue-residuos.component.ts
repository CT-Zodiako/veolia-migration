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

/** 30004 Cargue Residuos (legacy sui853/views/configuracion/residuosGenerados.vue). */
@Component({
  selector: 'app-sui853-cargue-residuos',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ButtonModule, DialogModule, PrimeTemplate],
  templateUrl: './cargue-residuos.component.html',
  styleUrl: './cargue-residuos.component.css'
})
export class CargueResiduosComponent extends Sui853DriveLoadScreen {
  readonly withMonth = false;

  protected request(apsId: number, anno: number): Observable<LegacyEnvelope<DriveLoadResult>> {
    return this.service.cargueResiduos(apsId, anno);
  }
}
