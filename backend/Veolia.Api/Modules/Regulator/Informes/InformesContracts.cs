namespace Veolia.Api.Modules.Regulator.Informes;

/// <summary>
/// JSON_DOCUMENT of json_json, passed through untouched like legacy informes/controller.js:10
/// (JSON.parse only): every key of the document and of each dataset item (nombre, grup, columns, data, ...) is kept.
/// </summary>
public static class InformeDocument
{
    public static System.Text.Json.Nodes.JsonObject Empty()
        => new() { ["semestre"] = string.Empty, ["dataset"] = new System.Text.Json.Nodes.JsonArray() };
}
