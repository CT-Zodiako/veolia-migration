namespace Veolia.Api.Modules.Sui853.Cdft;

// CDFT — consulta directa contra SUI.TCDFT_QRT_ANUAL (no usa
// SUI.f_render_formato2 como el resto de SUI853/CFT). Legacy: /cdft.
//
// Los nombres de propiedad son PascalCase sin [JsonPropertyName]: el
// PropertyNamingPolicy camelCase por defecto configurado en Program.cs ya
// serializa esto como el frontend lo espera (annoFiscal, nombreAps, etc.),
// a diferencia de Formato2ResponseDto que sí necesita el atributo explícito
// por mezclar SNAKE_CASE/camelCase reales del legacy.
public sealed class CdftRowDto
{
    public string AnnoFiscal { get; set; } = string.Empty;
    public string NombreAps { get; set; } = string.Empty;
    public decimal ValorCorriente { get; set; }
    public decimal Valor2018 { get; set; }
    public decimal Qrtz { get; set; }
}

public sealed record CdftRequestDto(int Anno);
