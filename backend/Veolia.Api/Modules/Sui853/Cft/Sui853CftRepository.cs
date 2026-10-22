using Dapper;
using System.Data;
using System.Data.Common;
using System.Text.Json.Nodes;
using Oracle.ManagedDataAccess.Types;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Sui853.Cft;

// Los 27 endpoints de SUI853/CFT+CVNA+CVA ejecutan el mismo SQL genérico,
// cambiando solo el código de formato SUI hardcodeado (nunca provisto por
// el cliente). Ver doc migracion/modules/sui853/CFT.md.
public sealed class Sui853CftRepository(IOracleConnectionFactory connectionFactory) : ISui853CftRepository
{
    public async Task<JsonObject?> GetFormatoAsync(string codigo, CancellationToken cancellationToken)
    {
        const string sql = "SELECT SUI.f_render_formato2(:codigo) AS json FROM dual";

        var parameters = new DynamicParameters();
        parameters.Add("codigo", codigo);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var raw = await connection.ExecuteScalarAsync<object>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken, commandTimeout: 120));

        var payload = Formato2Payload.Parse(raw is OracleClob clob ? clob.Value : raw?.ToString());
        if (payload is not null)
        {
            Formato2Payload.ApplyDialogHeader(payload, await GetTituloCompuestoAsync(connection, codigo, cancellationToken));
        }

        return payload;
    }

    // El "title" que devuelve f_render_formato2() es solo el NOMBRE (ej. "SG1 -
    // CVA"). El legacy (back-tarificador/src/modules/sui853/CVA|CVNA/controller.js)
    // lo deja intacto y agrega meta.dialogHeader, que TablaScrollHorizontal.vue
    // (dialogHeaderValue) muestra junto al botón de exportar y como header del
    // detalle. Se arma con una consulta aparte a sui.TCAT_DOCUMENTO:
    // "{CODIGO} | {NOMBRE} | {DESCRIPCION}", ej.
    // "F853S104 | SG1 - CVA | Generado automáticamente para SUI.TSEG1_CVA".
    private static async Task<string?> GetTituloCompuestoAsync(IDbConnection connection, string codigo, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT td.CODIGO || ' | ' || td.NOMBRE || ' | ' || td.DESCRIPCION AS TITULO
              FROM sui.TCAT_DOCUMENTO td
             WHERE td.CODIGO = :codigo";

        var parameters = new DynamicParameters();
        parameters.Add("codigo", codigo);

        return await connection.QueryFirstOrDefaultAsync<string>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
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
