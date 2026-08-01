using Dapper;
using System.Data.Common;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Auth.Asignaciones;

public class AsignacionesRepository(IOracleConnectionFactory connectionFactory) : IAsignacionesRepository
{
    public async Task<(IReadOnlyList<object> Asignadas, IReadOnlyList<object> SinAsignar)> GetApsAsignadasAsync(long id, CancellationToken cancellationToken)
    {
        const string asignadasSql = @"
SELECT
    a.APSA_ID,
    a.APSA_NOMAPS
FROM AUCO_APSUSUARIOS au
INNER JOIN AUCO_APSASEO a ON a.APSA_ID = au.APSA_ID
WHERE au.SISU_ID = :id
  AND au.APSI_ESTADO = 1
  AND a.APSA_ESTADO = 1
ORDER BY a.APSA_NOMAPS";

        const string sinAsignarSql = @"
SELECT
    a.APSA_ID,
    a.APSA_NOMAPS
FROM AUCO_APSASEO a
WHERE a.APSA_ESTADO = 1
  AND NOT EXISTS (
      SELECT 1
      FROM AUCO_APSUSUARIOS au
      WHERE au.APSA_ID = a.APSA_ID
        AND au.SISU_ID = :id
        AND au.APSI_ESTADO = 1
  )
ORDER BY a.APSA_NOMAPS";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var asignadas = await connection.QueryAsync(asignadasSql, new { id });
        var sinAsignar = await connection.QueryAsync(sinAsignarSql, new { id });

        return (
            asignadas.Select(ToDictionaryObject).ToList(),
            sinAsignar.Select(ToDictionaryObject).ToList());
    }

    public async Task<object?> SetApsxUsuarioAsync(long id, IReadOnlyList<long> outAps, IReadOnlyList<long> inAps, CancellationToken cancellationToken)
    {
        const string updateInactiveSql = @"
UPDATE AUCO_APSUSUARIOS
SET APSI_ESTADO = 0
WHERE SISU_ID = :id
  AND APSA_ID = :apsaId";

        const string mergeActiveSql = @"
MERGE INTO AUCO_APSUSUARIOS t
USING (
    SELECT :id AS SISU_ID, :apsaId AS APSA_ID
    FROM DUAL
) src
ON (t.SISU_ID = src.SISU_ID AND t.APSA_ID = src.APSA_ID)
WHEN MATCHED THEN
    UPDATE SET t.APSI_ESTADO = 1, t.APSI_FECREA = SYSDATE
WHEN NOT MATCHED THEN
    INSERT (APSA_ID, SISU_ID, APSI_ESTADO, APSI_FECREA)
    VALUES (src.APSA_ID, src.SISU_ID, 1, SYSDATE)";

        using var connection = await OpenConnectionAsync(cancellationToken);

        foreach (var apsaId in outAps.Distinct())
        {
            await connection.ExecuteAsync(
                new CommandDefinition(updateInactiveSql, new { id, apsaId }, cancellationToken: cancellationToken));
        }

        foreach (var apsaId in inAps.Distinct())
        {
            await connection.ExecuteAsync(
                new CommandDefinition(mergeActiveSql, new { id, apsaId }, cancellationToken: cancellationToken));
        }

        // Legacy quirk: route may return empty body on success.
        return null;
    }

    public async Task<(long SisuId, IReadOnlyList<object> Asignados, IReadOnlyList<object> SinAsignar)> GetSistemasPorUsuarioAsync(string correo, CancellationToken cancellationToken)
    {
        const string usuarioSql = @"
SELECT SISU_ID
FROM AUGE_SISUSUARIO
WHERE LOWER(SISU_CORREO) = LOWER(:correo)
  AND SISU_ESTADO = 1";

        const string asignadosSql = @"
SELECT
    s.SIST_ID,
    s.SIST_NOMBRE
FROM AUGE_USUASISTEMA us
INNER JOIN AUGE_SISTEMA s ON s.SIST_ID = us.SIST_ID
WHERE us.USUA_ID = :sisuId
  AND us.USSI_ESTADO = 1
  AND s.SIST_ESTADO = 1
ORDER BY s.SIST_NOMBRE";

        const string sinAsignarSql = @"
SELECT
    s.SIST_ID,
    s.SIST_NOMBRE
FROM AUGE_SISTEMA s
WHERE s.SIST_ESTADO = 1
  AND NOT EXISTS (
      SELECT 1
      FROM AUGE_USUASISTEMA us
      WHERE us.SIST_ID = s.SIST_ID
        AND us.USUA_ID = :sisuId
        AND us.USSI_ESTADO = 1
  )
ORDER BY s.SIST_NOMBRE";

        using var connection = await OpenConnectionAsync(cancellationToken);

        var sisuId = await connection.QueryFirstOrDefaultAsync<long?>(usuarioSql, new { correo });
        if (sisuId is null)
        {
            return (0L, Array.Empty<object>(), Array.Empty<object>());
        }

        var asignados = await connection.QueryAsync(asignadosSql, new { sisuId });
        var sinAsignar = await connection.QueryAsync(sinAsignarSql, new { sisuId });

        return (
            sisuId.Value,
            asignados.Select(ToDictionaryObject).ToList(),
            sinAsignar.Select(ToDictionaryObject).ToList());
    }

    public async Task<string> AsignarSistemaAsync(long sisuId, IReadOnlyList<long> asignados, IReadOnlyList<long> noAsignados, CancellationToken cancellationToken)
    {
        const string mergeAssignedSql = @"
MERGE INTO AUGE_USUASISTEMA t
USING (
    SELECT :sisuId AS USUA_ID, :sistemaId AS SIST_ID
    FROM DUAL
) src
ON (t.USUA_ID = src.USUA_ID AND t.SIST_ID = src.SIST_ID)
WHEN MATCHED THEN
    UPDATE SET t.USSI_ESTADO = 1, t.USSI_FECHA = SYSDATE
WHEN NOT MATCHED THEN
    INSERT (SIST_ID, USUA_ID, USSI_ESTADO, USSI_FECHA)
    VALUES (src.SIST_ID, src.USUA_ID, 1, SYSDATE)";

        const string setUnassignedSql = @"
UPDATE AUGE_USUASISTEMA
SET USSI_ESTADO = 0,
    USSI_FECHA = SYSDATE
WHERE USUA_ID = :sisuId
  AND SIST_ID = :sistemaId";

        using var connection = await OpenConnectionAsync(cancellationToken);

        foreach (var sistemaId in asignados.Distinct())
        {
            await connection.ExecuteAsync(
                new CommandDefinition(mergeAssignedSql, new { sisuId, sistemaId }, cancellationToken: cancellationToken));
        }

        foreach (var sistemaId in noAsignados.Distinct())
        {
            await connection.ExecuteAsync(
                new CommandDefinition(setUnassignedSql, new { sisuId, sistemaId }, cancellationToken: cancellationToken));
        }

        return "Sistemas asignados correctamente";
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

    private object ToDictionaryObject(dynamic row)
        => ToDictionary(row);

    private static Dictionary<string, object?> ToDictionary(dynamic row)
    {
        if (row is IDictionary<string, object> dictionary)
        {
            return dictionary.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        }

        return ((object)row)
            .GetType()
            .GetProperties()
            .ToDictionary(prop => prop.Name, prop => prop.GetValue(row));
    }
}
