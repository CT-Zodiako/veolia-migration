using System.Data.Common;
using Dapper;
using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public sealed class LineaTiempoRepository(IOracleConnectionFactory connectionFactory) : ILineaTiempoRepository
{
    public async Task<IReadOnlyList<LineaTiempoRow>> GetByProyeccionAsync(long proyId, CancellationToken cancellationToken)
    {
        // Legacy real (proyeccionescontroller.consultan) es "SELECT * FROM PROY_DETLINEATIEMPO
        // WHERE PROYID = :1 ORDER BY PROYANNO, PROYMES" -- la tabla no tiene ID sustituto
        // (DETL_ID no existe); la clave natural es (PROYID, APS, PROYANNO, PROYMES).
        const string sql = @"
            SELECT PROYID AS ProyId,
                   APS AS ApsaId,
                   PROYANNO AS Anno,
                   PROYMES AS Mes,
                   DELTIPC AS Deltipc,
                   DELTIPCC AS Deltipcc,
                   DELTSMLV AS Deltsmlv,
                   DELTIOEXP AS Deltioexp,
                   DELTFACPRODUC AS Deltfacproduc,
                   DELTINDIPCC AS Deltindipcc,
                   DELTIPCCS AS Deltipccs
              FROM PROY_DETLINEATIEMPO
             WHERE PROYID = :1
             ORDER BY PROYANNO, PROYMES";

        var parameters = new DynamicParameters();
        parameters.Add("1", proyId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<LineaTiempoRow>(sql, parameters);
        return rows.ToList();
    }

    public async Task<MutationResponse> UpsertAsync(LineaTiempoUpsertRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            if (request.IsNew)
            {
                const string insertSql = @"
                    INSERT INTO PROY_DETLINEATIEMPO
                    (PROYID, APS, PROYANNO, PROYMES, DELTIPC, DELTIPCC, DELTSMLV, DELTIOEXP, DELTFACPRODUC, DELTFECHA, USUARIO, DELTINDIPCC, DELTIPCCS)
                    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, SYSDATE, :10, :11, :12)";

                foreach (var row in request.Rows)
                {
                    var parameters = new DynamicParameters();
                    parameters.Add("1", request.ProyId);
                    parameters.Add("2", request.ApsaId);
                    parameters.Add("3", row.Anno);
                    parameters.Add("4", row.Mes);
                    parameters.Add("5", row.Deltipc);
                    parameters.Add("6", row.Deltipcc);
                    parameters.Add("7", row.Deltsmlv);
                    parameters.Add("8", row.Deltioexp);
                    parameters.Add("9", row.Deltfacproduc);
                    parameters.Add("10", usuarioId);
                    parameters.Add("11", row.Deltindipcc);
                    parameters.Add("12", row.Deltipccs);

                    await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
                }
            }
            else
            {
                const string updateSql = @"
                    UPDATE PROY_DETLINEATIEMPO
                       SET DELTIPC = :1,
                           DELTIPCC = :2,
                           DELTSMLV = :3,
                           DELTIOEXP = :4,
                           DELTFACPRODUC = :5,
                           DELTFECHA = SYSDATE,
                           USUARIO = :6,
                           DELTINDIPCC = :7,
                           DELTIPCCS = :8
                     WHERE PROYID = :9
                       AND APS = :10
                       AND PROYANNO = :11
                       AND PROYMES = :12";

                foreach (var row in request.Rows)
                {
                    var parameters = new DynamicParameters();
                    parameters.Add("1", row.Deltipc);
                    parameters.Add("2", row.Deltipcc);
                    parameters.Add("3", row.Deltsmlv);
                    parameters.Add("4", row.Deltioexp);
                    parameters.Add("5", row.Deltfacproduc);
                    parameters.Add("6", usuarioId);
                    parameters.Add("7", row.Deltindipcc);
                    parameters.Add("8", row.Deltipccs);
                    parameters.Add("9", request.ProyId);
                    parameters.Add("10", request.ApsaId);
                    parameters.Add("11", row.Anno);
                    parameters.Add("12", row.Mes);

                    await connection.ExecuteAsync(new CommandDefinition(updateSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
                }
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Línea de tiempo guardada correctamente.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar línea de tiempo: {ex.Message}", Id = request.ProyId };
        }
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
