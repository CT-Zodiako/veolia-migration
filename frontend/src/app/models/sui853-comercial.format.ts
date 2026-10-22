// Legacy display/export helpers shared by SUI853 Comercial (tgenComercial.vue) and
// Operaciones Residuos Generados (operaciones/residuosGenerados.vue).

export type LegacyRow = Record<string, unknown>;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const ORACLE_MONTHS: Record<string, string> = {
  JAN: '01', ENE: '01', FEB: '02', MAR: '03', APR: '04', ABR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', AGO: '08', SEP: '09', SET: '09', OCT: '10', NOV: '11', DEC: '12', DIC: '12'
};

/** Legacy `formatNumber` (tgenComercial.vue): fixed decimals with "." and no grouping.
 *  The API sends Oracle numbers as "."-decimal strings, so only "1.234,5"-style input is
 *  treated as latam (residuosGenerados.vue stripped every "." because it received numbers). */
export function legacyNumber(value: unknown, decimals: number): unknown {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return value.toFixed(decimals);
  let raw = String(value).trim();
  if (raw.includes(',') && /\d,\d+/.test(raw)) raw = raw.replace(/\./g, '').replace(',', '.');
  const num = Number(raw);
  return Number.isFinite(num) ? num.toFixed(decimals) : value;
}

/** Legacy `formatDMYFast`: despite its name it renders MM-DD-YYYY. */
export function legacyDate(value: unknown): unknown {
  if (!value || typeof value !== 'string') return value || '';
  if (value.includes('T')) {
    const [y, m, d] = value.split('T')[0].split('-');
    return `${m}-${d}-${y}`;
  }
  const oracle = /^(\d{2})-([A-Za-z]{3})-(\d{2})$/.exec(value);
  if (oracle) {
    const [, dd, mon, yy] = oracle;
    const mm = ORACLE_MONTHS[mon.toUpperCase()];
    if (!mm) return value;
    const year = Number(yy);
    return `${mm}-${dd}-${year <= 50 ? 2000 + year : 1900 + year}`;
  }
  if (value.length >= 10 && value[4] === '-' && value[7] === '-') {
    const [y, m, d] = value.slice(0, 10).split('-');
    return `${m}-${d}-${y}`;
  }
  return value;
}

/** Legacy `formatHM`: HH:MM without seconds; also accepts HHMM. */
export function legacyHourMinute(value: unknown): string {
  if (!value) return '';
  const str = String(value).trim();
  if (str.includes(':')) {
    const [hh = '00', mm = '00'] = str.split(':');
    return `${(hh || '00').padStart(2, '0')}:${(mm || '00').padStart(2, '0')}`;
  }
  if (/^\d{3,4}$/.test(str)) {
    const padded = str.padStart(4, '0');
    return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
  }
  return str;
}

/** Legacy `formatInt` (TIP_SITIO): "1.000" -> "1", "1.234,00" -> "1234", "2" -> "2". */
export function legacyInteger(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const s = String(value).trim();
  if (/^\d+\.\d{3}$/.test(s)) return s.split('.')[0];
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? String(Math.trunc(n)) : s;
}

/** Legacy per-column filters: trimmed, case-insensitive EXACT match (despite the "Contiene"
 *  placeholder); date fields also match their formatted value. */
export function legacyFilterRows(rows: LegacyRow[], filters: Record<string, string>, dateFields: string[] = []): LegacyRow[] {
  return rows.filter(row => Object.entries(filters).every(([field, filter]) => {
    const needle = String(filter ?? '').trim().toLowerCase();
    if (!needle) return true;
    const cell = row[field];
    if (cell === null || cell === undefined) return false;
    const raw = String(cell).trim().toLowerCase();
    if (dateFields.includes(field)) return String(legacyDate(String(cell))).trim().toLowerCase() === needle || raw === needle;
    return raw === needle;
  }));
}

/** Legacy `resumenFilteredData`: rows whose APS (name), ANNO and MES match the selection.
 *  The API sends ANNO/MES as strings, so they are compared numerically. */
export function legacySummaryFilter(rows: LegacyRow[], apsName: string | null, year: number | null, month: number | null): LegacyRow[] {
  const sameNumber = (cell: unknown, selected: number) => cell !== null && cell !== undefined && String(cell).trim() !== '' && Number(String(cell).trim()) === selected;
  return rows.filter(row => {
    if (apsName && String(row['APS'] ?? '').trim() !== apsName.trim()) return false;
    if (year && !sameNumber(row['ANNO'], year)) return false;
    if (month && !sameNumber(row['MES'], month)) return false;
    return true;
  });
}

/** Legacy `exportFileName`: "APS mes año", or "archivo" while the selection is incomplete. */
export function legacyExportFileName(apsName: string | null, month: number | null, year: number | null): string {
  const mes = month ? MESES[month - 1] ?? '' : '';
  return apsName && mes && year ? `${apsName} ${mes} ${year}` : 'archivo';
}
