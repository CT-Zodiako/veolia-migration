using Dapper;
using System.Data.Common;

namespace Veolia.Api.Infrastructure.Data;

public class HealthRepository(IOracleConnectionFactory connectionFactory) : IHealthRepository
{
    public async Task<DatabaseHealthResult> CheckDatabaseAsync(CancellationToken cancellationToken)
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

            const string sql = "SELECT 1 FROM DUAL";
            var value = await connection.ExecuteScalarAsync<int>(new CommandDefinition(sql, cancellationToken: cancellationToken));

            return value == 1
                ? new DatabaseHealthResult(true, "Conexión Oracle OK")
                : new DatabaseHealthResult(false, "Oracle respondió un valor inesperado");
        }
        catch (Exception ex)
        {
            return new DatabaseHealthResult(false, $"No se pudo conectar a Oracle: {ex.Message}");
        }
    }
}
