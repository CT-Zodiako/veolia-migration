using System.Text.Json.Serialization;

namespace Veolia.Api.Contracts.Suministros;

// Nombres de propiedad JSON explícitos: el frontend espera camelCase para
// este DTO en particular (a diferencia de la mayoría de las respuestas de
// la API, que exponen el nombre de columna Oracle tal cual). Fijarlos acá
// evita que dependan de la policy global de serialización de Program.cs.
public class ReversionHistoryItem
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("aps")]
    public int Aps { get; set; }

    [JsonPropertyName("anno")]
    public int Anno { get; set; }

    [JsonPropertyName("mes")]
    public int Mes { get; set; }

    [JsonPropertyName("motivo")]
    public string Motivo { get; set; } = string.Empty;

    [JsonPropertyName("fecha")]
    public DateTime Fecha { get; set; }

    [JsonPropertyName("usuario")]
    public string Usuario { get; set; } = string.Empty;

    [JsonPropertyName("nombreAps")]
    public string NombreAps { get; set; } = string.Empty;
}
