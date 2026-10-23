using System.Text.Json;
using System.Text.Json.Nodes;

namespace Veolia.Api.Modules.Sui853.Cft;

// Contrato compartido por los 27 endpoints de SUI853/CFT+CVNA+CVA. Todos
// ejecutan el mismo SQL genérico (SELECT SUI.f_render_formato2(:codigo) AS
// json FROM dual), que arma dinámicamente un JSON con metadata de columnas
// (SIN_MOVIMIENTO/CON_MOVIMIENTO con headers o headersConFiltro/
// headersSinFiltro) + filas de datos (data). Ver
// doc migracion/modules/sui853/CFT.md.
//
// El payload se devuelve sin pérdida (JsonObject), igual que el legacy
// (back-tarificador/src/modules/sui853/{CFT,CVNA,CVA}/controller.js), que
// devolvía el objeto parseado tal cual más meta.dialogHeader. Un DTO tipado
// descartaba claves que el legacy sí usaba (meta, headersConFiltro,
// headersSinFiltro). Mismo patrón que FacPayload / ComercialPayload.
public static class Formato2Payload
{
    // Devuelve null cuando la función no rindió nada (sin fila o CLOB vacío).
    public static JsonObject? Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        var node = JsonNode.Parse(json);
        // Legacy: JSON.parse(JSON.parse(raw)) cuando viene doble escapado.
        if (node is JsonValue value && value.TryGetValue<string>(out var nested)) node = JsonNode.Parse(nested);
        return node as JsonObject ?? throw new JsonException("Invalid Formato2 payload.");
    }

    // Legacy: parsed.meta = { ...(parsed.meta || {}), dialogHeader } con el
    // texto "{CODIGO} | {NOMBRE} | {DESCRIPCION}" de sui.TCAT_DOCUMENTO.
    public static void ApplyDialogHeader(JsonObject payload, string? dialogHeader)
    {
        // Sin título de catálogo se conserva el meta que ya venía del PL/SQL.
        if (string.IsNullOrWhiteSpace(dialogHeader)) return;
        // No reemplazar formas de meta desconocidas por un objeto inventado.
        if (payload["meta"] is null) payload["meta"] = new JsonObject();
        if (payload["meta"] is JsonObject meta) meta["dialogHeader"] = dialogHeader;
    }
}
