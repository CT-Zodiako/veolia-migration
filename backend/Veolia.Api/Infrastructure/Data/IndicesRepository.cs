using Dapper;
using Veolia.Api.Contracts.Indices;

namespace Veolia.Api.Infrastructure.Data;

public sealed class IndicesRepository(IOracleConnectionFactory connectionFactory) : IIndicesRepository
{
    public async Task<IReadOnlyList<IndicesResponseDto>> GetByPeriodAsync(int anno, int mes, CancellationToken cancellationToken = default)
    {
        const string sql = @"
SELECT
    INDI_ID AS IndiId,
    PARA_INDICE20011 AS ParaIndice20011,
    INDI_ANNO AS IndiAnno,
    INDI_MES AS IndiMes,
    INDI_ESTADO AS IndiEstado,
    INDI_VALOR AS IndiValor,
    INDI_MITADVALOR AS IndiMitadValor,
    INDI_FECHACREACION AS IndiFechaCreacion,
    USUA_USUA AS UsuaUsua
FROM AUCO_INDICESCRA
WHERE INDI_ANNO = :1
  AND INDI_MES = :2
  AND INDI_ESTADO = 1
ORDER BY PARA_INDICE20011";

        using var connection = connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<IndicesResponseDto>(new CommandDefinition(sql, new { p1 = anno, p2 = mes }, cancellationToken: cancellationToken));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<IndicesResponseDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        const string sql = @"
SELECT
    INDI_ID AS IndiId,
    PARA_INDICE20011 AS ParaIndice20011,
    INDI_ANNO AS IndiAnno,
    INDI_MES AS IndiMes,
    INDI_ESTADO AS IndiEstado,
    INDI_VALOR AS IndiValor,
    INDI_MITADVALOR AS IndiMitadValor,
    INDI_FECHACREACION AS IndiFechaCreacion,
    USUA_USUA AS UsuaUsua
FROM AUCO_INDICESCRA
WHERE INDI_ESTADO = 1
ORDER BY INDI_ANNO DESC, INDI_MES DESC, PARA_INDICE20011";

        using var connection = connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<IndicesResponseDto>(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return rows.AsList();
    }

    public async Task<IndicesResponseDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        const string sql = @"
SELECT
    INDI_ID AS IndiId,
    PARA_INDICE20011 AS ParaIndice20011,
    INDI_ANNO AS IndiAnno,
    INDI_MES AS IndiMes,
    INDI_ESTADO AS IndiEstado,
    INDI_VALOR AS IndiValor,
    INDI_MITADVALOR AS IndiMitadValor,
    INDI_FECHACREACION AS IndiFechaCreacion,
    USUA_USUA AS UsuaUsua
FROM AUCO_INDICESCRA
WHERE INDI_ID = :1
  AND INDI_ESTADO = 1";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<IndicesResponseDto>(new CommandDefinition(sql, new { p1 = id }, cancellationToken: cancellationToken));
    }

    public async Task<long> CrearAsync(IndicesCrearRequestDto dto, long usuarioId, CancellationToken cancellationToken = default)
    {
        const string dupSql = @"
SELECT COUNT(1)
FROM AUCO_INDICESCRA
WHERE INDI_ANNO = :1
  AND INDI_MES = :2
  AND INDI_ESTADO = 1";

        const string insertSql = @"
INSERT INTO AUCO_INDICESCRA
(
    INDI_ID,
    PARA_INDICE20011,
    INDI_ANNO,
    INDI_MES,
    INDI_ESTADO,
    INDI_VALOR,
    INDI_MITADVALOR,
    INDI_FECHACREACION,
    USUA_USUA
)
VALUES
(
    SAUCO_INDICESCRA.NEXTVAL,
    :1,
    :2,
    :3,
    1,
    :4,
    :5,
    SYSDATE,
    :6
)";

        const string firstIdSql = @"
SELECT MIN(INDI_ID)
FROM AUCO_INDICESCRA
WHERE INDI_ANNO = :1
  AND INDI_MES = :2
  AND INDI_ESTADO = 1";

        using var connection = connectionFactory.CreateConnection();
        using var transaction = connection.BeginTransaction();

        var existing = await connection.ExecuteScalarAsync<int>(new CommandDefinition(dupSql, new { p1 = dto.Anno, p2 = dto.Mes }, transaction, cancellationToken: cancellationToken));
        if (existing > 0)
        {
            throw new InvalidOperationException("DUPLICATE_PERIOD");
        }

        foreach (var item in dto.Valores)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p1", item.Id);
            parameters.Add("p2", dto.Anno);
            parameters.Add("p3", dto.Mes);
            parameters.Add("p4", item.Val);
            parameters.Add("p5", item.Val / 2m);
            parameters.Add("p6", usuarioId);

            await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction, cancellationToken: cancellationToken));
        }

        var firstId = await connection.ExecuteScalarAsync<long>(new CommandDefinition(firstIdSql, new { p1 = dto.Anno, p2 = dto.Mes }, transaction, cancellationToken: cancellationToken));
        transaction.Commit();
        return firstId;
    }

    public async Task<bool> EditarAsync(IndicesEditarRequestDto dto, CancellationToken cancellationToken = default)
    {
        const string sql = @"
UPDATE AUCO_INDICESCRA
SET INDI_VALOR = :1,
    INDI_MITADVALOR = :2
WHERE PARA_INDICE20011 = :3
  AND INDI_ANNO = :4
  AND INDI_MES = :5
  AND INDI_ESTADO = 1";

        using var connection = connectionFactory.CreateConnection();
        using var transaction = connection.BeginTransaction();

        var affected = 0;
        foreach (var item in dto.Valores)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p1", item.Val);
            parameters.Add("p2", item.Val / 2m);
            parameters.Add("p3", item.Id);
            parameters.Add("p4", dto.Anno);
            parameters.Add("p5", dto.Mes);

            affected += await connection.ExecuteAsync(new CommandDefinition(sql, parameters, transaction, cancellationToken: cancellationToken));
        }

        transaction.Commit();
        return affected > 0;
    }

    public async Task<bool> EliminarAsync(long indiceTipoId, int anno, int mes, CancellationToken cancellationToken = default)
    {
        const string sql = @"
UPDATE AUCO_INDICESCRA
SET INDI_ESTADO = 0
WHERE PARA_INDICE20011 = :1
  AND INDI_ANNO = :2
  AND INDI_MES = :3
  AND INDI_ESTADO = 1";

        using var connection = connectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync(new CommandDefinition(sql, new { p1 = indiceTipoId, p2 = anno, p3 = mes }, cancellationToken: cancellationToken));
        return affected > 0;
    }
}
