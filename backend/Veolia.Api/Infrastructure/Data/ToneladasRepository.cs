using Dapper;
using System.Data;
using System.Data.Common;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class ToneladasRepository(IOracleConnectionFactory connectionFactory) : IToneladasRepository
{
    public async Task<IReadOnlyList<QrtResponse>> GetQrtAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT APS AS Aps,
       EMPRESA AS Empresa,
       TIPO AS Tipo,
       SUM(VALOR) AS Valor
FROM VAUCO_TONELADAS
WHERE APS = :1
  AND TIPO NOT IN ('QA', 'TAFNA')
  AND (ANNO * 12 + MES) BETWEEN ((:2 * 12 + :3) - 6) AND (:2 * 12 + :3)
GROUP BY APS, EMPRESA, TIPO
ORDER BY EMPRESA, TIPO";

        var parameters = new DynamicParameters();
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<QrtResponse>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<QaResponse>> GetQaAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT APS AS Aps,
       EMPRESA AS Empresa,
       ANNO AS Anno,
       MES AS Mes,
       SUM(VALOR) AS Valor
FROM VAUCO_TONELADAS
WHERE APS = :1
  AND TIPO IN ('QA')
  AND (ANNO * 12 + MES) BETWEEN ((:2 * 12 + :3) - 6) AND (:2 * 12 + :3)
GROUP BY APS, EMPRESA, ANNO, MES
ORDER BY ANNO, MES, EMPRESA";

        var parameters = new DynamicParameters();
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<QaResponse>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<DetalleResponse>> GetDetalleAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT *
FROM VAUCO_TONELADAS
WHERE APS = :1
  AND TIPO NOT IN ('TAFNA')
  AND (ANNO * 12 + MES) BETWEEN ((:2 * 12 + :3) - 6) AND (:2 * 12 + :3)
ORDER BY ANNO, MES, EMPRESA, MPIO, TIPO";

        var parameters = new DynamicParameters();
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<DetalleResponse>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
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
