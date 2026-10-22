using Dapper;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Regulator.Aprovechamiento;

public sealed class AprovechamientoRepository(IOracleConnectionFactory connectionFactory) : IAprovechamientoRepository
{
    // Legacy suministros/controller.js:805: positional VALUES without a column list.
    public const string InsertSql = "INSERT INTO aprov_activar VALUES(:1, :2, :3, :4, SYSDATE, :5)";

    public static DynamicParameters BuildInsertParameters(int aps, int anno, int mes, int activar, long usuarioId)
    {
        var parameters = new DynamicParameters();
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);
        parameters.Add("4", activar);
        parameters.Add("5", usuarioId);
        return parameters;
    }

    public async Task<AprovechamientoResponseDto?> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken = default)
    {
        const string sql = @"
SELECT
    APSID AS ApsId,
    APROANNO AS AproAnno,
    APROMES AS AproMes,
    APROACTIVAR AS AproActivar
FROM APROV_ACTIVAR
WHERE APSID = :aps
  AND APROANNO = :anno
  AND APROMES = :mes";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<AprovechamientoResponseDto>(
            new CommandDefinition(sql, new { aps, anno, mes }, cancellationToken: cancellationToken));
    }

    public async Task ActualizarAsync(int aps, int anno, int mes, bool activar, long usuarioId, CancellationToken cancellationToken = default)
    {
        // AS-IS: legacy hace upsert en el handler (consulta y decide INSERT vs UPDATE)
        // en vez de en la base -- se replica la misma lógica acá.
        var existente = await ConsultarAsync(aps, anno, mes, cancellationToken);
        var valorActivar = activar ? 1 : 0;

        using var connection = connectionFactory.CreateConnection();

        if (existente is null)
        {
            await connection.ExecuteAsync(new CommandDefinition(
                InsertSql, BuildInsertParameters(aps, anno, mes, valorActivar, usuarioId), cancellationToken: cancellationToken));
            return;
        }

        const string updateSql = @"
UPDATE APROV_ACTIVAR
SET APROACTIVAR = :activar
WHERE APSID = :aps
  AND APROANNO = :anno
  AND APROMES = :mes";

        await connection.ExecuteAsync(new CommandDefinition(
            updateSql, new { activar = valorActivar, aps, anno, mes }, cancellationToken: cancellationToken));
    }
}
