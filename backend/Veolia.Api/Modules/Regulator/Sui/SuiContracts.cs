using System.ComponentModel.DataAnnotations;

namespace Veolia.Api.Modules.Regulator.Sui;

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
}

public sealed class SuiComplementoRequest : IValidatableObject
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }

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

    // F35/F36 apply only to APS with their own relleno; legacy bound them with TO_NUMBER(null).
    public decimal? Camrers { get; init; }
    public decimal? Inccdfalt9 { get; init; }
    public decimal? Prctcrrcp { get; init; }
    public decimal? V0 { get; init; }
    public decimal? Vm { get; init; }
    public decimal? Mcrs { get; init; }
    public decimal? Icrsm { get; init; }
    public decimal? Iccrs { get; init; }
    public decimal? Frein { get; init; }
    public decimal? Capperdf { get; init; }
    public decimal? QrsMes { get; init; }
    public decimal? Dispalt9 { get; init; }
    public decimal? VlMes { get; init; }
}

public sealed record SuiDashboardResponse(IReadOnlyList<object> Filas);

public sealed record SuiFormatoResponse(string Formato, IReadOnlyList<IDictionary<string, object?>> Filas);

public sealed record SuiResumenFormatosResponse(string Formato, IReadOnlyList<object> Filas);

/// <summary>
/// Result of SUI Procesar. <c>Resultado</c> is the raw OUT string of <c>PK_SUI.fsui_fejecutasui</c>
/// (legacy read it as STRING and answered 200 whenever the block did not throw).
/// </summary>
public sealed record SuiProcesarResponse(bool Exitoso, IReadOnlyList<string> FormatosProcesados, string Estado, string? Resultado);

public sealed record SuiComplementoResponse(bool Guardado, int FilasAfectadas);

public sealed record SuiPrecheckResponse(bool PuedeProcesar, IReadOnlyList<string> Mensajes);

public sealed record SuiExistenArchivosResponse(bool Existen, int Cantidad);
