using Dapper;
using System.Data;
using System.Data.Common;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Sui853.Cdft;

// CDFT — consulta directa contra SUI.TCDFT_QRT_ANUAL. Ver doc migracion
// (módulo SUI853) para el detalle del endpoint legacy /cdft.
public sealed class CdftRepository(IOracleConnectionFactory connectionFactory) : ICdftRepository
{
    public async Task<IReadOnlyList<CdftRowDto>> GetByAnnoAsync(int anno, CancellationToken cancellationToken)
    {
        // ANNO_FISCAL es VARCHAR2 en Oracle (no numérico) — hay que bindear
        // el parámetro como string, sino el match contra la columna falla.
        //
        // Los CAST(... AS NUMBER(18,6)) son defensivos: sin escala explícita,
        // Dapper rompe con "Error parsing column N" cuando el valor es 0 (bug
        // real ya visto en ReliqCargueRepository con columnas NUMBER/FLOAT).
        //
        // Los alias de columna usan PascalCase sin guion bajo (AnnoFiscal,
        // NombreAps, ...) para que Dapper los mapee por nombre a CdftRowDto
        // sin configuración adicional (Dapper no normaliza SNAKE_CASE).
        const string sql = @"
SELECT ANNO_FISCAL AS AnnoFiscal,
       APS AS NombreAps,
       CAST(CDFT_CORRIENTES AS NUMBER(18,6)) AS ValorCorriente,
       CAST(CDFT_2018 AS NUMBER(18,6)) AS Valor2018,
       CAST(QRTZ AS NUMBER(18,6)) AS Qrtz
  FROM SUI.TCDFT_QRT_ANUAL
 WHERE ANNO_FISCAL = :anno";

        var parameters = new DynamicParameters();
        parameters.Add("anno", anno.ToString());

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CdftRowDto>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken, commandTimeout: 120));

        return rows.AsList();
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
