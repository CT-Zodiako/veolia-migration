using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Veolia.Api.Infrastructure.Auth;

/// <summary>
/// HS256 session token shared by login (issue) and AuthJwtParityMiddleware (verify), replacing the
/// legacy <c>jwt.sign</c>/<c>jwt.verify</c> pair. Like <c>jwt.verify</c>, a token is valid only with a
/// matching signature and an <c>exp</c> still in the future.
/// </summary>
public static class AuthJwt
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(12);

    public static string Issue(string secret, long sisuId, int idSistema, DateTimeOffset issuedAt)
    {
        var headerJson = JsonSerializer.Serialize(new { alg = "HS256", typ = "JWT" });
        var payloadJson = JsonSerializer.Serialize(new
        {
            SISU_ID = sisuId,
            idSistema,
            iat = issuedAt.ToUnixTimeSeconds(),
            exp = issuedAt.Add(Lifetime).ToUnixTimeSeconds()
        });

        var header = EncodeBase64Url(Encoding.UTF8.GetBytes(headerJson));
        var payload = EncodeBase64Url(Encoding.UTF8.GetBytes(payloadJson));
        var message = $"{header}.{payload}";

        return $"{message}.{Sign(secret, message)}";
    }

    public static bool HasValidSignature(string token, string secret)
    {
        var parts = token.Split('.');
        if (parts.Length != 3)
        {
            return false;
        }

        var expectedSignature = Sign(secret, $"{parts[0]}.{parts[1]}");

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedSignature),
            Encoding.UTF8.GetBytes(parts[2]));
    }

    /// <summary>
    /// True only when the payload carries a numeric <c>exp</c> later than <paramref name="now"/>
    /// (jsonwebtoken rejects when now &gt;= exp, without clock tolerance). A token without
    /// <c>exp</c> is treated as not live: login always sets it, so a token lacking it was not
    /// issued by this API and would otherwise never expire.
    /// </summary>
    public static bool IsLive(string token, DateTimeOffset now)
    {
        var parts = token.Split('.');
        if (parts.Length != 3)
        {
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(DecodeBase64Url(parts[1]));
            if (doc.RootElement.ValueKind != JsonValueKind.Object
                || !doc.RootElement.TryGetProperty("exp", out var exp)
                || exp.ValueKind != JsonValueKind.Number
                || !exp.TryGetInt64(out var expSeconds))
            {
                return false;
            }

            return now.ToUnixTimeSeconds() < expSeconds;
        }
        catch (Exception ex) when (ex is FormatException or JsonException)
        {
            return false;
        }
    }

    private static string Sign(string secret, string message)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return EncodeBase64Url(hmac.ComputeHash(Encoding.UTF8.GetBytes(message)));
    }

    private static string EncodeBase64Url(byte[] input)
        => Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

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
}
