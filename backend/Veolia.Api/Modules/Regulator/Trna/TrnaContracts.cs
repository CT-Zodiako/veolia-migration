using System.ComponentModel.DataAnnotations;

namespace Veolia.Api.Modules.Regulator.Trna;

public sealed class TrnaRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }
}

public sealed class TrnaResponse
{
    public decimal ApsaId { get; set; }
    public decimal EmprEmpr { get; set; }
    public decimal DiviDivi { get; set; }
    public string ApsaNomaps { get; set; } = string.Empty;
    public string FaprNombre { get; set; } = string.Empty;
    public decimal FaprCodigo { get; set; }
    public decimal FaprValor { get; set; }
    public decimal Trna { get; set; }
}
