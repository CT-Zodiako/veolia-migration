using Dapper;
using System.Data.Common;

namespace Veolia.Api.Infrastructure.Data;

public sealed class Sui853ReadmodelsRepository(IOracleConnectionFactory connectionFactory) : ISui853ReadmodelsRepository
{
    public async Task<IReadOnlyList<object>> GetVcfgApsEmpresaAsync(CancellationToken cancellationToken)
    {
        const string sql = @"SELECT * FROM SUI.VCFGAPSEMPRESA";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql);
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<IReadOnlyList<object>> GetVcfgApsDocumentoAsync(CancellationToken cancellationToken)
    {
        const string sql = @"SELECT * FROM SUI.VCFGAPSDOCUMENTO";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql);
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<IReadOnlyList<object>> GetTcfgApsAsync(CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    TCFG_APS_ID,
    NOMBRE_APS
FROM SUI.TCFG_APS
ORDER BY NOMBRE_APS";

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

    private static object ToDictionaryObject(dynamic row)
    {
        if (row is IDictionary<string, object> dictionary)
        {
            return new Dictionary<string, object>(dictionary, StringComparer.OrdinalIgnoreCase);
        }

        var objectDictionary = (IDictionary<string, object>)row;
        return new Dictionary<string, object>(objectDictionary, StringComparer.OrdinalIgnoreCase);
    }
}
