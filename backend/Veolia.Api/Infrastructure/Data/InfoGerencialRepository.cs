using Dapper;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class InfoGerencialRepository(IOracleConnectionFactory connectionFactory) : IInfoGerencialRepository
{
    public Task<IReadOnlyList<object>> GetDetalleCostosAsync(int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT A.APSA_NOMAPS, C.*
              FROM VAUCO_COSTOS C
              INNER JOIN AUCO_APSASEO A ON (C.APSCOSTO = A.APSA_ID)
             WHERE C.ANNOCOSTO = :1
               AND C.MESCOSTO = :2";

        return QueryRowsAsync(sql, [anno, mes], cancellationToken);
    }

    public Task<IReadOnlyList<object>> GetDetalleSubAporteAsync(int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT S.*, P.PARA_NOMBRE
              FROM VAUCO_SUBSAPORT S
              INNER JOIN AUGE_PARAMETROS P ON (S.PARA_TIPPRED20016 = P.PARA_PARA AND P.CLAS_CLAS = 20016)
             WHERE S.SUCO_ANNO = :1
               AND S.SUCO_MES = :2
               AND S.SUCO_ESTADO = 1";

        return QueryRowsAsync(sql, [anno, mes], cancellationToken);
    }

    public Task<IReadOnlyList<object>> GetInfoApsEmprDiviAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT AE.EMPR_NOMBRE, AD.DIVI_NOMBRE, AI.*
              FROM AUCO_INFOAPSEMPRDIVI AI
              JOIN AUGE_EMPRESAS AE ON AE.EMPR_EMPR = AI.EMPR_EMPR
              JOIN AUGE_DIVIPOLI AD ON AD.DIVI_DIVI = AI.DIVI_DIVI
             WHERE AI.APSA_ID = :1
               AND AI.IAED_ANNO = :2
               AND AI.IAED_MES = :3
             ORDER BY AE.EMPR_NOMBRE, AD.DIVI_NOMBRE";

        return QueryRowsAsync(sql, [aps, anno, mes], cancellationToken);
    }

    public Task<IReadOnlyList<object>> GetInfoEmprDiviAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        // CORRECCIÓN: el join/filtro/columnas previos (AEDI_ID, I.APSA_ID, IEDI_ANNO/IEDI_MES)
        // eran esquema fabricado que no coincide con Oracle real. Legacy AS-IS
        // (infogerenciales/controller.js:31) usa join compuesto EMPR_EMPR+DIVI_DIVI,
        // filtra APSA_ID a través de la tabla unida, y las columnas son INED_ANNO/INED_MES
        // (confirmado también en CostosRepository.cs:403-409 sobre la misma familia de columnas).
        const string sql = @"
            SELECT E.EMPR_NOMBRE, I.*
              FROM AUCO_INFOEMPRDIVI I
              INNER JOIN AUCO_APSEMPRDIVI D ON D.EMPR_EMPR = I.EMPR_EMPR AND I.DIVI_DIVI = D.DIVI_DIVI
              INNER JOIN AUGE_EMPRESAS E ON E.EMPR_EMPR = I.EMPR_EMPR
             WHERE D.APSA_ID = :1
               AND I.INED_ANNO = :2
               AND I.INED_MES = :3
             ORDER BY E.EMPR_NOMBRE";

        return QueryRowsAsync(sql, [aps, anno, mes], cancellationToken);
    }

    public Task<IReadOnlyList<object>> GetInfoApsRellenoAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        // CORRECCIÓN: columnas previas (RELL_RELL, RELL_NOMBRE) eran esquema fabricado.
        // Legacy AS-IS (infogerenciales/controller.js:37) y RellenosRepository.cs (ya
        // verificado) confirman las columnas reales: RELL_ID, RELL_NOMRELLENO.
        const string sql = @"
            SELECT R.RELL_NOMRELLENO, I.*
              FROM AUCO_INFOAPSRELLENO I
              INNER JOIN AUCO_RELLENOS R ON R.RELL_ID = I.RELL_ID
             WHERE I.APSA_ID = :1
               AND I.IARE_ANNO = :2
               AND I.IARE_MES = :3
               AND R.RELL_ESTADO = 1
             ORDER BY R.RELL_NOMRELLENO";

        return QueryRowsAsync(sql, [aps, anno, mes], cancellationToken);
    }

    public Task<IReadOnlyList<object>> GetDashBoardGerencialAsync(int anno, int mes, long usuario, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT APS.APSA_ID,
                   APS.APSA_NOMAPS,
                   T.TARI_FECHACREACION,
                   U.SISU_CORREO
              FROM AUCO_APSASEO APS
              LEFT JOIN AUCO_TARIFAS T ON (APS.APSA_ID = T.APSA_ID
                                       AND T.TARI_ANNO = :1
                                       AND T.TARI_MES = :2
                                       AND T.FAPR_CODIGO = 4
                                       AND T.PARA_TIPTAR20012 = 1
                                       AND T.PARA_UBICACION20016 = 2
                                       AND T.PARA_TIPFAC20014 = 2)
              LEFT JOIN AUGE_SISUSUARIO U ON (T.USUA_USUA = U.SISU_ID)
              INNER JOIN AUCO_APSUSUARIOS AU ON (APS.APSA_ID = AU.APSA_ID AND AU.SISU_ID = :3 AND AU.APSI_ESTADO = 1)
             WHERE APS.APSA_ESTADO = 1
             ORDER BY APS.APSA_NOMAPS";

        return QueryRowsAsync(sql, [anno, mes, usuario], cancellationToken);
    }

    public Task<IReadOnlyList<object>> GetCostoPodaAsync(int aps, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT *
              FROM VPODA_REPORTE
             WHERE APSA_ID = :1
             ORDER BY PERIODO DESC";

        return QueryRowsAsync(sql, [aps], cancellationToken);
    }

    public Task<IReadOnlyList<object>> GetDescuentosAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT AI.*, AP.PARA_NOMBRE
              FROM AUCO_INFOAPSDESCOST AI
              JOIN AUGE_PARAMETROS AP ON AI.PARA_COSTO20010 = AP.PARA_PARA AND AP.CLAS_CLAS = 20010
             WHERE AI.APSA_ID = :1
               AND AI.DESC_ANNO = :2
               AND AI.DESC_MES = :3
               AND AI.DESC_ESTADO = 1";

        return QueryRowsAsync(sql, [aps, anno, mes], cancellationToken);
    }

    public Task<IReadOnlyList<object>> GetCatalogoDescuentoAsync(int id, int aps, int anno, int mes, bool isNew, CancellationToken cancellationToken)
    {
        // Costos disponibles: catálogo AUGE_PARAMETROS (CLAS_CLAS=20010) que todavía no
        // tienen un descuento activo cargado para este APS/período. En modo edición se
        // suma (UNION) el costo propio de la fila que se está editando, para que siga
        // apareciendo seleccionable en el dropdown aunque ya esté "usado" por sí mismo.
        const string sqlDisponibles = @"
            SELECT AP.PARA_PARA, AP.PARA_NOMBRE, 0 AS DESC_VALOR
              FROM (SELECT PARA_COSTO20010
                      FROM AUCO_INFOAPSDESCOST
                     WHERE DESC_ESTADO = 1 AND APSA_ID = :1 AND DESC_ANNO = :2 AND DESC_MES = :3) T1
              RIGHT JOIN AUGE_PARAMETROS AP ON (T1.PARA_COSTO20010 = AP.PARA_PARA AND AP.PARA_ESTADO = 'A')
             WHERE AP.CLAS_CLAS = 20010
               AND T1.PARA_COSTO20010 IS NULL";

        if (isNew)
        {
            return QueryRowsAsync(sqlDisponibles, [aps, anno, mes], cancellationToken);
        }

        const string sqlConActual = sqlDisponibles + @"
            UNION
            SELECT AP.PARA_PARA, AP.PARA_NOMBRE, AI.DESC_VALOR
              FROM AUCO_INFOAPSDESCOST AI
              JOIN AUGE_PARAMETROS AP ON AI.PARA_COSTO20010 = AP.PARA_PARA AND AP.CLAS_CLAS = 20010
             WHERE AI.DESC_ID = :4
             ORDER BY PARA_NOMBRE";

        return QueryRowsAsync(sqlConActual, [aps, anno, mes, id], cancellationToken);
    }

    public async Task InsertDescuentoAsync(int aps, int anno, int mes, int paraId, decimal valor, long usuario, CancellationToken cancellationToken)
    {
        const string sql = @"
            INSERT INTO AUCO_INFOAPSDESCOST
            VALUES (SAUCO_INFOAPSDESCOST.NEXTVAL, :aps, :anno, :mes, :paraId, :valor, 1, SYSDATE, :usuario)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new { aps, anno, mes, paraId, valor, usuario }, cancellationToken: cancellationToken));
    }

    public async Task UpdateDescuentoAsync(int aps, int anno, int mes, int paraId, decimal valor, CancellationToken cancellationToken)
    {
        const string sql = @"
            UPDATE AUCO_INFOAPSDESCOST
               SET DESC_VALOR = :valor
             WHERE APSA_ID = :aps
               AND DESC_ANNO = :anno
               AND DESC_MES = :mes
               AND PARA_COSTO20010 = :paraId";

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new { aps, anno, mes, paraId, valor }, cancellationToken: cancellationToken));
    }

    private async Task<IReadOnlyList<object>> QueryRowsAsync(string sql, object[] values, CancellationToken cancellationToken)
    {
        var parameters = new DynamicParameters();
        for (var i = 0; i < values.Length; i++)
        {
            parameters.Add((i + 1).ToString(), values[i]);
        }

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, parameters);
        return rows.Select(ToDictionaryObject).ToList();
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
