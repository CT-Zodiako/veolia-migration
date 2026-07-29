using Dapper;
using System.Data;
using System.Data.Common;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class TrnaRepository(IOracleConnectionFactory connectionFactory) : ITrnaRepository
{
    public async Task<IReadOnlyList<TrnaResponse>> GetTrnaAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT ED.APSA_ID AS ApsaId,
       ED.EMPR_EMPR AS EmprEmpr,
       ED.DIVI_DIVI AS DiviDivi,
       AP.APSA_NOMAPS AS ApsaNomaps,
       TRIM(FP.FAPR_NOMBRE) AS FaprNombre,
       FP.FAPR_CODIGO AS FaprCodigo,
       FP.FAPR_VALOR AS FaprValor,
       ROUND(PK_TRNA.FAUCO_TRNA(ED.EMPR_EMPR, ED.DIVI_DIVI, ED.APSA_ID, FP.FAPR_CODIGO, :1, :2), 10) AS Trna
FROM AUCO_APSEMPRDIVI ED
INNER JOIN AUCO_FACTPRODUCCION FP ON (ED.APSA_ID = FP.APSA_ID)
INNER JOIN AUCO_APSASEO AP ON (ED.APSA_ID = AP.APSA_ID)
WHERE ED.APSA_ID = :3
  AND ED.APEM_ESTADO = 1
  AND FP.FAPR_VALOR > 0
ORDER BY FP.FAPR_CODIGO";

        var parameters = new DynamicParameters();
        parameters.Add("1", anno);
        parameters.Add("2", mes);
        parameters.Add("3", aps);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<TrnaResponse>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
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
