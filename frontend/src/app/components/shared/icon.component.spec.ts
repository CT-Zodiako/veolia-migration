import { TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

// No legacy equivalent: legacy menus used PrimeIcons classes (front-tarificador/src/service/MenuService.js icon "pi pi-fw ...").
// These tests pin the current behavior of the self-hosted emoji icon.

function render(name: string, size?: number) {
  TestBed.configureTestingModule({ imports: [IconComponent] });
  const fixture = TestBed.createComponent(IconComponent);
  fixture.componentRef.setInput('name', name);
  if (size !== undefined) fixture.componentRef.setInput('size', size);
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('img') as HTMLImageElement;
}

describe('IconComponent (no legacy equivalent — pinned)', () => {
  it('renders emoji/<name>.svg with the name as alt and 18px by default', () => {
    const img = render('home');
    expect(img.getAttribute('src')).toBe('emoji/home.svg');
    expect(img.alt).toBe('home');
    expect(img.style.width).toBe('18px');
    expect(img.style.height).toBe('18px');
  });

  it('applies the requested size', () => {
    const img = render('users', 15);
    expect(img.style.width).toBe('15px');
    expect(img.style.height).toBe('15px');
  });

  it('falls back to the folder icon when the image fails to load', () => {
    const img = render('no-existe');
    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('src')).toBe('emoji/folder.svg');
  });
});
