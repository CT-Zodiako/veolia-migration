namespace Veolia.Api.Contracts.Reliquidacion;

/// <summary>
/// Resultado de RELIQ.PK_JSONRESUMEN.freli_jsongral(reliq, aps, anno, mes).
/// El legacy (front-tarificador/src/reliq/views/CompararTarifas.vue, líneas 755-777)
/// consume el JSON tal cual con dos claves de nivel raíz: "periodo" (string) y
/// "dataset" (array de hasta 4 bloques, cada uno con un nombre de leyenda -"nombre"
/// o "grup" según el bloque, ver GenericTable.vue líneas 88-104-, una lista de
/// encabezados "columns" y una matriz "data" fila x columna en el mismo orden que
/// "columns"). Se tipa aquí para exponer una tabla real al frontend en vez de un
/// dump crudo, preservando la estructura dinámica (no hay columnas fijas: cada
/// bloque puede traer un set de columnas distinto).
/// </summary>
public sealed class ResumenCompararTarifasResponseDto
{
    public string? Periodo { get; set; }
    public List<ResumenCompararTarifasDatasetItemDto> Dataset { get; set; } = new();
}

public sealed class ResumenCompararTarifasDatasetItemDto
{
    public string? Nombre { get; set; }
    public List<string> Columns { get; set; } = new();
    public List<List<object?>> Data { get; set; } = new();
}
