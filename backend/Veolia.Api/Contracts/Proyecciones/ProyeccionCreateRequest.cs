namespace Veolia.Api.Contracts.Proyecciones;

public sealed class ProyeccionCreateRequest
{
    public long ApsaId { get; set; }
    public string ProyNombre { get; set; } = string.Empty;
    public int ProyTipo100 { get; set; } = 1;
    public int ProyAnnoDes { get; set; }
    public int ProyMesDes { get; set; }
    public int ProyAnnoHas { get; set; }
    public int ProyMesHas { get; set; }
}
