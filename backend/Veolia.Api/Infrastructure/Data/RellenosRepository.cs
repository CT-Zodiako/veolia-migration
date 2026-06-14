using Dapper;
using System.Data.Common;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class RellenosRepository(IOracleConnectionFactory connectionFactory) : IRellenosRepository
{
    public async Task<IReadOnlyList<RellenoResponse>> ListarAsync(CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    RELL_ID,
    RELL_NOMRELLENO,
    RELL_DESCRIPCION,
    RELL_ESTADO,
    RELL_PROPIO,
    RELL_REGIONAL,
    RELL_NUSD,
    RELL_FECHACREACION,
    USUA_USUA
FROM AUCO_RELLENOS
WHERE RELL_ESTADO = 1
ORDER BY RELL_NOMRELLENO";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<RellenoResponse>(sql);
        return rows.ToList();
    }

    public async Task<IReadOnlyList<RellenoResponse>> ConsultarAsync(RellenoRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    RELL_ID,
    RELL_NOMRELLENO,
    RELL_DESCRIPCION,
    RELL_ESTADO,
    RELL_PROPIO,
    RELL_REGIONAL,
    RELL_NUSD,
    RELL_FECHACREACION,
    USUA_USUA
FROM AUCO_RELLENOS
WHERE RELL_ID = :rellId";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<RellenoResponse>(sql, new { rellId = request.rell_id });
        return rows.ToList();
    }

    public async Task<object?> CrearAsync(CrearRellenoRequest request, long sisuId, CancellationToken cancellationToken)
    {
        const string sql = @"
INSERT INTO AUCO_RELLENOS (
    RELL_ID,
    RELL_NOMRELLENO,
    RELL_DESCRIPCION,
    RELL_ESTADO,
    RELL_PROPIO,
    RELL_REGIONAL,
    RELL_NUSD,
    RELL_FECHACREACION,
    USUA_USUA
) VALUES (
    SAUCO_RELLENOS.NEXTVAL,
    :rellNomrelleno,
    :rellDescripcion,
    :rellEstado,
    :rellPropio,
    :rellRegional,
    :rellNusd,
    SYSDATE,
    :usuaUsua
)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rowsAffected = await connection.ExecuteAsync(new CommandDefinition(
            sql,
            new
            {
                rellNomrelleno = request.rell_nomrelleno,
                rellDescripcion = request.rell_descripcion,
                rellEstado = request.rell_estado,
                rellPropio = request.rell_propio,
                rellRegional = request.rell_regional,
                rellNusd = request.rell_nusd,
                usuaUsua = sisuId
            },
            cancellationToken: cancellationToken));

        return new { rowsAffected };
    }

    public async Task<object?> EditarAsync(long id, EditarRellenoRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"
UPDATE AUCO_RELLENOS
SET RELL_NOMRELLENO = :rellNomrelleno,
    RELL_DESCRIPCION = :rellDescripcion,
    RELL_ESTADO = :rellEstado,
    RELL_PROPIO = :rellPropio,
    RELL_REGIONAL = :rellRegional,
    RELL_NUSD = :rellNusd
WHERE RELL_ID = :rellId";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rowsAffected = await connection.ExecuteAsync(new CommandDefinition(
            sql,
            new
            {
                rellNomrelleno = request.rell_nomrelleno,
                rellDescripcion = request.rell_descripcion,
                rellEstado = request.rell_estado,
                rellPropio = request.rell_propio,
                rellRegional = request.rell_regional,
                rellNusd = request.rell_nusd,
                rellId = id
            },
            cancellationToken: cancellationToken));

        return new { rowsAffected };
    }

    public async Task<object?> EliminarAsync(long id, CancellationToken cancellationToken)
    {
        const string sql = @"
UPDATE AUCO_RELLENOS
SET RELL_ESTADO = 0
WHERE RELL_ID = :rellId";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rowsAffected = await connection.ExecuteAsync(new CommandDefinition(sql, new { rellId = id }, cancellationToken: cancellationToken));
        return new { rowsAffected };
    }

    private async Task<System.Data.IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken)
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
