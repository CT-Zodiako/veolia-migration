using System.ComponentModel.DataAnnotations;

namespace Veolia.Api.Contracts.SubCont;

public sealed record SubContConsultaRequest(
    [Required] int Aps,
    [Required] int Anno,
    [Required] int Mes
);

public sealed record SubContValorItem(
    int Id,
    decimal Val
);

public sealed record SubContCrearRequest(
    [Required] int Aps,
    [Required] int Anno,
    [Required] int Mes,
    [Required] List<SubContValorItem> Valores
);

public sealed record SubContEditarRequest(
    [Required] int Aps,
    [Required] int Anno,
    [Required] int Mes,
    [Required] List<SubContValorItem> Valores
);

public class SubContItemResponse
{
    public long SucoId { get; set; }
    public int ApsaId { get; set; }
    public int EmprEmpr { get; set; }
    public int DiviDivi { get; set; }
    public int ClasClase { get; set; }
    public int SucoAnno { get; set; }
    public int SucoMes { get; set; }
    public int ParaTippred20016 { get; set; }
    public decimal SucoValor { get; set; }
    public int SucoEstado { get; set; }
    public DateTime SucoFechacreacion { get; set; }
    public int UsuaUsua { get; set; }
}

public class SubContApsResponse
{
    public int ApsaId { get; set; }
    public string ApsaNombre { get; set; } = string.Empty;
}
