using Dapper;
using System.Data;
using System.Data.Common;
using System.Text.Json;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class InformesRepository(IOracleConnectionFactory connectionFactory) : IInformesRepository
{
    public async Task<InformeCostosResponse?> GetResumenVariablesAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT * FROM json_json
            WHERE apsa_id = :aps
              AND json_anno = :anno
              AND json_mes = :mes
              AND json_tipo200 = 1";

        var parameters = new DynamicParameters();
        parameters.Add("aps", aps);
        parameters.Add("anno", anno);
        parameters.Add("mes", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken, commandTimeout: 120));

        var first = rows.FirstOrDefault();
        if (first is null)
        {
            return null;
        }

        var documentValue = first.JSON_DOCUMENT;
        var jsonString = documentValue?.ToString();
        if (string.IsNullOrWhiteSpace(jsonString))
        {
            return null;
        }

        var parsed = JsonSerializer.Deserialize<InformeCostosResponse>(jsonString, JsonOptions);
        return parsed;
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

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };
}
