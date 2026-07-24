namespace Veolia.Api.Infrastructure.GoogleDrive;

/// <summary>
/// Resultado de leer una pestaña de un Google Sheet: la primera fila se toma como
/// encabezados (columnas dinámicas, no un esquema fijo) y el resto como filas clave/valor.
/// </summary>
public sealed class GoogleSheetTabData
{
    public required string SheetTitle { get; init; }
    public IReadOnlyList<string> Columns { get; init; } = Array.Empty<string>();
    public IReadOnlyList<Dictionary<string, object?>> Rows { get; init; } = Array.Empty<Dictionary<string, object?>>();
    public string? Error { get; init; }
}
