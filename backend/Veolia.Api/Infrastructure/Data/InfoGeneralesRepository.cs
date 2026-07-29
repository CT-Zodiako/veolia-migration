using Dapper;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class InfoGeneralesRepository(IOracleConnectionFactory connectionFactory) : IInfoGeneralesRepository
{
    public Task<IReadOnlyList<object>> ConsultaEnergiaAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken)
    {
        // SELECT RF.* se reemplazó por columnas explícitas: VPRO_RESFACTENE tiene columnas
        // numéricas calculadas sin precisión fija que ODP.NET no puede leer como decimal
        // ("Specified cast is not valid" en OracleDataReader.GetDecimal) cuando se seleccionan
        // con SELECT *. Forzar NUMBER(18,4) evita el cast inválido sin cambiar el contrato
        // de campos que ya usa el frontend.
        const string sql = @"
            SELECT RF.CLAS_NOMBRE AS CLAS_NOMBRE,
                   RF.FACTOR_PROD AS FACTOR_PROD,
                   RF.TIPOTAR AS TIPOTAR,
                   CAST(RF.FAEN_ANNO AS NUMBER(4,0)) AS FAEN_ANNO,
                   CAST(RF.FAEN_MES AS NUMBER(2,0)) AS FAEN_MES,
                   CAST(RF.FAEN_SUBCON AS NUMBER(18,4)) AS FAEN_SUBCON,
                   CAST(RF.FAEN_USUARIOS AS NUMBER(18,4)) AS FAEN_USUARIOS,
                   CAST(RF.FAEN_TCPROP AS NUMBER(18,4)) AS FAEN_TCPROP,
                   CAST(RF.FAEN_TCTERC AS NUMBER(18,4)) AS FAEN_TCTERC,
                   CAST(RF.FAEN_TCAPRO AS NUMBER(18,4)) AS FAEN_TCAPRO,
                   CAST(RF.FAEN_TBL AS NUMBER(18,4)) AS FAEN_TBL,
                   CAST(RF.FAEN_TLU AS NUMBER(18,4)) AS FAEN_TLU,
                   CAST(RF.FAEN_TRT AS NUMBER(18,4)) AS FAEN_TRT,
                   CAST(RF.FAEN_TDF AS NUMBER(18,4)) AS FAEN_TDF,
                   CAST(RF.FAEN_TINC AS NUMBER(18,4)) AS FAEN_TINC,
                   CAST(RF.FAEN_TIAT AS NUMBER(18,4)) AS FAEN_TIAT,
                   CAST(RF.FAEN_TTL AS NUMBER(18,4)) AS FAEN_TTL,
                   CAST(RF.FAEN_TA AS NUMBER(18,4)) AS FAEN_TA,
                   CAST(RF.FAEN_TOTAL AS NUMBER(18,4)) AS FAEN_TOTAL,
                   CAST(RF.FAEN_TOTSC AS NUMBER(18,4)) AS FAEN_TOTSC,
                   CAST(RF.FAEN_TOTPROPLENO AS NUMBER(18,4)) AS FAEN_TOTPROPLENO,
                   CAST(RF.FAEN_TOTPROSUBCON AS NUMBER(18,4)) AS FAEN_TOTPROSUBCON
              FROM VPRO_RESFACTENE RF
             WHERE RF.APSA_ID = :1
               AND RF.PROY_ID = :2
               AND EXISTS (SELECT 1
                             FROM AUCO_APSUSUARIOS AU
                            WHERE AU.APSA_ID = RF.APSA_ID
                              AND AU.SISU_ID = :3)";

        return QueryRowsAsync(sql, [apsaid, proyid, usuario], cancellationToken);
    }

    public Task<IReadOnlyList<object>> ConsultaAcueductoAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken)
    {
        // Mismo motivo que ConsultaEnergiaAsync: columnas numéricas de VPRO_RESFACTACU sin
        // precisión fija causaban "Specified cast is not valid" con SELECT *.
        const string sql = @"
            SELECT RF.CLAS_NOMBRE AS CLAS_NOMBRE,
                   RF.FACTOR_PROD AS FACTOR_PROD,
                   RF.TIPOTAR AS TIPOTAR,
                   CAST(RF.FACU_ANNO AS NUMBER(4,0)) AS FACU_ANNO,
                   CAST(RF.FACU_MES AS NUMBER(2,0)) AS FACU_MES,
                   CAST(RF.FACU_SUBCON AS NUMBER(18,4)) AS FACU_SUBCON,
                   CAST(RF.FACU_USUARIOS AS NUMBER(18,4)) AS FACU_USUARIOS,
                   CAST(RF.FACU_TCPROP AS NUMBER(18,4)) AS FACU_TCPROP,
                   CAST(RF.FACU_TCTERC AS NUMBER(18,4)) AS FACU_TCTERC,
                   CAST(RF.FACU_TCAPRO AS NUMBER(18,4)) AS FACU_TCAPRO,
                   CAST(RF.FACU_TBL AS NUMBER(18,4)) AS FACU_TBL,
                   CAST(RF.FACU_TLU AS NUMBER(18,4)) AS FACU_TLU,
                   CAST(RF.FACU_TRT AS NUMBER(18,4)) AS FACU_TRT,
                   CAST(RF.FACU_TDF AS NUMBER(18,4)) AS FACU_TDF,
                   CAST(RF.FACU_TINC AS NUMBER(18,4)) AS FACU_TINC,
                   CAST(RF.FACU_TIAT AS NUMBER(18,4)) AS FACU_TIAT,
                   CAST(RF.FACU_TTL AS NUMBER(18,4)) AS FACU_TTL,
                   CAST(RF.FACU_TA AS NUMBER(18,4)) AS FACU_TA,
                   CAST(RF.FACU_TOTAL AS NUMBER(18,4)) AS FACU_TOTAL,
                   CAST(RF.FACU_TOTSC AS NUMBER(18,4)) AS FACU_TOTSC,
                   CAST(RF.FACU_TOTPROPLENO AS NUMBER(18,4)) AS FACU_TOTPROPLENO,
                   CAST(RF.FACU_TOTPROSUBCON AS NUMBER(18,4)) AS FACU_TOTPROSUBCON
              FROM VPRO_RESFACTACU RF
             WHERE RF.APSA_ID = :1
               AND RF.PROY_ID = :2
               AND EXISTS (SELECT 1
                             FROM AUCO_APSUSUARIOS AU
                            WHERE AU.APSA_ID = RF.APSA_ID
                              AND AU.SISU_ID = :3)";

        return QueryRowsAsync(sql, [apsaid, proyid, usuario], cancellationToken);
    }

    public Task<IReadOnlyList<object>> ConsultaCostosAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken)
    {
        // Mismo motivo que ConsultaEnergiaAsync/ConsultaAcueducto: VPRO_RESCOSTOS tiene
        // columnas numéricas calculadas (FLOAT(126) en Oracle) sin precisión fija que
        // ODP.NET no puede leer como decimal ("Specified cast is not valid") con SELECT *.
        // Forzar NUMBER(18,4) evita el cast inválido sin cambiar el contrato de campos
        // que ya usa el frontend.
        const string sql = @"
            SELECT C.TIPO_FACT AS TIPO_FACT,
                   CAST(C.COST_ANNO AS NUMBER(4,0)) AS COST_ANNO,
                   CAST(C.COST_MES AS NUMBER(2,0)) AS COST_MES,
                   CAST(C.COST_CCS AS NUMBER(18,4)) AS COST_CCS,
                   CAST(C.COST_CCSAPRO AS NUMBER(18,4)) AS COST_CCSAPRO,
                   CAST(C.COST_CBL AS NUMBER(18,4)) AS COST_CBL,
                   CAST(C.COST_CLUS AS NUMBER(18,4)) AS COST_CLUS,
                   CAST(C.COST_CRT AS NUMBER(18,4)) AS COST_CRT,
                   CAST(C.COST_CDF AS NUMBER(18,4)) AS COST_CDF,
                   CAST(C.COST_INC AS NUMBER(18,4)) AS COST_INC,
                   CAST(C.COST_IAT AS NUMBER(18,4)) AS COST_IAT,
                   CAST(C.COST_CTL AS NUMBER(18,4)) AS COST_CTL,
                   CAST(C.COST_VBA AS NUMBER(18,4)) AS COST_VBA
              FROM VPRO_RESCOSTOS C
             WHERE C.APSA_ID = :1
               AND C.PROY_ID = :2
               AND EXISTS (SELECT 1
                             FROM AUCO_APSUSUARIOS AU
                            WHERE AU.APSA_ID = C.APSA_ID
                              AND AU.SISU_ID = :3)";

        return QueryRowsAsync(sql, [apsaid, proyid, usuario], cancellationToken);
    }

    public Task<IReadOnlyList<object>> ConsultaTarifasAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken)
    {
        // SELECT DISTINCT T.* se reemplazó por las 21 columnas explícitas del legacy
        // (back-tarificador/src/modules/infogenerales/controller.js:117): T.* incluye
        // columnas adicionales de la vista (p.ej. TARI_ESTADO/TARI_FECHA/TARI_USUA) que
        // difieren por fila y anulan el DISTINCT, duplicando filas silenciosamente frente
        // al legacy. Además, igual que en VPRO_RESFACTENE/VPRO_RESFACTACU, las columnas
        // numéricas calculadas son FLOAT(126) sin precisión fija y requieren CAST a
        // NUMBER(18,4) para evitar "Specified cast is not valid" en ODP.NET.
        const string sql = @"
            SELECT DISTINCT T.PROY_ID AS PROY_ID,
                   T.APSA_ID AS APSA_ID,
                   T.CLAS_NOMBRE AS CLAS_NOMBRE,
                   T.TIPO_TAR AS TIPO_TAR,
                   T.TIPO_FACT AS TIPO_FACT,
                   CAST(T.TARI_ANNO AS NUMBER(4,0)) AS TARI_ANNO,
                   CAST(T.TARI_MES AS NUMBER(2,0)) AS TARI_MES,
                   CAST(T.TARI_SUBCON AS NUMBER(18,4)) AS TARI_SUBCON,
                   CAST(T.TARI_TCPROP AS NUMBER(18,4)) AS TARI_TCPROP,
                   CAST(T.TARI_TCTERC AS NUMBER(18,4)) AS TARI_TCTERC,
                   CAST(T.TARI_TCAPRO AS NUMBER(18,4)) AS TARI_TCAPRO,
                   CAST(T.TARI_TBL AS NUMBER(18,4)) AS TARI_TBL,
                   CAST(T.TARI_TLU AS NUMBER(18,4)) AS TARI_TLU,
                   CAST(T.TARI_TRT AS NUMBER(18,4)) AS TARI_TRT,
                   CAST(T.TARI_TDF AS NUMBER(18,4)) AS TARI_TDF,
                   CAST(T.TARI_INC AS NUMBER(18,4)) AS TARI_INC,
                   CAST(T.TARI_TIAT AS NUMBER(18,4)) AS TARI_TIAT,
                   CAST(T.TARI_TTL AS NUMBER(18,4)) AS TARI_TTL,
                   CAST(T.TARI_TA AS NUMBER(18,4)) AS TARI_TA,
                   CAST(T.TARI_TOTAL AS NUMBER(18,4)) AS TARI_TOTAL,
                   CAST(T.TARI_TOTSC AS NUMBER(18,4)) AS TARI_TOTSC
              FROM VPRO_RESTARIFAS T
             WHERE T.APSA_ID = :1
               AND T.PROY_ID = :2
               AND EXISTS (SELECT 1
                             FROM AUCO_APSUSUARIOS AU
                            WHERE AU.APSA_ID = T.APSA_ID
                              AND AU.SISU_ID = :3)
             ORDER BY TARI_ANNO, TARI_MES, TIPO_FACT, TIPO_TAR, CLAS_NOMBRE DESC";

        return QueryRowsAsync(sql, [apsaid, proyid, usuario], cancellationToken);
    }

    public Task<IReadOnlyList<object>> ConsultaHistorialCertificacionesAsync(int anno, int mes, long usuario, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT V.*
              FROM VAUCO_CERTINTARIFAS V
             WHERE V.TACE_ANNO = :1
               AND V.TACE_MES = :2
               AND V.CODAPS IN (SELECT AU.APSA_ID
                                  FROM AUCO_APSUSUARIOS AU
                                 WHERE AU.SISU_ID = :3)";

        return QueryRowsAsync(sql, [anno, mes, usuario], cancellationToken);
    }

    public Task<IReadOnlyList<object>> ConsultaHistorialProductividadAsync(int anno, int mes, long usuario, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT V.*
              FROM VAUCO_PRODUCTIVIDAD V
             WHERE V.PR22_ANNO = :1
               AND V.PR22_MES = :2
               AND V.CODAPS IN (SELECT AU.APSA_ID
                                  FROM AUCO_APSUSUARIOS AU
                                 WHERE AU.SISU_ID = :3)
             ORDER BY 3, 5, 7";

        return QueryRowsAsync(sql, [anno, mes, usuario], cancellationToken);
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
