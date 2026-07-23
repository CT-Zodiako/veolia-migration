using System.Data.Common;
using Dapper;
using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public sealed class ProyeccionRepository(IOracleConnectionFactory connectionFactory) : IProyeccionRepository
{
    public async Task<IReadOnlyList<ProyeccionListItem>> ConsultaAsync(long apsaId, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT P.PROYID AS ProyId,
                   P.APS AS ApsaId,
                   P.PROYNOMBRE AS ProyNombre,
                   P.PROYDESCRIPCION AS ProyDescripcion,
                   P.PROYTIPO100 AS ProyTipo100,
                   P.PROYANNODES AS ProyAnnoDes,
                   P.PROYMESDES AS ProyMesDes,
                   P.PROYANNOHAS AS ProyAnnoHas,
                   P.PROYMESHAS AS ProyMesHas,
                   P.PROYESTADO AS ProyEstado,
                   P.PROYFECHA AS ProyFecha
              FROM PROY_PROYECCION P
             WHERE P.APS = :1
             ORDER BY P.PROYNOMBRE";

        var parameters = new DynamicParameters();
        parameters.Add("1", apsaId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ProyeccionListItem>(sql, parameters);
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ProyeccionListItem>> ConsultaGeneralAsync(int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT P.PROYID AS ProyId,
                   P.APS AS ApsaId,
                   P.PROYNOMBRE AS ProyNombre,
                   P.PROYDESCRIPCION AS ProyDescripcion,
                   P.PROYTIPO100 AS ProyTipo100,
                   P.PROYANNODES AS ProyAnnoDes,
                   P.PROYMESDES AS ProyMesDes,
                   P.PROYANNOHAS AS ProyAnnoHas,
                   P.PROYMESHAS AS ProyMesHas,
                   P.PROYESTADO AS ProyEstado,
                   P.PROYFECHA AS ProyFecha
              FROM PROY_PROYECCION P
             WHERE :1 BETWEEN P.PROYANNODES AND P.PROYANNOHAS
               AND :2 BETWEEN 1 AND 12
               AND P.PROYESTADO = 1
             ORDER BY P.PROYID DESC";

        var parameters = new DynamicParameters();
        parameters.Add("1", anno);
        parameters.Add("2", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ProyeccionListItem>(sql, parameters);
        return rows.ToList();
    }

    public async Task<ProyeccionDetail?> ConsultaProyAsync(long proyId, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT P.PROYID AS ProyId,
                   P.APS AS ApsaId,
                   P.PROYNOMBRE AS ProyNombre,
                   P.PROYTIPO100 AS ProyTipo100,
                   P.PROYANNODES AS ProyAnnoDes,
                   P.PROYMESDES AS ProyMesDes,
                   P.PROYANNOHAS AS ProyAnnoHas,
                   P.PROYMESHAS AS ProyMesHas,
                   P.PROYESTADO AS ProyEstado,
                   P.USUA_USUA AS UsuaUsua,
                   P.PROYFECHA AS ProyFecha
              FROM PROY_PROYECCION P
             WHERE P.PROYID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", proyId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QueryFirstOrDefaultAsync<ProyeccionDetail>(sql, parameters);
    }

    public async Task<MutationResponse> CrearAsync(ProyeccionCreateRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        const string insertSql = @"
            INSERT INTO PROY_PROYECCION
            (PROYID, APS, PROYNOMBRE, PROYTIPO100, PROYANNODES, PROYMESDES, PROYANNOHAS, PROYMESHAS, PROYESTADO, USUA_USUA, PROYFECHA)
            VALUES (SPROY_PROYECCION.NEXTVAL, :1, :2, :3, :4, :5, :6, :7, 1, :8, SYSDATE)
            RETURNING PROYID INTO :9";

        var parameters = new DynamicParameters();
        parameters.Add("1", request.ApsaId);
        parameters.Add("2", request.ProyNombre);
        parameters.Add("3", request.ProyTipo100);
        parameters.Add("4", request.ProyAnnoDes);
        parameters.Add("5", request.ProyMesDes);
        parameters.Add("6", request.ProyAnnoHas);
        parameters.Add("7", request.ProyMesHas);
        parameters.Add("8", usuarioId);
        parameters.Add("9", dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.Output);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, cancellationToken: cancellationToken));
        if (rows == 0)
        {
            return new MutationResponse { Success = false, Message = "No fue posible crear la proyección." };
        }

        return new MutationResponse
        {
            Success = true,
            Message = "Proyección creada correctamente.",
            Id = parameters.Get<long>("9")
        };
    }

    public async Task<MutationResponse> EditarAsync(long proyId, ProyeccionUpdateRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"
            UPDATE PROY_PROYECCION
               SET APS = :1,
                   PROYNOMBRE = :2,
                   PROYTIPO100 = :3,
                   PROYANNODES = :4,
                   PROYMESDES = :5,
                   PROYANNOHAS = :6,
                   PROYMESHAS = :7
             WHERE PROYID = :8
               AND PROYESTADO = 1";

        var parameters = new DynamicParameters();
        parameters.Add("1", request.ApsaId);
        parameters.Add("2", request.ProyNombre);
        parameters.Add("3", request.ProyTipo100);
        parameters.Add("4", request.ProyAnnoDes);
        parameters.Add("5", request.ProyMesDes);
        parameters.Add("6", request.ProyAnnoHas);
        parameters.Add("7", request.ProyMesHas);
        parameters.Add("8", proyId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

        return rows == 0
            ? new MutationResponse { Success = false, Message = "No se encontró la proyección." }
            : new MutationResponse { Success = true, Message = "Proyección actualizada correctamente.", Id = proyId };
    }

    public async Task<MutationResponse> EliminarAsync(long proyId, CancellationToken cancellationToken)
    {
        const string sql = @"
            UPDATE PROY_PROYECCION
               SET PROYESTADO = 0
             WHERE PROYID = :1
               AND PROYESTADO = 1";

        var parameters = new DynamicParameters();
        parameters.Add("1", proyId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

        return rows == 0
            ? new MutationResponse { Success = false, Message = "No se encontró la proyección." }
            : new MutationResponse { Success = true, Message = "Proyección eliminada correctamente.", Id = proyId };
    }

    public async Task<IReadOnlyList<object>> UltimasTarifasAsync(long apsaId, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT D.ANNO,
                   D.MES,
                   D.DELTIPC,
                   D.DELTIPCC,
                   D.DELTSMLV,
                   D.DELTIOEXP,
                   D.DELTFACPRODUC,
                   D.DELTINDIPCC,
                   D.DELTIPCCS
              FROM PROY_DETLINEATIEMPO D
             WHERE D.APSA_ID = :1
             ORDER BY D.ANNO DESC, D.MES DESC
             FETCH FIRST 1 ROWS ONLY";

        var parameters = new DynamicParameters();
        parameters.Add("1", apsaId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, parameters);
        return rows.Select(ToDictionaryObject).ToList();
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

    private static object ToDictionaryObject(dynamic row)
    {
        if (row is IDictionary<string, object> dictionary)
        {
            return new Dictionary<string, object>(dictionary, StringComparer.OrdinalIgnoreCase);
        }

        var objectDictionary = (IDictionary<string, object>)row;
        return new Dictionary<string, object>(objectDictionary, StringComparer.OrdinalIgnoreCase);
    }
}
