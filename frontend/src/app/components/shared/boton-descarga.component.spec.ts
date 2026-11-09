import { TestBed } from '@angular/core/testing';
import { BotonDescargaComponent, TipoArchivoDescarga } from './boton-descarga.component';

// No legacy equivalent: legacy linked each file with a bare <a> ("⚡ Explicación formatos y formularios") or a
// PrimeNG button ("Descargar Plano Guía"). These tests pin the standard download button of
// design/descargas-estandar/01-boton-secundario.html.

function render(inputs: Partial<Record<'href' | 'nombreArchivo' | 'etiqueta' | 'tipo' | 'meta', string>> = {}) {
  const fixture = TestBed.createComponent(BotonDescargaComponent);
  const valores = {
    href: 'assets/layout/planos/plano_propio_mensual.csv',
    nombreArchivo: 'plano_propio_mensual.csv',
    etiqueta: 'Descargar plantilla',
    tipo: 'csv',
    meta: 'CSV · < 1 KB · 13 columnas',
    ...inputs
  };
  Object.entries(valores).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, link: el.querySelector('a') as HTMLAnchorElement };
}

describe('BotonDescargaComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [BotonDescargaComponent] }));

  it('renders a link with the file URL, the real file name as download, the label and the meta line', () => {
    const { el, link } = render();
    expect(link.getAttribute('href')).toBe('assets/layout/planos/plano_propio_mensual.csv');
    expect(link.getAttribute('download')).toBe('plano_propio_mensual.csv');
    expect(link.querySelector('.lbl')!.textContent!.trim()).toBe('Descargar plantilla');
    const meta = el.querySelector('.meta') as HTMLElement;
    expect(meta.textContent!.trim()).toBe('CSV · < 1 KB · 13 columnas');
    expect(link.contains(meta)).toBe(true);
  });

  it('links the meta line as the accessible description with a unique id per instance', () => {
    const a = render().link;
    const b = render({ meta: 'XLSX · 224 KB' }).link;
    const idA = a.getAttribute('aria-describedby')!;
    expect(idA).toBeTruthy();
    expect(a.querySelector('.meta')!.id).toBe(idA);
    expect(b.getAttribute('aria-describedby')).not.toBe(idA);
  });

  it('without meta renders no meta line and no aria-describedby', () => {
    const { el, link } = render({ meta: '' });
    expect(el.querySelector('.meta')).toBeNull();
    expect(link.hasAttribute('aria-describedby')).toBe(false);
  });

  const casos: Array<[TipoArchivoDescarga, string, 'hoja' | 'otro']> = [
    ['xlsx', 'XLSX', 'hoja'],
    ['csv', 'CSV', 'hoja'],
    ['pdf', 'PDF', 'otro'],
    ['docx', 'DOCX', 'otro'],
    ['zip', 'ZIP', 'otro']
  ];
  for (const [tipo, texto, color] of casos) {
    it(`${tipo}: the decorative icon writes ${texto} on its band, ${color === 'hoja' ? 'green' : 'gray'}`, () => {
      const { link } = render({ tipo });
      const svg = link.querySelector('svg.ficon') as SVGElement;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelector('text')!.textContent!.trim()).toBe(texto);
      expect(svg.classList.contains('ficon-hoja')).toBe(color === 'hoja');
      expect(svg.classList.contains('ficon-otro')).toBe(color === 'otro');
    });
  }

  it('shows no emoji and never the extension or size inside the label', () => {
    const { link } = render({ etiqueta: 'Descargar explicación de formatos', tipo: 'xlsx', meta: 'XLSX · 224 KB' });
    expect(link.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(link.querySelector('.lbl')!.textContent).not.toMatch(/xlsx|KB/i);
  });

  it('is reachable by keyboard and takes focus', () => {
    const { link } = render();
    expect(link.tabIndex).toBe(0);
    link.focus();
    expect(document.activeElement).toBe(link);
  });
});
