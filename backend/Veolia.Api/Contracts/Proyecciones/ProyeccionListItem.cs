namespace Veolia.Api.Contracts.Proyecciones;

public sealed class ProyeccionListItem
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public string? ApsaNombre { get; set; }
    public string ProyNombre { get; set; } = string.Empty;
    public string? ProyDescripcion { get; set; }
    public int ProyTipo100 { get; set; }
    public string? ProyTipoNombre { get; set; }
    public int ProyAnnoDes { get; set; }
    public int ProyMesDes { get; set; }
    public int ProyAnnoHas { get; set; }
    public int ProyMesHas { get; set; }
    public int ProyEstado { get; set; }
    public DateTime? ProyFecha { get; set; }
    public string? SisuCorreo { get; set; }
}
