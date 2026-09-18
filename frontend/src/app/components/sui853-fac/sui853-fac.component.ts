import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { Sui853Formato2TablaComponent } from '../shared/sui853-formato2-tabla.component';
import { Sui853FacService } from '../../services/sui853-fac.service';
import { FacPayload, facTableData } from '../../models/sui853-fac.models';

@Component({
  selector: 'app-sui853-fac',
  standalone: true,
  imports: [CommonModule, TabsModule, ButtonModule, Sui853Formato2TablaComponent],
  templateUrl: './sui853-fac.component.html',
  styleUrl: './sui853-fac.component.css'
})
export class Sui853FacComponent implements OnInit {
  private readonly service = inject(Sui853FacService);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly data = signal<FacPayload | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.service.load().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        try {
          if (response.status === 'error' || response.status === false) throw new Error();
          this.data.set(facTableData(response.data));
        } catch { this.fail(); }
      },
      error: () => this.fail()
    });
  }

  private fail(): void {
    this.data.set(null);
    this.error.set('No se pudo cargar la información de FAC.');
  }
}
