namespace Veolia.Api.Contracts.Proyecciones;

public sealed class LineaTiempoUpsertRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public bool IsNew { get; set; }
    public List<LineaTiempoRow> Rows { get; set; } = new();
}
