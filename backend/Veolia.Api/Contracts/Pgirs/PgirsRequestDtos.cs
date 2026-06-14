namespace Veolia.Api.Contracts.Pgirs;

public sealed class ApsRequestDto
{
    public long ApsId { get; set; }
}

public sealed class VariablesQueryRequestDto
{
    public long ApsId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
}

public sealed class EditarVariableDto
{
    public long ApsId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public int CodVariable { get; set; }
    public decimal Valor { get; set; }
    public string? Frecuencia { get; set; }
}

public sealed class EditarVariablesRequestDto
{
    public List<EditarVariableDto> Variables { get; set; } = new();
}

public sealed class NuevoVariablesRequestDto
{
    public long ApsId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal? Lbl { get; set; }
    public string? LblFrecuencia { get; set; }
    public decimal? Cesped { get; set; }
    public string? CespedFrecuencia { get; set; }
    public decimal? Poda { get; set; }
    public string? PodaFrecuencia { get; set; }
    public decimal? Lavado { get; set; }
    public string? LavadoFrecuencia { get; set; }
    public decimal? Playas { get; set; }
    public string? PlayasFrecuencia { get; set; }
    public decimal? Inscestas { get; set; }
    public string? InscestasFrecuencia { get; set; }
    public decimal? Mancestas { get; set; }
    public string? MancestasFrecuencia { get; set; }
}
