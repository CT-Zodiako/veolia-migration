using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Veolia.Api.Infrastructure.Errors;

// Keeps small JSON request bodies readable after model binding so the error log can show what
// the user sent. Uploads and anything else are never buffered.
public static partial class RequestBodyCapture
{
    public const int MaxBytes = 8 * 1024;

    private const string Masked = "***";

    public static void EnableFor(HttpRequest request)
    {
        if (IsJson(request) && request.ContentLength is > 0 and <= MaxBytes)
        {
            request.EnableBuffering();
        }
    }

    public static async Task<string> ReadRedactedAsync(HttpRequest request)
    {
        if (request.ContentType is null && request.ContentLength is null or 0)
        {
            return "[sin cuerpo]";
        }

        if (!IsJson(request))
        {
            return "[cuerpo no JSON omitido]";
        }

        if (request.ContentLength is > MaxBytes)
        {
            return "[cuerpo JSON mayor a 8 KB omitido]";
        }

        if (!request.Body.CanSeek)
        {
            return "[cuerpo JSON sin tamaño declarado omitido]";
        }

        try
        {
            request.Body.Position = 0;
            using var reader = new StreamReader(request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
            var json = await reader.ReadToEndAsync();
            request.Body.Position = 0;

            if (json.Length == 0)
            {
                return "[sin cuerpo]";
            }

            var node = JsonNode.Parse(json);
            Redact(node);
            return node?.ToJsonString() ?? "null";
        }
        catch (JsonException)
        {
            return "[cuerpo JSON inválido omitido]";
        }
        catch (Exception)
        {
            return "[cuerpo no disponible]";
        }
    }

    private static bool IsJson(HttpRequest request) =>
        request.ContentType is { } contentType
        && contentType.Contains("json", StringComparison.OrdinalIgnoreCase);

    private static void Redact(JsonNode? node)
    {
        switch (node)
        {
            case JsonObject obj:
                foreach (var key in obj.Select(p => p.Key).ToList())
                {
                    if (SensitiveKey().IsMatch(key))
                    {
                        obj[key] = Masked;
                    }
                    else
                    {
                        Redact(obj[key]);
                    }
                }

                break;
            case JsonArray array:
                foreach (var item in array)
                {
                    Redact(item);
                }

                break;
        }
    }

    [GeneratedRegex("pass|clave|contra|token|secret", RegexOptions.IgnoreCase)]
    private static partial Regex SensitiveKey();
}
