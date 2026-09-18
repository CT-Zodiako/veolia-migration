using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Veolia.Api.Modules.Sui853.Configuracion;

public sealed class FormularioRow : IValidatableObject
{
    [JsonPropertyName("FORMATO"), Required] public string FORMATO { get; set; } = "";
    [JsonPropertyName("SECCION"), Required] public string SECCION { get; set; } = "";
    [JsonPropertyName("FIELD"), Required] public string FIELD { get; set; } = "";
    [JsonPropertyName("HEADER_TXT"), Required] public string HEADER_TXT { get; set; } = "";
    [JsonPropertyName("BACKGROUND_COLOR"), Required, RegularExpression("^(R|G|B)$")] public string BACKGROUND_COLOR { get; set; } = "";
    [JsonPropertyName("FILTER_FLAG"), Required, RegularExpression("^(S|N)$")] public string FILTER_FLAG { get; set; } = "";
    [JsonPropertyName("FORMATO_DATO"), Required, RegularExpression("^(texto|numero|fecha|porcentaje)$")] public string FORMATO_DATO { get; set; } = "";
    [JsonPropertyName("DECIMALES"), Range(0, 6)] public int? DECIMALES { get; set; }
    [JsonPropertyName("ALINEACION"), Required, RegularExpression("^(izq|centro|der)$")] public string ALINEACION { get; set; } = "";
    [JsonPropertyName("TOOLTIP")] public string? TOOLTIP { get; set; }
    [JsonPropertyName("MOSTRAR_HEADER"), Required, RegularExpression("^(S|N)$")] public string MOSTRAR_HEADER { get; set; } = "";
    [JsonPropertyName("INCLUIR_DATA"), Required, RegularExpression("^(S|N)$")] public string INCLUIR_DATA { get; set; } = "";
    [JsonPropertyName("ORDEN_HEADER"), Required, Range(0, int.MaxValue)] public int? ORDEN_HEADER { get; set; }
    [JsonPropertyName("ORDEN_DATA"), Required, Range(0, int.MaxValue)] public int? ORDEN_DATA { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (FORMATO_DATO is "numero" or "porcentaje")
        {
            if (DECIMALES is null)
                yield return new ValidationResult("DECIMALES debe estar entre 0 y 6.", [nameof(DECIMALES)]);
        }
        else if (DECIMALES is not null)
            yield return new ValidationResult("DECIMALES no aplica a texto o fecha.", [nameof(DECIMALES)]);
    }
}
