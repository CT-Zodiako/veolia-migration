using Dapper;
using Veolia.Api.Contracts.Aprovechamiento;

namespace Veolia.Api.Infrastructure.Data;

public sealed class AprovechamientoRepository(IOracleConnectionFactory connectionFactory) : IAprovechamientoRepository
{
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
            const string insertSql = @"
INSERT INTO APROV_ACTIVAR (APSID, APROANNO, APROMES, APROACTIVAR, APROFECHA, USUARIO)
VALUES (:aps, :anno, :mes, :activar, SYSDATE, :usuario)";

            await connection.ExecuteAsync(new CommandDefinition(
                insertSql, new { aps, anno, mes, activar = valorActivar, usuario = usuarioId }, cancellationToken: cancellationToken));
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
