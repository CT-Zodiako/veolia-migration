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
    public string? ApsaNomaps { get; set; }
    public string? MailSolicita { get; set; }
    public string? MailAprueba { get; set; }
    public long? RelqSolicita { get; set; }
    public long? RelqAprueba { get; set; }
    public DateTime? RelqFecha { get; set; }
    public long? RelqIdAtt { get; set; }
}
