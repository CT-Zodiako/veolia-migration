using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Text.Json.Nodes;
using Oracle.ManagedDataAccess.Types;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Sui853.Comercial;

namespace Veolia.Api.Modules.Sui853.Operaciones;

public sealed class ResiduosGeneradosRepository(IOracleConnectionFactory factory, IComercialRepository summaries)
    : IResiduosGeneradosRepository
{
    public async Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(
        ResiduosGeneradosRequest request, CancellationToken cancellationToken)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        using var connection = (DbConnection)factory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT APS, NOMAPS, ANNO, MES, NUAP, TIP_SITIO, NRO_SITIO, PLACA,
                   FEC_ENTRADA, HOR_ENTRADA, HOR_SALIDA, NUM_MICRO, TON_RBU, TON_RBR,
                   TON_RSOU, TON_RSOR, SIS_MEDICION, TON_APROVE, VLR_PEAJES, FEC_REGIST, USU_REG
            FROM SUI.TGEN_RESGENERADOS
            WHERE APS = :aps AND ANNO = :anno AND MES = :mes
            """;
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
                if (await reader.IsDBNullAsync(i, cancellationToken))
                {
                    row[reader.GetName(i)] = null;
                    continue;
                }
                // Match the existing SUI853 precision-preserving Oracle reader.
                row[reader.GetName(i)] = reader.GetProviderSpecificValue(i) switch
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

    // Both legacy routes use the same global F853GR02 report, not APS/year/month filters.
    public Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken)
        => summaries.GetSummaryAsync(cancellationToken);

    private static void AddParameter(DbCommand command, string name, object value, DbType type)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.DbType = type;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }
}
