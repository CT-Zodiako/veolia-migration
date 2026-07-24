using System.ComponentModel.DataAnnotations;

namespace Veolia.Api.Contracts.Requests;

public sealed class SuiDashboardRequest
{
    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }
}

public sealed class SuiConsultaRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }
}

public sealed class SuiResumenRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }
}

public sealed class SuiProcesarRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "El usuario es obligatorio.")]
    public int Usuario { get; init; }
}

public sealed class SuiComplementoRequest : IValidatableObject
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "El usuario es obligatorio.")]
    public int Usuario { get; init; }

    [Required(ErrorMessage = "Filas es obligatorio.")]
    [MinLength(1, ErrorMessage = "Filas debe tener al menos un registro.")]
    public IReadOnlyList<SuiComplementoFilaRequest> Filas { get; init; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Filas.Any(f => f.Aps <= 0))
        {
            yield return new ValidationResult("Cada fila debe tener un APS válido.", [nameof(Filas)]);
        }
    }
}

public sealed class SuiComplementoFilaRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS de la fila es obligatorio.")]
    public int Aps { get; init; }

    public decimal? Det { get; init; }
    public decimal? F1et { get; init; }
    public decimal? Cpeet { get; init; }
    public decimal? Prtzet { get; init; }
    public decimal? Ceg { get; init; }

    [Required(ErrorMessage = "Camrers es obligatorio.")]
    public decimal Camrers { get; init; }

    [Required(ErrorMessage = "Inccdfalt9 es obligatorio.")]
    public decimal Inccdfalt9 { get; init; }

    [Required(ErrorMessage = "Prctcrrcp es obligatorio.")]
    public decimal Prctcrrcp { get; init; }

    [Required(ErrorMessage = "V0 es obligatorio.")]
    public decimal V0 { get; init; }

    [Required(ErrorMessage = "Vm es obligatorio.")]
    public decimal Vm { get; init; }

    [Required(ErrorMessage = "Mcrs es obligatorio.")]
    public decimal Mcrs { get; init; }

    [Required(ErrorMessage = "Icrsm es obligatorio.")]
    public decimal Icrsm { get; init; }

    [Required(ErrorMessage = "Iccrs es obligatorio.")]
    public decimal Iccrs { get; init; }

    [Required(ErrorMessage = "Frein es obligatorio.")]
    public decimal Frein { get; init; }

    [Required(ErrorMessage = "Capperdf es obligatorio.")]
    public decimal Capperdf { get; init; }

    [Required(ErrorMessage = "QrsMes es obligatorio.")]
    public decimal QrsMes { get; init; }

    [Required(ErrorMessage = "Dispalt9 es obligatorio.")]
    public decimal Dispalt9 { get; init; }

    [Required(ErrorMessage = "VlMes es obligatorio.")]
    public decimal VlMes { get; init; }
}
