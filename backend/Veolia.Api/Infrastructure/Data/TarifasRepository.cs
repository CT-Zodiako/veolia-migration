using Dapper;
using System.Data.Common;

namespace Veolia.Api.Infrastructure.Data;

public sealed class TarifasRepository(IOracleConnectionFactory connectionFactory) : ITarifasRepository
{
    public async Task<IReadOnlyList<object>> ConsultaTarifaAsync(long aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = "SELECT * FROM vauco_tarifa4 WHERE apsa_id = :1 AND tari_anno = :2 AND tari_mes = :3";

        var parameters = new DynamicParameters();
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, parameters);
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<IReadOnlyList<object>> ConsultaGeneralAsync(int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = "SELECT * FROM vauco_tarifa4 WHERE tari_anno = :2 AND tari_mes = :3";

        var parameters = new DynamicParameters();
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, parameters);
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<IReadOnlyList<object>> TarifaPorComponenteAsync(long aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = "SELECT * FROM vauco_tardetalle WHERE APSA_ID = :1 AND TARI_ANNO = :2 AND TARI_MES = :3";

        var parameters = new DynamicParameters();
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, parameters);
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<IReadOnlyList<object>> TarifaPorComponenteGeneralAsync(int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT A.apsa_nomaps, C.* FROM vauco_tardetalle C INNER JOIN auco_apsaseo A ON (C.APSA_ID = A.apsa_id) WHERE TARI_ANNO = :1 AND TARI_MES = :2";

        var parameters = new DynamicParameters();
        parameters.Add("1", anno);
        parameters.Add("2", mes);

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
