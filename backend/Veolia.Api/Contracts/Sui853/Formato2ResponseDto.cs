using System.Text.Json.Serialization;

namespace Veolia.Api.Contracts.Sui853;

// DTOs genéricos compartidos por los 12 endpoints de SUI853/CFT. Los 12
// ejecutan el mismo SQL genérico (SELECT SUI.f_render_formato2(:codigo) AS
// json FROM dual), que arma dinámicamente un JSON con metadata de columnas
// (SIN_MOVIMIENTO/CON_MOVIMIENTO) + filas de datos (data). Ver
// doc migracion/modules/sui853/CFT.md para el contrato real por endpoint
// (código de formato, columnas, fila de ejemplo).
//
// Las claves JSON reales, capturadas en vivo del legacy contra el Oracle de
// producción, mezclan SNAKE_CASE (SIN_MOVIMIENTO/CON_MOVIMIENTO), camelCase
// (backgroundColor) y snake_case (mouse_over) — de ahí el [JsonPropertyName]
// explícito en cada propiedad en vez de depender de una policy global.
//
// LIMITACIÓN CONOCIDA: el Oracle de desarrollo (TARIFICADOR, ver
// appsettings.Development.json) no tiene acceso al schema SUI, así que este
// contrato no se pudo verificar en runtime. Los nombres a nivel de sección
// (tableTitle/tableColor/headers) no aparecen documentados en CFT.md (que
// solo tabula field/header/formato/decimal/alineación/color/filtro a nivel
// de columna) — se infieren por convención camelCase con el resto de claves
// de la función (backgroundColor). Si al conectar contra el schema SUI real
// estas claves difieren, ajustar solo los [JsonPropertyName] de
// TablaSeccionDto, el resto del contrato ya está confirmado contra captura
// real.
public sealed class Formato2ResponseDto
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("SIN_MOVIMIENTO")]
    public TablaSeccionDto? SinMovimiento { get; set; }

    [JsonPropertyName("CON_MOVIMIENTO")]
    public TablaSeccionDto? ConMovimiento { get; set; }

    [JsonPropertyName("data")]
    public List<Dictionary<string, object?>> Data { get; set; } = [];
}

public sealed class TablaSeccionDto
{
    [JsonPropertyName("tableTitle")]
    public string? TableTitle { get; set; }

    [JsonPropertyName("tableColor")]
    public string? TableColor { get; set; }

    [JsonPropertyName("headers")]
    public List<TablaColumnaDto> Headers { get; set; } = [];
}

public sealed class TablaColumnaDto
{
    [JsonPropertyName("field")]
    public string? Field { get; set; }

    [JsonPropertyName("header")]
    public string? Header { get; set; }

    [JsonPropertyName("formato")]
    public string? Formato { get; set; }

    [JsonPropertyName("decimal")]
    public int? Decimal { get; set; }

    [JsonPropertyName("alineacion")]
    public string? Alineacion { get; set; }

    [JsonPropertyName("backgroundColor")]
    public string? BackgroundColor { get; set; }

    [JsonPropertyName("filter")]
    public bool? Filter { get; set; }

    [JsonPropertyName("mouse_over")]
    public string? MouseOver { get; set; }
}
