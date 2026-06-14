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

    public async Task InvokeAsync(HttpContext context, IOracleConnectionFactory connectionFactory)
    {
        var token = context.Request.Headers[AccessTokenHeader].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(token))
        {
            await WriteParityErrorAsync(context, StatusCodes.Status403Forbidden, MissingTokenMessage);
            return;
        }

        if (!LooksLikeJwt(token) || await IsDeadTokenAsync(connectionFactory, token, context.RequestAborted))
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
        string token,
        CancellationToken cancellationToken)
    {
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

            const string sql = "SELECT COUNT(1) FROM AUGE_DEADTOKEN WHERE TOKEN = :token";
            var deadTokenCount = await connection.ExecuteScalarAsync<int>(
                new CommandDefinition(sql, new { token }, cancellationToken: cancellationToken));

            return deadTokenCount > 0;
        }
        catch
        {
            // Parity-first fallback: if validation fails unexpectedly, treat as unauthorized.
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
