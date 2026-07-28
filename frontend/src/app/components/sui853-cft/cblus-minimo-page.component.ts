import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sui853Formato2TablaComponent } from '../shared/sui853-formato2-tabla.component';
import { Sui853CftService } from '../../services/sui853-cft.service';
import { Formato2Response } from '../../models/sui853-cft.model';

// cblusMinimo.vue (legacy) — F853S202, sin tabs, sin selector de parámetros.
@Component({
  selector: 'app-cblus-minimo-page',
  standalone: true,
  imports: [CommonModule, Sui853Formato2TablaComponent],
  templateUrl: './cblus-minimo-page.component.html',
  styleUrl: './cblus-minimo-page.component.css'
})
export class CblusMinimoPageComponent implements OnInit {
  readonly data = signal<Formato2Response | null>(null);
  readonly loading = signal(false);

  constructor(private readonly service: Sui853CftService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.service.getCblusMinimo().subscribe({
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
