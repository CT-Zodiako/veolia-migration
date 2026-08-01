using Dapper;
using System.Data.Common;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Auth.Login;

public class LoginRepository(IOracleConnectionFactory connectionFactory, IConfiguration configuration) : ILoginRepository
{
    public async Task<IReadOnlyList<object>> GetSistemasByCorreoAsync(string correo, CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    s.SIST_ID,
    s.SIST_NOMBRE
FROM AUGE_SISUSUARIO su
INNER JOIN AUGE_USUASISTEMA us ON us.USUA_ID = su.SISU_ID
INNER JOIN AUGE_SISTEMA s ON s.SIST_ID = us.SIST_ID
WHERE LOWER(su.SISU_CORREO) = LOWER(:correo)
  AND su.SISU_ESTADO = 1
  AND us.USSI_ESTADO = 1
  AND s.SIST_ESTADO = 1
ORDER BY s.SIST_NOMBRE";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, new { correo });
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<object?> LoginAsync(string correo, string pass, int idSistema, CancellationToken cancellationToken)
    {
        const string userSql = @"
SELECT
    SISU_ID,
    SISU_NOMBRES AS SISU_NOMBRE,
    SISU_APELLIDOS AS SISU_APELLIDO,
    SISU_CORREO,
    SISU_PASS,
    SISU_ESTADO
FROM AUGE_SISUSUARIO
WHERE LOWER(SISU_CORREO) = LOWER(:correo)
  AND SISU_ESTADO = 1";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var userRow = await connection.QueryFirstOrDefaultAsync(userSql, new { correo });
        if (userRow is null)
        {
            return new LoginRepositoryResult(LoginOutcomeKind.InvalidCredentials, "Correo o contraseña inválida");
        }

        var user = ToDictionary(userRow);
        user.TryGetValue("SISU_PASS", out object? storedHashObj);
        var storedHash = storedHashObj as string;
        if (string.IsNullOrWhiteSpace(storedHash) || !BCrypt.Net.BCrypt.Verify(pass, storedHash))
        {
            return new LoginRepositoryResult(LoginOutcomeKind.InvalidCredentials, "Correo o contraseña inválida");
        }

        user.Remove("SISU_PASS");
        var sisuId = ReadLong(user, "SISU_ID");
        if (sisuId <= 0)
        {
            return new LoginRepositoryResult(LoginOutcomeKind.InvalidCredentials, "Correo o contraseña inválida");
        }

        var sistemaRow = await GetSistemaParaUsuarioAsync(connection, sisuId, idSistema);
        if (sistemaRow is null)
        {
            return new LoginRepositoryResult(LoginOutcomeKind.InvalidSystem, "Sistema no encontrado para el usuario");
        }

        var sistema = ToDictionaryObject(sistemaRow);
        var authToken = BuildParityJwtToken(sisuId, idSistema);

        return new LoginRepositoryResult(
            LoginOutcomeKind.Success,
            "OK",
            Usuario: user,
            Sistema: sistema,
            AuthToken: authToken);
    }

    public async Task<SwitchSistemaRepositoryResult> SwitchSistemaAsync(long sisuId, int idSistema, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);

        var sistemaRow = await GetSistemaParaUsuarioAsync(connection, sisuId, idSistema);
        if (sistemaRow is null)
        {
            return new SwitchSistemaRepositoryResult(LoginOutcomeKind.InvalidSystem, "Sistema no encontrado para el usuario");
        }

        var sistema = ToDictionaryObject(sistemaRow);
        var authToken = BuildParityJwtToken(sisuId, idSistema);

        return new SwitchSistemaRepositoryResult(LoginOutcomeKind.Success, "OK", Sistema: sistema, AuthToken: authToken);
    }

    private static Task<dynamic?> GetSistemaParaUsuarioAsync(System.Data.IDbConnection connection, long sisuId, int idSistema)
    {
        const string sistemaSql = @"
SELECT
    s.SIST_ID,
    s.SIST_NOMBRE
FROM AUGE_USUASISTEMA us
INNER JOIN AUGE_SISTEMA s ON s.SIST_ID = us.SIST_ID
WHERE us.USUA_ID = :sisuId
  AND us.SIST_ID = :idSistema
  AND us.USSI_ESTADO = 1
  AND s.SIST_ESTADO = 1";

        return connection.QueryFirstOrDefaultAsync(sistemaSql, new { sisuId, idSistema });
    }

    public async Task<object?> LogoutAsync(long sisuId, string token, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);

        // AS-IS parity with legacy auth/controller.js:
        // INSERT INTO AUGE_DEADTOKEN VALUES (SAUGE_DEADTOKEN.NEXTVAL, :token, :usuario, sysdate)
        const string sql = "INSERT INTO AUGE_DEADTOKEN VALUES (SAUGE_DEADTOKEN.NEXTVAL, :token, :sisuId, SYSDATE)";

        var rowsAffected = await connection.ExecuteAsync(
            new CommandDefinition(sql, new { token, sisuId }, cancellationToken: cancellationToken));

        return new { rowsAffected };
    }

    public async Task<IReadOnlyList<object>> AllSistemasAsync(CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    SIST_ID,
    SIST_NOMBRE
FROM AUGE_SISTEMA
WHERE SIST_ESTADO = 1
ORDER BY SIST_NOMBRE";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql);
        return rows.Select(ToDictionaryObject).ToList();
    }

    private async Task<System.Data.IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.CreateConnection();

        if (connection is DbConnection dbConnection)
        {
            await dbConnection.OpenAsync(cancellationToken);
        }
        else
        {
            connection.Open();
        }

        return connection;
    }

    private object ToDictionaryObject(dynamic row)
        => ToDictionary(row);

    private static Dictionary<string, object?> ToDictionary(dynamic row)
    {
        if (row is IDictionary<string, object> dictionary)
        {
            return dictionary.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        }

        return ((object)row)
            .GetType()
            .GetProperties()
            .ToDictionary(prop => prop.Name, prop => prop.GetValue(row));
    }

    private static long ReadLong(Dictionary<string, object?> dictionary, string key)
    {
        if (!dictionary.TryGetValue(key, out var value) || value is null)
        {
            return 0;
        }

        return value switch
        {
            long v => v,
            int v => v,
            decimal v => (long)v,
            string v when long.TryParse(v, out var parsed) => parsed,
            _ => 0
        };
    }

    private string BuildParityJwtToken(long sisuId, int idSistema)
    {
        var headerJson = JsonSerializer.Serialize(new { alg = "HS256", typ = "JWT" });
        var payloadJson = JsonSerializer.Serialize(new
        {
            SISU_ID = sisuId,
            idSistema,
            iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            exp = DateTimeOffset.UtcNow.AddHours(12).ToUnixTimeSeconds()
        });

        var header = EncodeBase64Url(Encoding.UTF8.GetBytes(headerJson));
        var payload = EncodeBase64Url(Encoding.UTF8.GetBytes(payloadJson));
        var message = $"{header}.{payload}";

        var secret = configuration["Auth:JwtSecret"] ?? "veolia-auth-core-parity-secret";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
        var signature = EncodeBase64Url(signatureBytes);

        return $"{message}.{signature}";
    }

    private static string EncodeBase64Url(byte[] input)
        => Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
}
