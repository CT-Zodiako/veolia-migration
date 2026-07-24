using System.Data.Common;
using Dapper;
using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public sealed class SubcontProyRepository(IOracleConnectionFactory connectionFactory) : ISubcontProyRepository
{
    public async Task<IReadOnlyList<SubcontItem>> GetSubcontAsync(SubcontConsultaRequest request, CancellationToken cancellationToken)
    {
        // Legacy real (proyeccionescontroller.consultasubcont): "SELECT CLAS_CLASE, SUCO_VALOR
        // FROM PROY_APSSUBSCONT WHERE APSA_ID = :1 AND PROY_ID = :2 AND SUCO_ANNO = :3 AND SUCO_MES = :4".
        const string sql = @"SELECT CLAS_CLASE AS ClasClase, SUCO_VALOR AS SucoValor
                               FROM PROY_APSSUBSCONT
                              WHERE APSA_ID = :1 AND PROY_ID = :2 AND SUCO_ANNO = :3 AND SUCO_MES = :4";

        var parameters = new DynamicParameters();
        parameters.Add("1", request.ApsaId);
        parameters.Add("2", request.ProyId);
        parameters.Add("3", request.Anno);
        parameters.Add("4", request.Mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<SubcontItem>(sql, parameters);
        return rows.ToList();
    }

    public async Task<MutationResponse> UpsertSubcontAsync(SubcontUpsertRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            var deleteParams = new DynamicParameters();
            deleteParams.Add("1", request.ProyId);
            deleteParams.Add("2", request.ApsaId);
            deleteParams.Add("3", request.Anno);
            deleteParams.Add("4", request.Mes);

            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM PROY_SUBSCONTEMP WHERE PROY_ID = :1 AND APSA_ID = :2 AND SUCO_ANNO = :3 AND SUCO_MES = :4",
                deleteParams,
                transaction: transaction,
                cancellationToken: cancellationToken));

            // Legacy real (proyeccionescontroller.editarPorcSubCon): inserta en PROY_SUBSCONTEMP
            // (staging de ediciones pendientes -- SUCO_ESTADO=1, no en PROY_APSSUBSCONT
            // directamente). SUCO_FECHA, no FECHA.
            const string insertSql = @"INSERT INTO PROY_SUBSCONTEMP (SUCO_ID, PROY_ID, APSA_ID, CLAS_CLASE, SUCO_ANNO, SUCO_MES, SUCO_VALOR, SUCO_ESTADO, SUCO_FECHA, USUA_USUA)
                                       VALUES (SPROY_SUBSCONTEMP.NEXTVAL, :1, :2, :3, :4, :5, :6, 1, SYSDATE, :7)";

            foreach (var item in request.Items)
            {
                var parameters = new DynamicParameters();
                parameters.Add("1", request.ProyId);
                parameters.Add("2", request.ApsaId);
                parameters.Add("3", item.ClasClase);
                parameters.Add("4", request.Anno);
                parameters.Add("5", request.Mes);
                parameters.Add("6", item.SucoValor);
                parameters.Add("7", usuarioId);

                await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Subsidios/contribuciones guardados.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar subcont: {ex.Message}", Id = request.ProyId };
        }
    }

    public async Task<IReadOnlyList<ClaseUsoItem>> GetClasesUsoAsync(CancellationToken cancellationToken)
    {
        // Legacy real (apscontroller.consuluso): "SELECT * FROM auco_clasesuso".
        const string sql = "SELECT CLAS_CLASE AS ClasClase, CLAS_NOMBRE AS ClasNombre FROM AUCO_CLASESUSO ORDER BY CLAS_CLASE";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ClaseUsoItem>(sql);
        return rows.ToList();
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
