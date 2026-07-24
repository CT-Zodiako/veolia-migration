namespace Veolia.Api.Contracts.Indices;

public sealed class IndicesConsultaRequestDto
{
    public int Anno { get; set; }
    public int Mes { get; set; }
}

public sealed class IndicesCrearRequestDto
{
    public int Anno { get; set; }
    public int Mes { get; set; }
    public List<IndiceValorDto> Valores { get; set; } = new();
}

public sealed class IndicesEditarRequestDto
{
    public int Anno { get; set; }
    public int Mes { get; set; }
    public List<IndiceValorDto> Valores { get; set; } = new();
}

public sealed class IndiceValorDto
{
    public long Id { get; set; }
    public decimal Val { get; set; }
}

public sealed class IndicesEliminarRequestDto
{
    public int Anno { get; set; }
    public int Mes { get; set; }
}

public sealed class IndicesResponseDto
{
    public long IndiId { get; set; }
    public long ParaIndice20011 { get; set; }
    public int IndiAnno { get; set; }
    public int IndiMes { get; set; }
    public int IndiEstado { get; set; }
    public decimal? IndiValor { get; set; }
    public decimal? IndiMitadValor { get; set; }
    public DateTime? IndiFechaCreacion { get; set; }
    public long? UsuaUsua { get; set; }
}

public sealed class IndiceCatalogoDto
{
    public long ParaPara { get; set; }
    public string ParaNombre { get; set; } = string.Empty;
}
