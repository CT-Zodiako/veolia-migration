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

    [Required(ErrorMessage = "El formato es obligatorio.")]
    [RegularExpression("^(F24|F35|F36)$", ErrorMessage = "El formato debe ser F24, F35 o F36.")]
    public string Formato { get; init; } = string.Empty;

    [Required(ErrorMessage = "complementoData es obligatorio.")]
    [MinLength(1, ErrorMessage = "complementoData debe tener al menos un registro.")]
    public IReadOnlyList<SuiComplementoItemRequest> ComplementoData { get; init; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ComplementoData.Any(i => i.Item <= 0))
        {
            yield return new ValidationResult("Cada item de complementoData debe tener item mayor a cero.", [nameof(ComplementoData)]);
        }
    }
}

public sealed class SuiComplementoItemRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El item de complemento debe ser mayor a cero.")]
    public int Item { get; init; }

    [Required(ErrorMessage = "El valor de complemento es obligatorio.")]
    public string Valor { get; init; } = string.Empty;
}
