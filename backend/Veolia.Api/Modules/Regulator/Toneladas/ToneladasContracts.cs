using System.ComponentModel.DataAnnotations;

namespace Veolia.Api.Modules.Regulator.Toneladas;

public sealed class ToneladasRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }
}

public sealed class QrtResponse
{
    public decimal Aps { get; set; }
    public decimal Empresa { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
}

public sealed class QaResponse
{
    public decimal Aps { get; set; }
    public decimal Empresa { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal Valor { get; set; }
}

public sealed class DetalleResponse
{
    public decimal Aps { get; set; }
    public decimal Empresa { get; set; }
    public decimal Mpio { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
}
