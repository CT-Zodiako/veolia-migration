export function exportarJson(payload: unknown, filename: string): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `${filename}.json`);
  link.click();
  document.body.removeChild(link);
}
