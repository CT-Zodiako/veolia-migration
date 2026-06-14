using Dapper;
using System.Data;
using System.Data.Common;

namespace Veolia.Api.Infrastructure.Data;

public sealed class ValidacionesRepository(IOracleConnectionFactory connectionFactory) : IValidacionesRepository
{
    private static readonly HashSet<string> AllowedFunctions =
    [
        "fauco_generasui",
        "fauco_cpsuivsfact",
        "fauco_cpproductividad",
        "fauco_cpenero",
        "fauco_integracion",
        "fauco_existerelleno",
        "fauco_tarifacert",
        "fauco_existarifa",
        "fauco_existarifacert"
    ];

    public async Task<string?> ExecuteAsync(string oracleFunction, int aps, int anno, int mes, CancellationToken ct)
    {
        if (!AllowedFunctions.Contains(oracleFunction))
        {
            throw new ArgumentException($"Oracle function not allowed: {oracleFunction}", nameof(oracleFunction));
        }

        var plsql = $"BEGIN :res := VEOLIA_APP.PK_VALGRAL.{oracleFunction}(:1,:2,:3); END;";

        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.String, direction: ParameterDirection.Output, size: 4000);
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(ct);
        await connection.ExecuteAsync(new CommandDefinition(plsql, parameters, cancellationToken: ct));
        return parameters.Get<string>("res");
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
