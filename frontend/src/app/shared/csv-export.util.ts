export interface CsvColumn {
  field: string;
  header: string;
}

export function exportarCsv(columnas: CsvColumn[], rows: Record<string, unknown>[], filename: string): void {
  const separator = ';';
  const escapar = (valor: unknown): string => {
    const texto = valor === null || valor === undefined ? '' : String(valor).replace(/"/g, '""');
    return `"${texto}"`;
  };

  const header = columnas.map(col => escapar(col.header)).join(separator);
  const body = rows.map(row => columnas.map(col => escapar(row[col.field])).join(separator)).join('\n');

  const csv = header + '\n' + body;
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `${filename}.csv`);
  link.click();
  document.body.removeChild(link);
}
