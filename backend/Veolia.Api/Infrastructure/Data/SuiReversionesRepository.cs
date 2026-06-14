using Dapper;
using System.Data.Common;

namespace Veolia.Api.Infrastructure.Data;

public sealed class SuiReversionesRepository(IOracleConnectionFactory connectionFactory) : ISuiReversionesRepository
{
    public Task<IReadOnlyList<object>> GetReversionesF19(int aps, CancellationToken cancellationToken) =>
        QueryAsync("SELECT * FROM SUI_REVF19 WHERE APSA_ID = :1", aps, cancellationToken);

    public Task<IReadOnlyList<object>> GetReversionesF23(int aps, CancellationToken cancellationToken) =>
        QueryAsync("SELECT * FROM SUI_REVF23 WHERE APSA_ID = :1", aps, cancellationToken);

    public Task<IReadOnlyList<object>> GetReversionesF24(int aps, CancellationToken cancellationToken) =>
        QueryAsync("SELECT * FROM SUI_REVF24 WHERE APSA_ID = :1", aps, cancellationToken);

    public Task<IReadOnlyList<object>> GetReversionesF35(int aps, CancellationToken cancellationToken) =>
        QueryAsync("SELECT * FROM SUI_REVF35 WHERE APSA_ID = :1", aps, cancellationToken);

    public Task<IReadOnlyList<object>> GetReversionesF36(int aps, CancellationToken cancellationToken) =>
        QueryAsync("SELECT * FROM SUI_REVF36 WHERE APSA_ID = :1", aps, cancellationToken);

    private async Task<IReadOnlyList<object>> QueryAsync(string sql, int aps, CancellationToken cancellationToken)
    {
        var parameters = new DynamicParameters();
        parameters.Add("1", aps);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, parameters);
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
