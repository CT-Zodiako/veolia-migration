using Dapper;
using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Data.Common;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class FacturacionRepository(IOracleConnectionFactory connectionFactory) : IFacturacionRepository
{
    private static readonly IReadOnlyDictionary<string, string> VistaMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["facturacion"] = "VACUO_FACTURACION",
        ["detafacturacion"] = "VACUO_DETAFACTURACION",
        ["facturacionclus"] = "VACUO_FACTURACIONCLUS",
        ["facturaciondinc"] = "VACUO_FACTURACIONDINC",
        ["facturacionelectronica"] = "VAUCO_FATELECTRONICA"
    };

    public async Task<IReadOnlyList<IDictionary<string, object?>>> ConsultarAsync(string vista, int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        if (!VistaMap.TryGetValue(vista, out var viewName))
        {
            throw new ValidationException("Vista de facturación no soportada.");
        }

        var (queryAnno, queryMes) = ResolvePeriodoAnterior(anno, mes);
        var sql = $@"SELECT *
FROM {viewName}
WHERE APS_ID = :aps
  AND ANNO = :anno
  AND MES = :mes";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(new CommandDefinition(sql, new { aps, anno = queryAnno, mes = queryMes }, cancellationToken: cancellationToken));

        return rows
            .Select(r => (IDictionary<string, object?>)(r as IDictionary<string, object?> ?? new Dictionary<string, object?>()))
            .ToList();
    }

    public static (int anno, int mes) ResolvePeriodoAnterior(int anno, int mes)
        => mes == 1 ? (anno - 1, 12) : (anno, mes - 1);

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
