using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Text.Json.Nodes;
using Dapper;
using Oracle.ManagedDataAccess.Types;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Sui853.Comercial;

public sealed class ComercialRepository(IOracleConnectionFactory factory) : IComercialRepository
{
    public async Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(ComercialRequest request, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT * FROM SUI.TGEN_COMERCIAL WHERE APS = :aps AND ANNO = :anno AND MES = :mes";
        command.CommandTimeout = 120;
        AddParameter(command, "aps", request.ApsId, DbType.String);
        AddParameter(command, "anno", request.Year, DbType.Int32);
        AddParameter(command, "mes", request.Month, DbType.Int32);
        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var rows = new List<Dictionary<string, object?>>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var row = new Dictionary<string, object?>(StringComparer.Ordinal);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                if (await reader.IsDBNullAsync(i, cancellationToken)) { row[reader.GetName(i)] = null; continue; }
                var providerValue = reader.GetProviderSpecificValue(i);
                row[reader.GetName(i)] = providerValue switch
                {
                    OracleDecimal number => number.ToString().Replace(CultureInfo.CurrentCulture.NumberFormat.NumberDecimalSeparator, "."),
                    OracleClob clob => clob.Value,
                    _ => reader.GetValue(i)
                };
            }
            rows.Add(row);
        }
        return rows;
    }

    public async Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        const string code = "F853GR02"; // Active legacy route: intentionally not parameter-scoped.
        var raw = await connection.ExecuteScalarAsync<object>(new CommandDefinition(
            "SELECT SUI.f_render_formato2(:codigo) AS json FROM dual", new { codigo = code },
            commandTimeout: 120, cancellationToken: cancellationToken));
        var json = raw is OracleClob clob ? clob.Value : raw?.ToString();
        if (string.IsNullOrWhiteSpace(json)) return null;
        var title = await connection.ExecuteScalarAsync<string>(new CommandDefinition(
            "SELECT td.CODIGO || ' | ' || td.NOMBRE || ' | ' || td.DESCRIPCION FROM sui.TCAT_DOCUMENTO td WHERE td.CODIGO = :codigo",
            new { codigo = code }, commandTimeout: 120, cancellationToken: cancellationToken));
        return ComercialPayload.ParseSummary(json, title);
    }

    private async Task<DbConnection> OpenAsync(CancellationToken cancellationToken)
    {
        var connection = (DbConnection)factory.CreateConnection();
        try { await connection.OpenAsync(cancellationToken); return connection; }
        catch { connection.Dispose(); throw; }
    }

    private static void AddParameter(DbCommand command, string name, object value, DbType type)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.DbType = type;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }
}
