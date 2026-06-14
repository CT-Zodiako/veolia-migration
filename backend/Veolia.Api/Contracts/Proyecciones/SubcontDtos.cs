namespace Veolia.Api.Contracts.Proyecciones;

public sealed class SubcontConsultaRequest
{
    public long ApsaId { get; set; }
    public long ProyId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
}

public sealed class SubcontUpsertRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public List<SubcontItem> Items { get; set; } = new();
}

public sealed class SubcontItem
{
    public long ClasClase { get; set; }
    public decimal? SucoValor { get; set; }
}
