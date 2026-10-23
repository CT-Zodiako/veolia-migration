using System.Security.Cryptography;
using System.Text;

namespace Veolia.Api.Tests;

/// <summary>
/// Builds HS256 tokens signed with the secret injected by <see cref="AuthApiSmokeFactory"/>,
/// matching the legacy <c>jwt.verify(token, TOKEN_KEY)</c> contract enforced by AuthJwtParityMiddleware
/// (signature and <c>exp</c>).
/// </summary>
internal static class TestJwt
{
    // At least 32 characters: the API refuses to start with a shorter Auth:JwtSecret.
    internal const string Secret = "veolia-api-tests-jwt-secret-not-for-production";

    /// <summary>User id the stub menu repository grants menu 204 "Usuarios" of system 1 (user admin).</summary>
    internal const long AdminSisuId = 101;

    /// <summary>User id without menu 204: an authenticated user who cannot manage other users.</summary>
    internal const long NonAdminSisuId = 202;

    internal static string Build(long sisuId = AdminSisuId, int idSistema = 10)
        => Sign(BuildPayload(sisuId, idSistema, DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds()));

    /// <summary>Correctly signed token whose <c>exp</c> is in the past.</summary>
    internal static string BuildExpired(long sisuId = AdminSisuId, int idSistema = 10)
        => Sign(BuildPayload(sisuId, idSistema, DateTimeOffset.UtcNow.AddMinutes(-1).ToUnixTimeSeconds()));

    /// <summary>Correctly signed token without an <c>exp</c> claim.</summary>
    internal static string BuildWithoutExp(long sisuId = AdminSisuId, int idSistema = 10)
        => Sign(BuildPayload(sisuId, idSistema, exp: null));

    /// <summary>Unsigned token (alg "none"); the API must reject it like the legacy backend.</summary>
    internal static string BuildUnsigned(long sisuId = AdminSisuId, int idSistema = 10)
    {
        var header = Base64UrlEncode(Encoding.UTF8.GetBytes("{\"alg\":\"none\",\"typ\":\"JWT\"}"));
        var payload = Base64UrlEncode(Encoding.UTF8.GetBytes(
            BuildPayload(sisuId, idSistema, DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds())));
        return $"{header}.{payload}.signature";
    }

    private static string BuildPayload(long sisuId, int idSistema, long? exp)
        => exp is null
            ? $"{{\"SISU_ID\":{sisuId},\"idSistema\":{idSistema},\"jti\":\"{Guid.NewGuid():N}\"}}"
            : $"{{\"SISU_ID\":{sisuId},\"idSistema\":{idSistema},\"jti\":\"{Guid.NewGuid():N}\",\"exp\":{exp}}}";

    private static string Sign(string payloadJson)
    {
        var header = Base64UrlEncode(Encoding.UTF8.GetBytes("{\"alg\":\"HS256\",\"typ\":\"JWT\"}"));
        var payload = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(Secret));
        var signature = Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{header}.{payload}")));
        return $"{header}.{payload}.{signature}";
    }

    private static string Base64UrlEncode(byte[] input)
        => Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
}
