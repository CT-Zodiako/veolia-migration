using System.Text.Json.Serialization;

namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class ActualizarReliquidacionRequestDto
{
    public long RelqId { get; set; }
    public long ApsaId { get; set; }
    public string RelqNombre { get; set; } = string.Empty;
    public string? RelqDescripcion { get; set; }
    public string RelqDesde { get; set; } = string.Empty;
    public string RelqHasta { get; set; } = string.Empty;
    public string RelqEstado { get; set; } = string.Empty;

    [JsonPropertyName("nombre")]
    public string? Nombre { get; set; }

    [JsonPropertyName("descripcion")]
    public string? Descripcion { get; set; }

    [JsonPropertyName("desde")]
    public string? Desde { get; set; }

    [JsonPropertyName("hasta")]
    public string? Hasta { get; set; }
}
