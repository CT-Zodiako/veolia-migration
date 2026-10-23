using System.Data.Common;
using Dapper;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Regulator.Proyecciones;

public sealed class ProyeccionRepository(IOracleConnectionFactory connectionFactory) : IProyeccionRepository
{
    public async Task<IReadOnlyList<ProyeccionListItem>> ConsultaAsync(long apsaId, CancellationToken cancellationToken)
    {
        // Legacy real (proyeccionescontroller.consulta) es "SELECT * FROM proy_proyeccion WHERE APS = :1
        // ORDER BY PROYNOMBRE" sin joins -- se usa como poblador liviano del selector de Proyección en
        // otras pantallas (Líneas de Tiempo, Crecimiento, Proyectar, Subsidios). Los joins a APS/Tipo/Usuario
        // solo aparecen en consultageneral (ver ConsultaGeneralAsync), que alimenta la grilla de Crear Proyección.
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

    public async Task<IReadOnlyList<ProyeccionListItem>> ConsultaGeneralAsync(long sisuId, CancellationToken cancellationToken)
    {
        // El legacy real (proyeccionescontroller.consultageneral en back-tarificador) no filtra
        // por año/mes: lista las proyecciones de todos los APS que el usuario tiene autorizados
        // (auco_apsusuarios), sin filtro de PROYESTADO. El backend nuevo filtraba antes por
        // anno/mes (nunca enviados por el frontend -> 0 -> lista siempre vacía).
        const string sql = @"
            SELECT P.PROYID AS ProyId,
                   P.APS AS ApsaId,
                   AA.APSA_NOMAPS AS ApsaNombre,
                   P.PROYNOMBRE AS ProyNombre,
                   P.PROYDESCRIPCION AS ProyDescripcion,
                   P.PROYTIPO100 AS ProyTipo100,
                   PA.PARA_NOMBRE AS ProyTipoNombre,
                   P.PROYANNODES AS ProyAnnoDes,
                   P.PROYMESDES AS ProyMesDes,
                   P.PROYANNOHAS AS ProyAnnoHas,
                   P.PROYMESHAS AS ProyMesHas,
                   P.PROYESTADO AS ProyEstado,
                   P.PROYFECHA AS ProyFecha,
                   S.SISU_CORREO AS SisuCorreo
              FROM PROY_PROYECCION P
              JOIN AUCO_APSASEO AA ON AA.APSA_ID = P.APS
              JOIN AUGE_PARAMETROS PA ON (PA.PARA_PARA = P.PROYTIPO100 AND PA.CLAS_CLAS = 100)
              JOIN AUGE_SISUSUARIO S ON S.SISU_ID = P.USUARIO
             WHERE P.APS IN (SELECT AU.APSA_ID FROM AUCO_APSUSUARIOS AU WHERE AU.SISU_ID = :1)
             ORDER BY S.SISU_CORREO";

        var parameters = new DynamicParameters();
        parameters.Add("1", sisuId);

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
                   P.PROYDESCRIPCION AS ProyDescripcion,
                   P.PROYTIPO100 AS ProyTipo100,
                   P.PROYANNODES AS ProyAnnoDes,
                   P.PROYMESDES AS ProyMesDes,
                   P.PROYANNOHAS AS ProyAnnoHas,
                   P.PROYMESHAS AS ProyMesHas,
                   P.PROYESTADO AS ProyEstado,
                   P.USUARIO AS UsuaUsua,
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
            (PROYID, APS, PROYNOMBRE, PROYDESCRIPCION, PROYTIPO100, PROYANNODES, PROYMESDES, PROYANNOHAS, PROYMESHAS, PROYESTADO, USUARIO, PROYFECHA)
            VALUES (SPROY_PROYECCION.NEXTVAL, :1, :2, :3, :4, :5, :6, :7, :8, 1, :9, SYSDATE)
            RETURNING PROYID INTO :10";

        // Legacy registro (proyecciones/controller.js:18) escribe PROYDESCRIPCION.
        var parameters = new DynamicParameters();
        parameters.Add("1", request.ApsaId);
        parameters.Add("2", request.ProyNombre);
        parameters.Add("3", request.ProyDescripcion);
        parameters.Add("4", request.ProyTipo100);
        parameters.Add("5", request.ProyAnnoDes);
        parameters.Add("6", request.ProyMesDes);
        parameters.Add("7", request.ProyAnnoHas);
        parameters.Add("8", request.ProyMesHas);
        parameters.Add("9", usuarioId);
        parameters.Add("10", dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.Output);

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
            Id = parameters.Get<long>("10")
        };
    }

    public async Task<MutationResponse> EditarAsync(long proyId, ProyeccionUpdateRequest request, CancellationToken cancellationToken)
    {
        // Legacy modificar (proyecciones/controller.js:145): solo nombre, descripción, tipo y
        // horizonte hasta, por PROYID sin condición de PROYESTADO. El APS y el "Desde" (última
        // tarifa al crear) quedan fijos.
        const string sql = @"
            UPDATE PROY_PROYECCION
               SET PROYNOMBRE = :1,
                   PROYDESCRIPCION = :2,
                   PROYTIPO100 = :3,
                   PROYANNOHAS = :4,
                   PROYMESHAS = :5
             WHERE PROYID = :6";

        var parameters = new DynamicParameters();
        parameters.Add("1", request.ProyNombre);
        parameters.Add("2", request.ProyDescripcion);
        parameters.Add("3", request.ProyTipo100);
        parameters.Add("4", request.ProyAnnoHas);
        parameters.Add("5", request.ProyMesHas);
        parameters.Add("6", proyId);

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
        // Legacy getLastTarifas (proyecciones/controller.js:186-207): "SELECT last_tarifa FROM
        // vpro_lastarifa WHERE apsa_id = :1", primera fila, LAST_TARIFA = "YYYY-MM". Alimenta el
        // "Desde" fijo de Crear Proyección (formCrear.vue:292-297).
        const string sql = "SELECT LAST_TARIFA FROM VPRO_LASTARIFA WHERE APSA_ID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", apsaId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var lastTarifa = await connection.QueryFirstOrDefaultAsync<string>(sql, parameters);
        var partes = lastTarifa?.Split('-');
        if (partes is not { Length: >= 2 }
            || !int.TryParse(partes[0], out var anno)
            || !int.TryParse(partes[1], out var mes))
        {
            return [];
        }

        return [new UltimaTarifaResponse { Anno = anno, Mes = mes }];
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
