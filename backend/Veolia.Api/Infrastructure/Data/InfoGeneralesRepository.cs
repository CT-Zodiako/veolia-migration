using Dapper;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class InfoGeneralesRepository(IOracleConnectionFactory connectionFactory) : IInfoGeneralesRepository
{
    public Task<IReadOnlyList<object>> ConsultaEnergiaAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT RF.*
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
        const string sql = @"
            SELECT RF.*
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
        const string sql = @"
            SELECT C.*
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
        const string sql = @"
            SELECT DISTINCT T.*
              FROM VPRO_RESTARIFAS T
             WHERE T.APSA_ID = :1
               AND T.PROY_ID = :2
               AND EXISTS (SELECT 1
                             FROM AUCO_APSUSUARIOS AU
                            WHERE AU.APSA_ID = T.APSA_ID
                              AND AU.SISU_ID = :3)
             ORDER BY T.TARI_ANNO, T.TARI_MES, T.TIPO_FACT, T.TIPO_TAR, T.CLAS_NOMBRE DESC";

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
