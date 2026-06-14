using System.Data;
using System.Data.Common;
using Dapper;

namespace Veolia.Api.Infrastructure.Data;

public sealed class EjecucionProyeccionRepository(IOracleConnectionFactory connectionFactory) : IEjecucionProyeccionRepository
{
    public async Task<string> EjecutarProyectarAsync(long proyId, long apsaId, long usuarioId, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_PROYLIQUIDA.fproy_proyectar(:1, :2, :3); END;";

        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.String, direction: ParameterDirection.Output, size: 4000);
        parameters.Add("1", proyId);
        parameters.Add("2", apsaId);
        parameters.Add("3", usuarioId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return (parameters.Get<string>("res") ?? string.Empty).Trim();
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
