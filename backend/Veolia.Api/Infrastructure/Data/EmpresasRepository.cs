using Dapper;
using System.Data.Common;

namespace Veolia.Api.Infrastructure.Data;

public sealed class EmpresasRepository(IOracleConnectionFactory connectionFactory) : IEmpresasRepository
{
    public async Task<IReadOnlyList<object>> GetAllAsync(CancellationToken cancellationToken)
    {
        const string sql = "SELECT * FROM AUGE_EMPRESAS ORDER BY EMPR_NOMBRE";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql);
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<object?> CreateAsync(string nombre, int estado, int propia, string? nuap, long sisuId, CancellationToken cancellationToken)
    {
        const string sql = "INSERT INTO AUGE_EMPRESAS VALUES (SAUGE_EMPRESAS.nextval, :1, :2, :3, sysdate, :4, :5)";

        var parameters = new DynamicParameters();
        parameters.Add("1", nombre);
        parameters.Add("2", estado);
        parameters.Add("3", propia);
        parameters.Add("4", sisuId);
        parameters.Add("5", nuap);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rowsAffected = await connection.ExecuteAsync(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

        return new { rowsAffected };
    }

    public async Task<IReadOnlyList<object>> ConsultarPropiasAsync(long aps, int propia, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT es.* FROM AUGE_EMPRESAS es
INNER JOIN AUCO_APSEMPRDIVI apsem ON (es.empr_empr = apsem.empr_empr AND apsa_id = :1)
WHERE EMPR_PROPIA = :2 AND ES.EMPR_ESTADO = 1";

        var parameters = new DynamicParameters();
        parameters.Add("1", aps);
        parameters.Add("2", propia);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, parameters);
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<IReadOnlyList<object>> ConsultaEmprAsync(long empr, CancellationToken cancellationToken)
    {
        const string sql = "SELECT * FROM AUGE_EMPRESAS WHERE EMPR_EMPR = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", empr);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, parameters);
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<object?> UpdateAsync(long id, string nombre, int estado, int propia, string? nuap, CancellationToken cancellationToken)
    {
        const string sql = "UPDATE AUGE_EMPRESAS SET EMPR_NOMBRE = :1, EMPR_ESTADO = :2, EMPR_PROPIA = :3, EMPR_NUAP = :5 WHERE EMPR_EMPR = :4";

        var parameters = new DynamicParameters();
        parameters.Add("1", nombre);
        parameters.Add("2", estado);
        parameters.Add("3", propia);
        parameters.Add("5", nuap);
        parameters.Add("4", id);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rowsAffected = await connection.ExecuteAsync(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

        return new { rowsAffected };
    }

    public async Task<object?> EliminarAsync(long id, CancellationToken cancellationToken)
    {
        const string sql = "UPDATE AUGE_EMPRESAS SET EMPR_ESTADO = 0 WHERE EMPR_EMPR = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", id);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rowsAffected = await connection.ExecuteAsync(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

        return new { rowsAffected };
    }

    public async Task<object?> ToggleEstadoAsync(long id, CancellationToken cancellationToken)
    {
        const string sql = @"
            UPDATE AUGE_EMPRESAS 
            SET EMPR_ESTADO = CASE WHEN EMPR_ESTADO = 1 THEN 0 ELSE 1 END
            WHERE EMPR_EMPR = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", id);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rowsAffected = await connection.ExecuteAsync(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

        return new { rowsAffected };
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
