using Dapper;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Modules.Reliquidaciones.Contracts;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Reliquidaciones.Crear;

public sealed class ReliqCrearRepository(IOracleConnectionFactory connectionFactory) : IReliqCrearRepository
{
    public async Task<ReliquidacionDto?> CrearAsync(CrearReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken)
    {
        const string insertCabeceraSql = @"
            INSERT INTO RELQRELIQUIDA
            (RELQID, APSA_ID, RELQNOMBRE, RELQDESCRIPCION, RELQDESDE, RELQHASTA, RELQESTADO, RELQUSUSOLICITA, RELQUSUAPRUEBA, RELQFECHA)
            VALUES (SRELQRELIQUIDA.NEXTVAL, :1, :2, :3, :4, :5, :6, :7, :8, SYSDATE)
            RETURNING RELQID INTO :9";

        const string insertFiltroSql = @"
            INSERT INTO FILTRO_COMPARACOSTO
            (FICO_ID, RELQID, APSA_ID, ANNO, MES, USUA_USUA, FECHA)
            VALUES (
                (SELECT NVL(MAX(FICO_ID), 0) + 1 FROM FILTRO_COMPARACOSTO),
                :1,
                :2,
                TO_NUMBER(SUBSTR(:3, 1, 4)),
                TO_NUMBER(SUBSTR(:4, 5, 2)),
                :5,
                SYSDATE
            )";

        const string ejecutarExtraccionSql = @"
            BEGIN
                :1 := PK_RELI.freli_extraccion(:2, :3, :4, :5, :6);
            END;";

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            var cabeceraParams = new DynamicParameters();
            cabeceraParams.Add("1", request.ApsaId);
            cabeceraParams.Add("2", request.RelqNombre);
            cabeceraParams.Add("3", request.RelqDescripcion);
            cabeceraParams.Add("4", request.RelqDesde);
            cabeceraParams.Add("5", request.RelqHasta);
            cabeceraParams.Add("6", string.IsNullOrWhiteSpace(request.Estado) ? "CREADA" : request.Estado);
            cabeceraParams.Add("7", request.UsuSolicita);
            cabeceraParams.Add("8", request.UsuAprueba);
            cabeceraParams.Add("9", dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.Output);

            await connection.ExecuteAsync(new CommandDefinition(insertCabeceraSql, cabeceraParams, transaction: transaction, cancellationToken: cancellationToken));
            var relqId = cabeceraParams.Get<long>("9");

            var filtroParams = new DynamicParameters();
            filtroParams.Add("1", relqId);
            filtroParams.Add("2", request.ApsaId);
            filtroParams.Add("3", request.RelqDesde);
            filtroParams.Add("4", request.RelqHasta);
            filtroParams.Add("5", usuarioId);

            await connection.ExecuteAsync(new CommandDefinition(insertFiltroSql, filtroParams, transaction: transaction, cancellationToken: cancellationToken));

            var extraccionParams = new DynamicParameters();
            extraccionParams.Add("1", dbType: System.Data.DbType.String, size: 1000, direction: System.Data.ParameterDirection.Output);
            extraccionParams.Add("2", request.ApsaId);
            extraccionParams.Add("3", relqId);
            extraccionParams.Add("4", usuarioId);
            extraccionParams.Add("5", request.RelqDesde);
            extraccionParams.Add("6", request.RelqHasta);

            await connection.ExecuteAsync(new CommandDefinition(ejecutarExtraccionSql, extraccionParams, transaction: transaction, cancellationToken: cancellationToken));
            var resultadoExtraccion = extraccionParams.Get<string>("1");

            if (!string.IsNullOrWhiteSpace(resultadoExtraccion) &&
                !string.Equals(resultadoExtraccion, "STUB_OK", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(resultadoExtraccion, "OK", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"PK_RELI.freli_extraccion retornó: {resultadoExtraccion}");
            }

            transaction.Commit();

            const string getSql = @"
                SELECT R.RELQID AS RelqId,
                       R.APSA_ID AS ApsaId,
                       R.RELQNOMBRE AS RelqNombre,
                       R.RELQDESCRIPCION AS RelqDescripcion,
                       R.RELQDESDE AS RelqDesde,
                       R.RELQHASTA AS RelqHasta,
                       R.RELQESTADO AS RelqEstado,
                       R.RELQUSUSOLICITA AS RelqSolicita,
                       R.RELQUSUAPRUEBA AS RelqAprueba,
                       R.RELQFECHA AS RelqFecha
                  FROM RELQRELIQUIDA R
                 WHERE R.RELQID = :1";

            var getParams = new DynamicParameters();
            getParams.Add("1", relqId);

            return await connection.QueryFirstOrDefaultAsync<ReliquidacionDto>(new CommandDefinition(getSql, getParams, cancellationToken: cancellationToken));
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<IReadOnlyList<ReliquidacionDto>> GetReliquidacionesAsync(long? apsaId, CancellationToken cancellationToken)
    {
        // Legacy (reliq/controller.js getReliquidaciones) no filtraba por APS: traía todas
        // las reliquidaciones activas de cualquier APS. Se replica ese comportamiento cuando
        // no se recibe un apsaId real (>0); el filtro por APS puntual sigue disponible vía
        // GetReliquidacionByApsAsync.
        var filtrarPorAps = apsaId is > 0;

        var sql = @"
            SELECT R.RELQID AS RelqId,
                   R.APSA_ID AS ApsaId,
                   R.RELQNOMBRE AS RelqNombre,
                   R.RELQDESCRIPCION AS RelqDescripcion,
                   R.RELQDESDE AS RelqDesde,
                   R.RELQHASTA AS RelqHasta,
                   R.RELQESTADO AS RelqEstado,
                   R.RELQUSUSOLICITA AS RelqSolicita,
                   R.RELQUSUAPRUEBA AS RelqAprueba,
                   R.RELQFECHA AS RelqFecha
              FROM RELQRELIQUIDA R
              LEFT JOIN AUCO_APSASEO A ON A.APSA_ID = R.APSA_ID
              LEFT JOIN AUGE_SISUSUARIO U ON U.SISU_ID = R.RELQUSUSOLICITA";

        sql += filtrarPorAps ? " WHERE R.APSA_ID = :1" : string.Empty;
        sql += " ORDER BY R.RELQID DESC";

        var parameters = new DynamicParameters();
        if (filtrarPorAps)
        {
            parameters.Add("1", apsaId);
        }

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliquidacionDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<ReliquidacionDto?> GetReliquidacionByApsAsync(long apsaId, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT R.RELQID AS RelqId,
                   R.APSA_ID AS ApsaId,
                   R.RELQNOMBRE AS RelqNombre,
                   R.RELQDESCRIPCION AS RelqDescripcion,
                   R.RELQDESDE AS RelqDesde,
                   R.RELQHASTA AS RelqHasta,
                   R.RELQESTADO AS RelqEstado,
                   R.RELQUSUSOLICITA AS RelqSolicita,
                   R.RELQUSUAPRUEBA AS RelqAprueba,
                   R.RELQFECHA AS RelqFecha
              FROM RELQRELIQUIDA R
             WHERE R.APSA_ID = :1
               AND R.RELQESTADO IN ('1', '2', 'CREADA', 'APLICADA')
             ORDER BY R.RELQID DESC
             FETCH FIRST 1 ROWS ONLY";

        var parameters = new DynamicParameters();
        parameters.Add("1", apsaId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QueryFirstOrDefaultAsync<ReliquidacionDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    public async Task<bool> ActualizarAsync(ActualizarReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken)
    {
        const string sql = @"
            UPDATE RELQRELIQUIDA
               SET APSA_ID = :1,
                   RELQNOMBRE = :2,
                   RELQDESCRIPCION = :3,
                   RELQDESDE = :4,
                   RELQHASTA = :5,
                   RELQESTADO = :6,
                   RELQUSUSOLICITA = :7,
                   RELQUSUAPRUEBA = :8,
                   RELQFECHA = SYSDATE
             WHERE RELQID = :9";

        var parameters = new DynamicParameters();
        parameters.Add("1", request.ApsaId);
        parameters.Add("2", request.RelqNombre);
        parameters.Add("3", request.RelqDescripcion);
        parameters.Add("4", request.RelqDesde);
        parameters.Add("5", request.RelqHasta);
        parameters.Add("6", request.RelqEstado);
        parameters.Add("7", request.UsuSolicita);
        parameters.Add("8", request.UsuAprueba);
        parameters.Add("9", request.RelqId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task<bool> EliminarAsync(long relqId, CancellationToken cancellationToken)
    {
        const string sql = @"DELETE FROM RELQRELIQUIDA WHERE RELQID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", relqId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows > 0;
    }

    private async Task<OracleConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.CreateConnection();
        if (connection is not OracleConnection oracleConnection)
        {
            throw new InvalidOperationException("OracleConnectionFactory must return OracleConnection.");
        }

        if (oracleConnection.State != System.Data.ConnectionState.Open)
        {
            await oracleConnection.OpenAsync(cancellationToken);
        }

        return oracleConnection;
    }
}
