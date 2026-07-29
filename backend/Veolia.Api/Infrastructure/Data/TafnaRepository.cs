using Dapper;
using System.Data;
using System.Data.Common;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class TafnaRepository(IOracleConnectionFactory connectionFactory) : ITafnaRepository
{
    public async Task<IReadOnlyList<TafnaResponse>> GetTafnaAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT APS AS Aps,
       EMPRESA AS Empresa,
       ANNO AS Anno,
       MES AS Mes,
       ROUND(VALOR, 6) AS Valor
FROM VAUCO_TONELADAS
WHERE APS = :1
  AND TIPO IN ('TAFNA')
  AND (ANNO * 12 + MES) BETWEEN ((:2 * 12 + :3) - 6) AND (:2 * 12 + :3)";

        var parameters = new DynamicParameters();
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<TafnaResponse>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    private async Task<IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken)
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
}
