import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { CdftPageComponent } from './cdft-page.component';
import { Sui853CftService } from '../../services/sui853-cft.service';
import { TablaColumn } from '../shared/tabla-avanzada.component';

// Legacy cdft.vue formatMoney()/formatNumber(): toLocaleString("es-CO", { minimumFractionDigits: 2 }).
const legacyFormat = (value: number) => Number(value).toLocaleString('es-CO', { minimumFractionDigits: 2 });

function setup() {
  const service = { getCdft: vi.fn(() => of({ status: 'success', data: [], message: '' })) };
  const messages = { add: vi.fn() };
  TestBed.configureTestingModule({
    imports: [CdftPageComponent],
    providers: [
      { provide: Sui853CftService, useValue: service },
      { provide: MessageService, useValue: messages }
    ]
  });
  const component = TestBed.createComponent(CdftPageComponent).componentInstance;
  const col = (field: string): TablaColumn => component.columnas.find((c) => c.field === field)!;
  return { component, messages, col };
}

describe('CdftPageComponent', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const originalSecure = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
  const originalExec = document.execCommand;

  function setClipboard(clipboard: unknown, secure: boolean): void {
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
  }

  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete (navigator as unknown as Record<string, unknown>)['clipboard'];
    if (originalSecure) Object.defineProperty(window, 'isSecureContext', originalSecure);
    else delete (window as unknown as Record<string, unknown>)['isSecureContext'];
    document.execCommand = originalExec;
  });

  // C1: same number format as legacy (es-CO, min 2 decimals, default max 3).
  it('formats numeric columns like legacy cdft.vue', () => {
    const { component, col } = setup();

    expect(component.displayValue(col('valorCorriente'), 1234567.891)).toBe(legacyFormat(1234567.891));
    expect(component.displayValue(col('valorCorriente'), 1234567.891)).toBe('1.234.567,891');
    expect(component.displayValue(col('valor2018'), 1234567.5)).toBe('1.234.567,50');
    expect(component.displayValue(col('qrtz'), 0.123456)).toBe(legacyFormat(0.123456));
    expect(component.displayValue(col('qrtz'), 0.123456)).toBe('0,123');
    expect(component.displayValue(col('nombreAps'), 'APS Norte')).toBe('APS Norte');
  });

  // C2: legacy copyDisplay() copies the displayed value as a plain number and shows a toast.
  it('copies the displayed value through the Clipboard API and shows the legacy toast', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    setClipboard({ writeText }, true);
    const { component, messages, col } = setup();

    await component.copiar(col('valorCorriente'), 1234567.891);

    expect(writeText).toHaveBeenCalledWith('1234567.891');
    expect(messages.add).toHaveBeenCalledWith({ severity: 'success', summary: 'Copiado', detail: '1234567.891', life: 1800 });
  });

  // C2: cdft.vue:213-222 falls back to textarea + execCommand("copy") outside a secure context.
  it('falls back to execCommand when the Clipboard API is unavailable', async () => {
    setClipboard(undefined, false);
    let copiado: string | undefined;
    const exec = vi.fn(() => {
      copiado = (document.activeElement as HTMLTextAreaElement | null)?.value
        ?? (document.querySelector('textarea') as HTMLTextAreaElement | null)?.value;
      return true;
    });
    document.execCommand = exec as unknown as typeof document.execCommand;
    const { component, messages, col } = setup();

    await component.copiar(col('valor2018'), 1234567.5);

    expect(exec).toHaveBeenCalledWith('copy');
    expect(copiado).toBe('1234567.50');
    expect(document.querySelector('textarea')).toBeNull();
    expect(messages.add).toHaveBeenCalledWith({ severity: 'success', summary: 'Copiado', detail: '1234567.50', life: 1800 });
  });

  // Legacy only made the numeric columns clickable.
  it('does not copy non-numeric columns', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    setClipboard({ writeText }, true);
    const { component, messages, col } = setup();

    await component.copiar(col('nombreAps'), 'APS Norte');

    expect(writeText).not.toHaveBeenCalled();
    expect(messages.add).not.toHaveBeenCalled();
  });
});
