using System.Text.Json.Serialization;

namespace Veolia.Api.Contracts.Responses;

// Nombres de propiedad JSON explícitos: el frontend espera el nombre de
// columna Oracle tal cual (mayúsculas). Es la única clase de respuesta en
// el backend con ese contrato (el resto usa filas dinámicas de Dapper, que
// ya preservan el nombre de columna sin depender de la policy global, o
// DTOs PascalCase pensados para camelCase automático) — fijarlos acá en vez
// de tocar la policy global de Program.cs evita romper el resto de la app.
public sealed class RellenoResponse
{
    [JsonPropertyName("RELL_ID")]
    public long RELL_ID { get; set; }

    [JsonPropertyName("RELL_NOMRELLENO")]
    public string RELL_NOMRELLENO { get; set; } = string.Empty;

    [JsonPropertyName("RELL_DESCRIPCION")]
    public string? RELL_DESCRIPCION { get; set; }

    [JsonPropertyName("RELL_ESTADO")]
    public int RELL_ESTADO { get; set; }

    [JsonPropertyName("RELL_PROPIO")]
    public int RELL_PROPIO { get; set; }

    [JsonPropertyName("RELL_REGIONAL")]
    public int RELL_REGIONAL { get; set; }

    [JsonPropertyName("RELL_NUSD")]
    public string? RELL_NUSD { get; set; }

    [JsonPropertyName("RELL_FECHACREACION")]
    public DateTime RELL_FECHACREACION { get; set; }

    [JsonPropertyName("USUA_USUA")]
    public long USUA_USUA { get; set; }
}
