namespace Veolia.Api.Modules.Reliquidaciones.Contracts;

public sealed class ReliquidacionDto
{
    public long RelqId { get; set; }
    public long ApsaId { get; set; }
    public string RelqNombre { get; set; } = string.Empty;
    public string? RelqDescripcion { get; set; }
    public string RelqDesde { get; set; } = string.Empty;
    public string RelqHasta { get; set; } = string.Empty;
    public string RelqEstado { get; set; } = string.Empty;
    public long? RelqSolicita { get; set; }
    public long? RelqAprueba { get; set; }
    public DateTime? RelqFecha { get; set; }
}
