using Dapper;
using System.Data;
using System.Data.Common;
using System.Text.Json;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Sui853.Cft;

// Los 12 endpoints de SUI853/CFT ejecutan el mismo SQL genérico, cambiando
// solo el código de formato SUI hardcodeado (nunca provisto por el cliente).
// Ver doc migracion/modules/sui853/CFT.md.
public sealed class Sui853CftRepository(IOracleConnectionFactory connectionFactory) : ISui853CftRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<Formato2ResponseDto?> GetFormatoAsync(string codigo, CancellationToken cancellationToken)
    {
        const string sql = "SELECT SUI.f_render_formato2(:codigo) AS json FROM dual";

        var parameters = new DynamicParameters();
        parameters.Add("codigo", codigo);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken, commandTimeout: 120));

        var first = rows.FirstOrDefault();
        if (first is null)
        {
            return null;
        }

        var jsonValue = first.JSON;
        var jsonString = jsonValue?.ToString();
        if (string.IsNullOrWhiteSpace(jsonString))
        {
            return null;
        }

        return JsonSerializer.Deserialize<Formato2ResponseDto>(jsonString, JsonOptions);
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
