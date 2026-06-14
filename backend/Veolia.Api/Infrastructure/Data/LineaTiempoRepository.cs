using System.Data.Common;
using Dapper;
using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public sealed class LineaTiempoRepository(IOracleConnectionFactory connectionFactory) : ILineaTiempoRepository
{
    public async Task<IReadOnlyList<LineaTiempoRow>> GetByProyeccionAsync(long proyId, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT DETL_ID AS DetlId,
                   PROYID AS ProyId,
                   APSA_ID AS ApsaId,
                   ANNO AS Anno,
                   MES AS Mes,
                   DELTIPC AS Deltipc,
                   DELTIPCC AS Deltipcc,
                   DELTSMLV AS Deltsmlv,
                   DELTIOEXP AS Deltioexp,
                   DELTFACPRODUC AS Deltfacproduc,
                   DELTINDIPCC AS Deltindipcc,
                   DELTIPCCS AS Deltipccs
              FROM PROY_DETLINEATIEMPO
             WHERE PROYID = :1
             ORDER BY ANNO, MES";

        var parameters = new DynamicParameters();
        parameters.Add("1", proyId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<LineaTiempoRow>(sql, parameters);
        return rows.ToList();
    }

    public async Task<MutationResponse> UpsertAsync(LineaTiempoUpsertRequest request, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            if (request.IsNew)
            {
                const string insertSql = @"
                    INSERT INTO PROY_DETLINEATIEMPO
                    (DETL_ID, PROYID, APSA_ID, ANNO, MES, DELTIPC, DELTIPCC, DELTSMLV, DELTIOEXP, DELTFACPRODUC, DELTINDIPCC, DELTIPCCS)
                    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12)";

                foreach (var row in request.Rows)
                {
                    var detlId = row.DetlId > 0
                        ? row.DetlId
                        : await GetNextIdAsync(connection, transaction, "PROY_DETLINEATIEMPO", "DETL_ID", cancellationToken);

                    var parameters = new DynamicParameters();
                    parameters.Add("1", detlId);
                    parameters.Add("2", request.ProyId);
                    parameters.Add("3", request.ApsaId);
                    parameters.Add("4", row.Anno);
                    parameters.Add("5", row.Mes);
                    parameters.Add("6", row.Deltipc);
                    parameters.Add("7", row.Deltipcc);
                    parameters.Add("8", row.Deltsmlv);
                    parameters.Add("9", row.Deltioexp);
                    parameters.Add("10", row.Deltfacproduc);
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
                           DELTINDIPCC = :6,
                           DELTIPCCS = :7
                     WHERE DETL_ID = :8";

                foreach (var row in request.Rows)
                {
                    var parameters = new DynamicParameters();
                    parameters.Add("1", row.Deltipc);
                    parameters.Add("2", row.Deltipcc);
                    parameters.Add("3", row.Deltsmlv);
                    parameters.Add("4", row.Deltioexp);
                    parameters.Add("5", row.Deltfacproduc);
                    parameters.Add("6", row.Deltindipcc);
                    parameters.Add("7", row.Deltipccs);
                    parameters.Add("8", row.DetlId);

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

    private static async Task<long> GetNextIdAsync(System.Data.IDbConnection connection, System.Data.IDbTransaction transaction, string tableName, string columnName, CancellationToken cancellationToken)
    {
        var sql = $"SELECT NVL(MAX({columnName}), 0) + 1 FROM {tableName}";
        return await connection.ExecuteScalarAsync<long>(new CommandDefinition(sql, transaction: transaction, cancellationToken: cancellationToken));
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
