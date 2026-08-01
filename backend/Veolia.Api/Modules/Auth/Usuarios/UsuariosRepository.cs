using Dapper;
using System.Data.Common;
using System.Security.Cryptography;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Auth.Usuarios;

public class UsuariosRepository(IOracleConnectionFactory connectionFactory) : IUsuariosRepository
{
    public async Task<(int Status, string Response, string Msg)> SetChangePassAsync(long sisuId, string oldPass, string newPass, string confirmPass, CancellationToken cancellationToken)
    {
        if (!string.Equals(newPass, confirmPass, StringComparison.Ordinal))
        {
            return (403, "Las contraseñas no coinciden", "Las contraseñas no coinciden");
        }

        const string currentPassSql = @"
SELECT SISU_PASS
FROM AUGE_SISUSUARIO
WHERE SISU_ID = :sisuId
  AND SISU_ESTADO = 1";

        const string updateSql = @"
UPDATE AUGE_SISUSUARIO
SET SISU_PASS = :newPass
WHERE SISU_ID = :sisuId
  AND SISU_ESTADO = 1";

        try
        {
            using var connection = await OpenConnectionAsync(cancellationToken);
            var currentPass = await connection.QueryFirstOrDefaultAsync<string>(
                new CommandDefinition(currentPassSql, new { sisuId }, cancellationToken: cancellationToken));

            if (string.IsNullOrEmpty(currentPass))
            {
                return (403, "Usuario no encontrado", "Usuario no encontrado");
            }

            if (!BCrypt.Net.BCrypt.Verify(oldPass, currentPass))
            {
                return (403, "Contraseña actual inválida", "Contraseña actual inválida");
            }

            var hashedNewPass = BCrypt.Net.BCrypt.HashPassword(newPass, workFactor: 10);
            var rowsAffected = await connection.ExecuteAsync(
                new CommandDefinition(updateSql, new { newPass = hashedNewPass, sisuId }, cancellationToken: cancellationToken));

            if (rowsAffected <= 0)
            {
                return (500, "No se actualizó la contraseña", "No se actualizó la contraseña");
            }

            return (200, "OK", "Contraseña actualizada");
        }
        catch (Exception ex)
        {
            return (500, ex.Message, "No se pudo cambiar la contraseña");
        }
    }

    public async Task<IReadOnlyList<object>> GetAllUsersAsync(CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    SISU_ID,
    SISU_NOMBRES AS SISU_NOMBRE,
    SISU_APELLIDOS AS SISU_APELLIDO,
    SISU_CORREO,
    SISU_ESTADO
FROM AUGE_SISUSUARIO
ORDER BY SISU_APELLIDOS, SISU_NOMBRES, SISU_ID";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql);
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<UserMutationRepositoryResult> RegistroAsync(string nombre, string apellido, string correo, string password, int estado, CancellationToken cancellationToken)
    {
        if (await EmailExistsAsync(correo, null, cancellationToken))
        {
            return new UserMutationRepositoryResult(true, null, DuplicateEmailMessage);
        }

        const string sql = @"
INSERT INTO AUGE_SISUSUARIO (
    SISU_ID,
    SISU_NOMBRES,
    SISU_APELLIDOS,
    SISU_CORREO,
    SISU_PASS,
    SISU_ESTADO,
    SISU_FECHA
)
VALUES (
    SAUGE_SISUSUARIO.NEXTVAL,
    :nombre,
    :apellido,
    :correo,
    :password,
    :estado,
    SYSDATE
)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 10);
        var rowsAffected = await connection.ExecuteAsync(
            new CommandDefinition(sql, new { nombre, apellido, correo, password = hashedPassword, estado }, cancellationToken: cancellationToken));

        return new UserMutationRepositoryResult(false, new { rowsAffected });
    }

    public async Task<UserMutationRepositoryResult> UpdateUsuarioAsync(long id, string nombre, string apellido, string correo, int estado, CancellationToken cancellationToken)
    {
        if (await EmailExistsAsync(correo, id, cancellationToken))
        {
            return new UserMutationRepositoryResult(true, null, DuplicateEmailMessage);
        }

        const string sql = @"
UPDATE AUGE_SISUSUARIO
SET SISU_NOMBRES = :nombre,
    SISU_APELLIDOS = :apellido,
    SISU_CORREO = :correo,
    SISU_ESTADO = :estado
WHERE SISU_ID = :id";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rowsAffected = await connection.ExecuteAsync(
            new CommandDefinition(sql, new { id, nombre, apellido, correo, estado }, cancellationToken: cancellationToken));

        return new UserMutationRepositoryResult(false, new { rowsAffected });
    }

    public async Task<IReadOnlyList<object>> GetUserByIdAsync(long id, CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    SISU_ID,
    SISU_NOMBRES AS SISU_NOMBRE,
    SISU_APELLIDOS AS SISU_APELLIDO,
    SISU_CORREO,
    SISU_ESTADO
FROM AUGE_SISUSUARIO
WHERE SISU_ID = :id";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, new { id });
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<string> ResetPassAsync(long id, CancellationToken cancellationToken)
    {
        const string sql = @"
UPDATE AUGE_SISUSUARIO
SET SISU_PASS = :newPass
WHERE SISU_ID = :id";

        var newPass = GeneratePassword();
        var hashedNewPass = BCrypt.Net.BCrypt.HashPassword(newPass, workFactor: 10);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(
            new CommandDefinition(sql, new { id, newPass = hashedNewPass }, cancellationToken: cancellationToken));

        return newPass;
    }

    private const string DuplicateEmailMessage = "El correo ya se encuentra registrado";

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

    private async Task<bool> EmailExistsAsync(string correo, long? excludeUserId, CancellationToken cancellationToken)
    {
        const string baseSql = @"
SELECT COUNT(1)
FROM AUGE_SISUSUARIO
WHERE LOWER(SISU_CORREO) = LOWER(:correo)";

        var sql = excludeUserId.HasValue
            ? $"{baseSql} AND SISU_ID <> :excludeUserId"
            : baseSql;

        using var connection = await OpenConnectionAsync(cancellationToken);
        var count = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { correo, excludeUserId }, cancellationToken: cancellationToken));

        return count > 0;
    }

    private static string GeneratePassword(int length = 10)
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        var chars = new char[length];

        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[length];
        rng.GetBytes(bytes);

        for (var i = 0; i < length; i++)
        {
            chars[i] = alphabet[bytes[i] % alphabet.Length];
        }

        return new string(chars);
    }
}
