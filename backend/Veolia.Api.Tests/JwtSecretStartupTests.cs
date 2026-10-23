using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Veolia.Api.Tests;

/// <summary>
/// S10 "Exigir JwtSecret configurado": there is no built-in fallback secret. The API refuses to
/// start when Auth:JwtSecret is missing or shorter than 32 characters, so tokens can never be
/// signed with a value known from the source code.
/// </summary>
public sealed class JwtSecretStartupTests
{
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("0123456789012345678901234567890")] // 31 characters
    public void Startup_WithMissingOrShortJwtSecret_FailsFastWithClearMessage(string secret)
    {
        using var factory = new SecretFactory(secret);

        var exception = Assert.ThrowsAny<Exception>(() => factory.CreateClient());
        var startupError = FindInvalidOperation(exception);

        Assert.NotNull(startupError);
        Assert.Equal(
            "Auth:JwtSecret is not configured or is shorter than 32 characters. Set the Auth__JwtSecret environment variable (or Auth:JwtSecret in the server appsettings) before starting the API.",
            startupError!.Message);
        if (secret.Trim().Length > 0)
        {
            Assert.DoesNotContain(secret, startupError.Message, StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task Startup_WithJwtSecretOfMinimumLength_Starts()
    {
        using var factory = new SecretFactory(new string('s', 32));
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static InvalidOperationException? FindInvalidOperation(Exception? exception)
    {
        while (exception is not null)
        {
            if (exception is InvalidOperationException invalidOperation
                && invalidOperation.Message.StartsWith("Auth:JwtSecret", StringComparison.Ordinal))
            {
                return invalidOperation;
            }

            if (exception is AggregateException aggregate && aggregate.InnerExceptions.Count > 0)
            {
                exception = aggregate.InnerExceptions[0];
                continue;
            }

            exception = exception.InnerException;
        }

        return null;
    }

    private sealed class SecretFactory(string secret) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
            => builder.UseSetting("Auth:JwtSecret", secret);
    }
}
