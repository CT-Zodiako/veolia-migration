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
WHERE INDI_ANNO = :anno
  AND INDI_MES = :mes
  AND INDI_ESTADO = 1
ORDER BY PARA_INDICE20011";

        using var connection = connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<IndicesResponseDto>(new CommandDefinition(sql, new { anno, mes }, cancellationToken: cancellationToken));
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
WHERE INDI_ID = :id
  AND INDI_ESTADO = 1";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<IndicesResponseDto>(new CommandDefinition(sql, new { id }, cancellationToken: cancellationToken));
    }

    public async Task<long> CrearAsync(IndicesCrearRequestDto dto, long usuarioId, CancellationToken cancellationToken = default)
    {
        const string dupSql = @"
SELECT COUNT(1)
FROM AUCO_INDICESCRA
WHERE INDI_ANNO = :anno
  AND INDI_MES = :mes
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
    :paraId,
    :anno,
    :mes,
    1,
    :valor,
    :mitadValor,
    SYSDATE,
    :usuario
)";

        const string firstIdSql = @"
SELECT MIN(INDI_ID)
FROM AUCO_INDICESCRA
WHERE INDI_ANNO = :anno
  AND INDI_MES = :mes
  AND INDI_ESTADO = 1";

        using var connection = connectionFactory.CreateConnection();
        using var transaction = connection.BeginTransaction();

        var existing = await connection.ExecuteScalarAsync<int>(new CommandDefinition(dupSql, new { anno = dto.Anno, mes = dto.Mes }, transaction, cancellationToken: cancellationToken));
        if (existing > 0)
        {
            throw new InvalidOperationException("DUPLICATE_PERIOD");
        }

        foreach (var item in dto.Valores)
        {
            var parameters = new
            {
                paraId = item.Id,
                anno = dto.Anno,
                mes = dto.Mes,
                valor = item.Val,
                mitadValor = item.Val / 2m,
                usuario = usuarioId
            };

            await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction, cancellationToken: cancellationToken));
        }

        var firstId = await connection.ExecuteScalarAsync<long>(new CommandDefinition(firstIdSql, new { anno = dto.Anno, mes = dto.Mes }, transaction, cancellationToken: cancellationToken));
        transaction.Commit();
        return firstId;
    }

    public async Task<bool> EditarAsync(IndicesEditarRequestDto dto, CancellationToken cancellationToken = default)
    {
        const string sql = @"
UPDATE AUCO_INDICESCRA
SET INDI_VALOR = :valor,
    INDI_MITADVALOR = :mitadValor
WHERE PARA_INDICE20011 = :paraId
  AND INDI_ANNO = :anno
  AND INDI_MES = :mes
  AND INDI_ESTADO = 1";

        using var connection = connectionFactory.CreateConnection();
        using var transaction = connection.BeginTransaction();

        var affected = 0;
        foreach (var item in dto.Valores)
        {
            var parameters = new
            {
                valor = item.Val,
                mitadValor = item.Val / 2m,
                paraId = item.Id,
                anno = dto.Anno,
                mes = dto.Mes
            };

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
WHERE PARA_INDICE20011 = :paraId
  AND INDI_ANNO = :anno
  AND INDI_MES = :mes
  AND INDI_ESTADO = 1";

        using var connection = connectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync(new CommandDefinition(sql, new { paraId = indiceTipoId, anno, mes }, cancellationToken: cancellationToken));
        return affected > 0;
    }

    public async Task<IReadOnlyList<IndiceCatalogoDto>> GetCatalogoAsync(CancellationToken cancellationToken = default)
    {
        const string sql = @"
SELECT PARA_PARA AS ParaPara, PARA_NOMBRE AS ParaNombre
FROM AUGE_PARAMETROS
WHERE CLAS_CLAS = 20011
  AND PARA_ESTADO = 'A'
ORDER BY PARA_PARA";

        using var connection = connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<IndiceCatalogoDto>(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return rows.AsList();
    }
}
