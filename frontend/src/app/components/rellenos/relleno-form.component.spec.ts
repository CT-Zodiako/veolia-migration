import { TestBed } from '@angular/core/testing';
import { RellenoFormComponent } from './relleno-form.component';

describe('RellenoFormComponent', () => {
  // L3: RELL_NOMRELLENO VARCHAR2(20).
  it('limits the relleno name to 20 characters', () => {
    TestBed.configureTestingModule({ imports: [RellenoFormComponent] });
    const fixture = TestBed.createComponent(RellenoFormComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[name="rell_nomrelleno"]') as HTMLInputElement;

    expect(input.getAttribute('maxlength')).toBe('20');
  });

  // Legacy formRell.vue:154,166 stores inactive as 0 (legacy-characterization-tests S8, T14 L1).
  it('still emits the trimmed relleno with estado 1/0 like legacy', () => {
    TestBed.configureTestingModule({ imports: [RellenoFormComponent] });
    const component = TestBed.createComponent(RellenoFormComponent).componentInstance;
    let emitted: unknown;
    component.save.subscribe((payload) => (emitted = payload));
    component.rell_nomrelleno = ' Doña Juana ';
    component.rell_descripcion = ' Relleno ';
    component.rell_estado = false;
    component.onSubmit();

    expect(emitted).toEqual({ rell_nomrelleno: 'Doña Juana', rell_descripcion: 'Relleno', rell_estado: 0, rell_propio: 0, rell_regional: 0, rell_nusd: null });
  });
});
