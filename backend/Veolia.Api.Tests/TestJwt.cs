using System.Security.Cryptography;
using System.Text;

namespace Veolia.Api.Tests;

/// <summary>
/// Builds HS256 tokens signed with the secret injected by <see cref="AuthApiSmokeFactory"/>,
/// matching the legacy <c>jwt.verify(token, TOKEN_KEY)</c> contract enforced by AuthJwtParityMiddleware.
/// </summary>
internal static class TestJwt
{
    internal const string Secret = "veolia-api-tests-jwt-secret";

    internal static string Build(long sisuId = 101, int idSistema = 10)
    {
        var header = Base64UrlEncode(Encoding.UTF8.GetBytes("{\"alg\":\"HS256\",\"typ\":\"JWT\"}"));
        var payload = Base64UrlEncode(Encoding.UTF8.GetBytes(
            $"{{\"SISU_ID\":{sisuId},\"idSistema\":{idSistema},\"jti\":\"{Guid.NewGuid():N}\"}}"));

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(Secret));
        var signature = Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{header}.{payload}")));
        return $"{header}.{payload}.{signature}";
    }

    /// <summary>Unsigned token (alg "none"); the API must reject it like the legacy backend.</summary>
    internal static string BuildUnsigned(long sisuId = 101, int idSistema = 10)
    {
        var header = Base64UrlEncode(Encoding.UTF8.GetBytes("{\"alg\":\"none\",\"typ\":\"JWT\"}"));
        var payload = Base64UrlEncode(Encoding.UTF8.GetBytes(
            $"{{\"SISU_ID\":{sisuId},\"idSistema\":{idSistema},\"jti\":\"{Guid.NewGuid():N}\"}}"));
        return $"{header}.{payload}.signature";
    }

    private static string Base64UrlEncode(byte[] input)
        => Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
}
