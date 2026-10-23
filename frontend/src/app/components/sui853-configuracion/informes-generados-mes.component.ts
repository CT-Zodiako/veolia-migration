import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InformesGeneradosComponent } from './informes-generados.component';

/**
 * 30007 Cargue Facturación Mes (legacy sui853/views/configuracion/informesGeneradosMes.vue). Same flow as 30005 plus
 * the month, which is now forwarded to the Drive filter (legacy collected it but the harvest ignored it).
 */
@Component({
  selector: 'app-sui853-informes-generados-mes',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ButtonModule, DialogModule, PrimeTemplate],
  templateUrl: './informes-generados.component.html',
  styleUrl: './informes-generados.component.css'
})
export class InformesGeneradosMesComponent extends InformesGeneradosComponent {
  override readonly withMonth: boolean = true;
}
