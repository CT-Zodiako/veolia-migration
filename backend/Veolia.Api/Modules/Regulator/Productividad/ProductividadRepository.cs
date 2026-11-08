using Dapper;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Regulator.Productividad;

public sealed class ProductividadRepository(IOracleConnectionFactory connectionFactory) : IProductividadRepository
{
    // ROUND keeps PROD_VALOR inside decimal range: ODP.NET throws reading a NUMBER with more
    // than 28 significant digits into decimal (same issue CdftRepository works around), and
    // 6 decimals is the precision legacy Productividad.vue shows (redondeo(PROD_VALOR, 6)).
    public const string ConsultarSql = @"
SELECT
    APSA_ID AS ApsaId,
    PROD_ANNO AS ProdAnno,
    PROD_MES AS ProdMes,
    ROUND(PROD_VALOR, 6) AS ProdValor
FROM AUCO_PRODUCTIVIDAD
WHERE APSA_ID = :aps
  AND PROD_ANNO = :anno
  AND PROD_MES = :mes";

    public async Task<ProductividadResponseDto?> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken = default)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<ProductividadResponseDto>(
            new CommandDefinition(ConsultarSql, new { aps, anno, mes }, cancellationToken: cancellationToken));
    }

    public async Task CrearAsync(int aps, int anno, int mes, decimal valor, long usuarioId, CancellationToken cancellationToken = default)
    {
        // Columnas de fecha/usuario sin DDL disponible (no está documentado en el legacy) -- se
        // replica el INSERT posicional AS-IS (VALUES sin lista de columnas) tal como en
        // back-tarificador/src/modules/suministros/controller.js:527, que sí funciona en producción.
        const string sql = @"
INSERT INTO AUCO_PRODUCTIVIDAD
VALUES (:aps, :anno, :mes, :valor, SYSDATE, :usuario)";

        using var connection = connectionFactory.CreateConnection();
        await connection.ExecuteAsync(new CommandDefinition(
            sql, new { aps, anno, mes, valor, usuario = usuarioId }, cancellationToken: cancellationToken));
    }

    public async Task<bool> EditarAsync(int aps, int anno, int mes, decimal valor, CancellationToken cancellationToken = default)
    {
        const string sql = @"
UPDATE AUCO_PRODUCTIVIDAD
SET PROD_VALOR = :valor
WHERE APSA_ID = :aps
  AND PROD_ANNO = :anno
  AND PROD_MES = :mes";

        using var connection = connectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync(new CommandDefinition(
            sql, new { valor, aps, anno, mes }, cancellationToken: cancellationToken));
        return affected > 0;
    }
}
