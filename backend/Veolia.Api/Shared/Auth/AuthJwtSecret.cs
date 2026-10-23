namespace Veolia.Api.Infrastructure.Auth;

/// <summary>
/// HMAC key for session tokens. It must come from configuration (<c>Auth:JwtSecret</c>, usually the
/// <c>Auth__JwtSecret</c> environment variable on the server); there is no built-in fallback, so a
/// token can never be signed with a value published in the source code.
/// </summary>
public static class AuthJwtSecret
{
    public const string ConfigurationKey = "Auth:JwtSecret";

    // 32 characters = 256 bits of key material for HMAC-SHA256 when the secret is random.
    public const int MinimumLength = 32;

    public const string InvalidSecretMessage =
        "Auth:JwtSecret is not configured or is shorter than 32 characters. Set the Auth__JwtSecret environment variable (or Auth:JwtSecret in the server appsettings) before starting the API.";

    /// <summary>Called at startup so a missing secret stops the API instead of failing per request.</summary>
    public static void EnsureConfigured(IConfiguration configuration) => Read(configuration);

    public static string Read(IConfiguration configuration)
    {
        var secret = configuration[ConfigurationKey];
        if (string.IsNullOrWhiteSpace(secret) || secret.Trim().Length < MinimumLength)
        {
            throw new InvalidOperationException(InvalidSecretMessage);
        }

        return secret;
    }
}
