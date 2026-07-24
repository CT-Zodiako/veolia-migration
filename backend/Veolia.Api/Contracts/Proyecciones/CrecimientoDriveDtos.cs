namespace Veolia.Api.Contracts.Proyecciones;

public sealed class CrecimientoDriveRequest
{
    public long ApsaId { get; set; }
}

public sealed class CrecimientoDriveConfig
{
    public string IdArchivo { get; set; } = string.Empty;
    public string ListaHojas { get; set; } = string.Empty;
}

public sealed class CrecimientoDriveTabResponse
{
    public string SheetTitle { get; set; } = string.Empty;
    public IReadOnlyList<string> Columns { get; set; } = Array.Empty<string>();
    public IReadOnlyList<Dictionary<string, object?>> Rows { get; set; } = Array.Empty<Dictionary<string, object?>>();
    public string? Error { get; set; }
}
