using System.Data;
using System.Data.Common;
using Dapper;

namespace Veolia.Api.Infrastructure.Data;

public sealed class EjecucionProyeccionRepository(IOracleConnectionFactory connectionFactory) : IEjecucionProyeccionRepository
{
    public async Task<int> EjecutarProyectarAsync(long proyId, long apsaId, long usuarioId, CancellationToken cancellationToken)
    {
        // Legacy real (proyeccionescontroller.ejecutarproyectar): la función PL/SQL
        // PK_PROYLIQUIDA.fproy_proyectar devuelve NUMBER (no texto) y el frontend
        // legacy considera éxito cuando el valor es exactamente 1
        // (response.data.res === 1). El bind de salida tiene que ser numérico, no
        // string -- con DbType.String esta llamada rompe contra el Oracle real.
        const string sql = "BEGIN :res := PK_PROYLIQUIDA.fproy_proyectar(:1, :2, :3); END;";

        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int32, direction: ParameterDirection.Output);
        parameters.Add("1", proyId);
        parameters.Add("2", apsaId);
        parameters.Add("3", usuarioId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return parameters.Get<int>("res");
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
