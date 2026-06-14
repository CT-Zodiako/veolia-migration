using System.Text.Json;

namespace Veolia.Api.Infrastructure.Auth;

public sealed record AuthTokenContext(long SisuId, int IdSistema);

public static class AuthTokenContextAccessor
{
    public static bool TryRead(string? jwtToken, out AuthTokenContext context)
    {
        context = default!;

        if (string.IsNullOrWhiteSpace(jwtToken))
        {
            return false;
        }

        var parts = jwtToken.Split('.');
        if (parts.Length != 3)
        {
            return false;
        }

        try
        {
            var payloadBytes = DecodeBase64Url(parts[1]);
            using var doc = JsonDocument.Parse(payloadBytes);

            var root = doc.RootElement;
            var hasSisuId = TryReadLong(root, out var sisuId, "SISU_ID", "sisu_id", "sisuId", "SisuId", "id");
            var hasSistema = TryReadInt(root, out var idSistema, "idSistema", "ID_SISTEMA", "sistema", "SISTEMA");

            if (!hasSisuId || !hasSistema)
            {
                return false;
            }

            context = new AuthTokenContext(sisuId, idSistema);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static byte[] DecodeBase64Url(string input)
    {
        var normalized = input.Replace('-', '+').Replace('_', '/');

        var padding = normalized.Length % 4;
        if (padding > 0)
        {
            normalized = normalized.PadRight(normalized.Length + (4 - padding), '=');
        }

        return Convert.FromBase64String(normalized);
    }

    private static bool TryReadLong(JsonElement root, out long value, params string[] candidateKeys)
    {
        value = default;

        foreach (var key in candidateKeys)
        {
            if (!root.TryGetProperty(key, out var element))
            {
                continue;
            }

            if (element.ValueKind == JsonValueKind.Number && element.TryGetInt64(out value))
            {
                return true;
            }

            if (element.ValueKind == JsonValueKind.String && long.TryParse(element.GetString(), out value))
            {
                return true;
            }
        }

        return false;
    }

    private static bool TryReadInt(JsonElement root, out int value, params string[] candidateKeys)
    {
        value = default;

        foreach (var key in candidateKeys)
        {
            if (!root.TryGetProperty(key, out var element))
            {
                continue;
            }

            if (element.ValueKind == JsonValueKind.Number && element.TryGetInt32(out value))
            {
                return true;
            }

            if (element.ValueKind == JsonValueKind.String && int.TryParse(element.GetString(), out value))
            {
                return true;
            }
        }

        return false;
    }
}
