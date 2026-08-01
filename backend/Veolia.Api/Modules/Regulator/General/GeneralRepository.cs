using Veolia.Api.Infrastructure.Data;
using Dapper;
using System.Data.Common;

namespace Veolia.Api.Modules.Regulator.General;

public sealed class GeneralRepository(IOracleConnectionFactory connectionFactory) : IGeneralRepository
{
    public async Task<IReadOnlyList<object>> ConsultarUsoAsync(CancellationToken cancellationToken)
    {
        const string sql = "SELECT * FROM AUCO_CLASESUSO";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<IReadOnlyList<object>> ConsultarCostosAsync(CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT PARA_PARA, PARA_NOMBRE
FROM AUGE_PARAMETROS
WHERE CLAS_CLAS = 20010
  AND PARA_ESTADO = 'A'
ORDER BY PARA_NOMBRE";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(new CommandDefinition(sql, cancellationToken: cancellationToken));
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
