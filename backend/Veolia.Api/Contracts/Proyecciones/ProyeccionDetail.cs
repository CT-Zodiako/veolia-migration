namespace Veolia.Api.Contracts.Proyecciones;

public sealed class ProyeccionDetail
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public string ProyNombre { get; set; } = string.Empty;
    public int ProyTipo100 { get; set; }
    public int ProyAnnoDes { get; set; }
    public int ProyMesDes { get; set; }
    public int ProyAnnoHas { get; set; }
    public int ProyMesHas { get; set; }
    public int ProyEstado { get; set; }
    public long? UsuaUsua { get; set; }
    public DateTime? ProyFecha { get; set; }
}
