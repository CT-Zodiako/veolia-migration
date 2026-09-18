using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Veolia.Api.Modules.Sui853.Comercial;

public sealed record ComercialRequest(
    [property: Required, RegularExpression(@"^[0-9]{1,38}$")] string ApsId,
    [property: Range(1, 9999)] int Year,
    [property: Range(1, 12)] int Month);

public interface IComercialRepository
{
    Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(ComercialRequest request, CancellationToken cancellationToken);
    Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken);
}

public static class ComercialPayload
{
    // Retain unknown sections and metadata. Do not map through the lossy CFT DTO.
    public static JsonObject ParseSummary(string json, string? dialogHeader)
    {
        var node = JsonNode.Parse(json);
        if (node is JsonValue value && value.TryGetValue<string>(out var nested))
            node = JsonNode.Parse(nested);
        if (node is not JsonObject result)
            throw new JsonException("Expected a Formato2 object.");
        if (result["meta"] is null) result["meta"] = new JsonObject();
        if (result["meta"] is not JsonObject meta)
            throw new JsonException("Expected object metadata.");
        meta["dialogHeader"] = dialogHeader;
        // JSON numeric row values otherwise lose precision when parsed by JavaScript.
        if (result["data"] is JsonNode data) StringifyNumbers(data);
        return result;
    }

    private static void StringifyNumbers(JsonNode node)
    {
        if (node is JsonObject obj)
        {
            foreach (var key in obj.Select(pair => pair.Key).ToArray())
            {
                if (obj[key] is JsonValue value && value.GetValueKind() == JsonValueKind.Number)
                    obj[key] = value.ToJsonString();
                else if (obj[key] is JsonNode child) StringifyNumbers(child);
            }
        }
        else if (node is JsonArray array)
        {
            for (var i = 0; i < array.Count; i++)
            {
                if (array[i] is JsonValue value && value.GetValueKind() == JsonValueKind.Number)
                    array[i] = value.ToJsonString();
                else if (array[i] is JsonNode child) StringifyNumbers(child);
            }
        }
    }
}
