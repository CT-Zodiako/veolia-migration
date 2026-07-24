using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Data.Common;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class FacturacionRepository(IOracleConnectionFactory connectionFactory) : IFacturacionRepository
{
    private sealed record VistaColumnas(string Vista, string Aps, string Anno, string Mes);

    private static readonly IReadOnlyDictionary<string, VistaColumnas> VistaMap = new Dictionary<string, VistaColumnas>(StringComparer.OrdinalIgnoreCase)
    {
        ["facturacion"] = new VistaColumnas("VACUO_FACTURACION", "APSA_ID", "TARI_ANNO", "TARI_MES"),
        ["detafacturacion"] = new VistaColumnas("VACUO_DETAFACTURACION", "APSA_ID", "RETA_ANNO", "RETA_MES"),
        ["facturacionclus"] = new VistaColumnas("VACUO_FACTURACIONCLUS", "APSA_ID", "TARI_ANNO", "TARI_MES"),
        ["facturaciondinc"] = new VistaColumnas("VACUO_FACTURACIONDINC", "APSA_ID", "TARI_ANNO", "TARI_MES"),
        ["facturacionelectronica"] = new VistaColumnas("vauco_fatelectronica", "codaps", "anno", "mes")
    };

    public async Task<IReadOnlyList<IDictionary<string, object?>>> ConsultarAsync(string vista, int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        if (!VistaMap.TryGetValue(vista, out var columnas))
        {
            throw new ValidationException("Vista de facturación no soportada.");
        }

        var (queryAnno, queryMes) = ResolvePeriodoAnterior(anno, mes);
        var sql = $@"SELECT *
FROM {columnas.Vista}
WHERE {columnas.Aps} = :aps
  AND {columnas.Anno} = :anno
  AND {columnas.Mes} = :mes";

        using var connection = (OracleConnection)await OpenConnectionAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.BindByName = true;
        command.Parameters.Add(new OracleParameter("aps", aps));
        command.Parameters.Add(new OracleParameter("anno", queryAnno));
        command.Parameters.Add(new OracleParameter("mes", queryMes));

        // Algunas vistas (ej. VACUO_FACTURACIONCLUS) exponen columnas NUMBER calculadas sin
        // precisión/escala fija; OracleDataReader.GetValue intenta convertirlas a System.Decimal
        // y tira InvalidCastException si el valor no entra. Como estos campos se redondean a 2-6
        // decimales para mostrar, es seguro suprimir la excepción y dejar que trunque el valor.
        using var reader = (OracleDataReader)await command.ExecuteReaderAsync(cancellationToken);
        reader.SuppressGetDecimalInvalidCastException = true;

        var result = new List<IDictionary<string, object?>>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var row = new Dictionary<string, object?>();
            for (var i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = await reader.IsDBNullAsync(i, cancellationToken) ? null : reader.GetValue(i);
            }

            result.Add(row);
        }

        return result;
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
