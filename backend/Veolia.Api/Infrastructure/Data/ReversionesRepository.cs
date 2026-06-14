using Dapper;
using System.Data.Common;

namespace Veolia.Api.Infrastructure.Data;

public sealed class ReversionesRepository(IOracleConnectionFactory connectionFactory) : IReversionesRepository
{
    public async Task<int> CrearAutorizacion(int aps, int anno, int mes, string descripcion, int sisuId, CancellationToken cancellationToken)
    {
        const string sql = "INSERT INTO REVE_AUTORIZACION (APSA_ID, AUTO_ANNO, AUTO_MES, AUTO_DESCRIPCION, AUTO_FECCREA, USUA_USUARIO) VALUES(:1, :2, :3, :4, SYSDATE, :5)";

        var parameters = new DynamicParameters();
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);
        parameters.Add("4", descripcion);
        parameters.Add("5", sisuId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<object>> DetalladoAutorizacion(int sisuId, CancellationToken cancellationToken)
    {
        const string sql = "SELECT * FROM vreve_autorizacion WHERE SISU_ID = :1 ORDER BY 2 DESC, 3 DESC, 1";

        var parameters = new DynamicParameters();
        parameters.Add("1", sisuId);

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
