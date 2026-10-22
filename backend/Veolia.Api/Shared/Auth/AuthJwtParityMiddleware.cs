using Dapper;
using System.Data.Common;
using System.Text.Json;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Infrastructure.Auth;

public sealed class AuthJwtParityMiddleware(RequestDelegate next)
{
    private const string AccessTokenHeader = "x-access-token";
    private const string MissingTokenMessage = "No existe token de verificacion";
    private const string UnauthorizedMessage = "No Autorizado!";

    public async Task InvokeAsync(
        HttpContext context,
        IOracleConnectionFactory connectionFactory,
        IConfiguration configuration,
        ILogger<AuthJwtParityMiddleware> logger)
    {
        var token = context.Request.Headers[AccessTokenHeader].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(token))
        {
            await WriteParityErrorAsync(context, StatusCodes.Status403Forbidden, MissingTokenMessage);
            return;
        }

        if (!LooksLikeJwt(token))
        {
            await WriteParityErrorAsync(context, StatusCodes.Status401Unauthorized, UnauthorizedMessage);
            return;
        }

        // Legacy jwt.verify: bad signature or expired token -> 401 "No Autorizado!".
        if (!AuthJwt.HasValidSignature(token, AuthJwtSecret.Read(configuration))
            || !AuthJwt.IsLive(token, DateTimeOffset.UtcNow))
        {
            await WriteParityErrorAsync(context, StatusCodes.Status401Unauthorized, UnauthorizedMessage);
            return;
        }

        if (await IsDeadTokenAsync(connectionFactory, logger, token, context.RequestAborted))
        {
            await WriteParityErrorAsync(context, StatusCodes.Status401Unauthorized, UnauthorizedMessage);
            return;
        }

        await next(context);
    }

    private static bool LooksLikeJwt(string token)
        => token.Split('.').Length == 3;

    private static async Task<bool> IsDeadTokenAsync(
        IOracleConnectionFactory connectionFactory,
        ILogger logger,
        string token,
        CancellationToken cancellationToken)
    {
        // AS-IS parity with legacy authJwt.js: SELECT * FROM AUGE_DEADTOKEN WHERE DTKN_TOKEN = :1
        const string sql = "SELECT COUNT(1) FROM AUGE_DEADTOKEN WHERE DTKN_TOKEN = :token";

        try
        {
            using var connection = connectionFactory.CreateConnection();
            if (connection is DbConnection dbConnection)
            {
                await dbConnection.OpenAsync(cancellationToken);
            }
            else
            {
                connection.Open();
            }

            var deadTokenCount = await connection.ExecuteScalarAsync<int>(
                new CommandDefinition(sql, new { token }, cancellationToken: cancellationToken));
            return deadTokenCount > 0;
        }
        catch (Exception ex)
        {
            // Fail closed: if revocation cannot be verified, the token is rejected.
            // Accepting it would let a logged-out token through whenever Oracle or
            // AUGE_DEADTOKEN is unavailable (the legacy backend also aborted the request).
            // A client-aborted request (ORA-01013 / cancellation) is rejected without logging.
            if (!cancellationToken.IsCancellationRequested)
            {
                logger.LogError(ex, "Dead-token lookup failed; rejecting request (fail closed)");
            }

            return true;
        }
    }

    private static async Task WriteParityErrorAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = JsonSerializer.Serialize(new { message });
        await context.Response.WriteAsync(payload);
    }
}
