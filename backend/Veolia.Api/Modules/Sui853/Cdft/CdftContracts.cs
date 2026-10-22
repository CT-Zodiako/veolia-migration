namespace Veolia.Api.Modules.Sui853.Cdft;

// CDFT — consulta directa contra SUI.TCDFT_QRT_ANUAL (no usa
// SUI.f_render_formato2 como el resto de SUI853/CFT). Legacy: /cdft.
//
// Los nombres de propiedad son PascalCase sin [JsonPropertyName]: el
// PropertyNamingPolicy camelCase por defecto configurado en Program.cs ya
// serializa esto como el frontend lo espera (annoFiscal, nombreAps, etc.),
// a diferencia de Formato2Payload, que devuelve las claves reales del legacy
// (mezcla SNAKE_CASE/camelCase) sin mapearlas.
// Los valores son double, como los entregaba node-oracledb al legacy
// (CVNA/controller.js:468-476), para no redondear lo almacenado.
public sealed class CdftRowDto
{
    public string AnnoFiscal { get; set; } = string.Empty;
    public string NombreAps { get; set; } = string.Empty;
    public double ValorCorriente { get; set; }
    public double Valor2018 { get; set; }
    public double Qrtz { get; set; }
}

public sealed record CdftRequestDto(int Anno);
