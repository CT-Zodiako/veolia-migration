import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sui853Formato2TablaComponent } from '../shared/sui853-formato2-tabla.component';
import { Sui853CftService } from '../../services/sui853-cft.service';
import { Formato2Response } from '../../models/sui853-cft.model';

// cbicsmaxmin.vue (legacy) — F853S208, sin tabs, sin selector de parámetros.
// El tab SEG2 del legacy está comentado/inactivo (mismo código F853S208), no
// se migra un endpoint separado.
@Component({
  selector: 'app-cbics-maxmin-page',
  standalone: true,
  imports: [CommonModule, Sui853Formato2TablaComponent],
  templateUrl: './cbics-maxmin-page.component.html',
  styleUrl: './cbics-maxmin-page.component.css'
})
export class CbicsMaxminPageComponent implements OnInit {
  readonly data = signal<Formato2Response | null>(null);
  readonly loading = signal(false);

  constructor(private readonly service: Sui853CftService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.service.getCbicsMaxmin().subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.data.set(null);
        this.loading.set(false);
      }
    });
  }
}
