using System.Data.Common;
using Dapper;
using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public sealed class CrecimientoRepository(IOracleConnectionFactory connectionFactory) : ICrecimientoRepository
{
    public async Task<CrecimientoPayload> ConsultarAsync(long proyId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);

        var payload = new CrecimientoPayload
        {
            Usuarios = (await connection.QueryAsync<CrecimientoUsuariosItem>(
                "SELECT PRUS_ID AS PrusId, ANNO AS Anno, SEMESTRE AS Semestre, CODUSO AS Coduso, CODTIPOPRED AS Codtipopred, CANTIDAD AS Cantidad, TONELADAS AS Toneladas FROM PROY_USUARIOS WHERE PROYID = :1 ORDER BY ANNO, SEMESTRE",
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = proyId }))).ToList(),
            Propia = (await connection.QueryAsync<CrecimientoPropiaItem>(
                "SELECT PRPR_ID AS PrprId, ANNO AS Anno, MES AS Mes, V_USUARIOS AS VUsuarios, V_TONELADAS AS VToneladas, V_INGRESOS AS VIngresos, V_COSTOS AS VCostos FROM PROY_PROPIA WHERE PROYID = :1 ORDER BY ANNO, MES",
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = proyId }))).ToList(),
            Terceros = (await connection.QueryAsync<CrecimientoTercerosItem>(
                "SELECT PRCO_ID AS PrcoId, ANNO AS Anno, MES AS Mes, C_USUARIOS AS CUsuarios, C_TONELADAS AS CToneladas, C_INGRESOS AS CIngresos, C_COSTOS AS CCostos FROM PROY_COMPETIDOR WHERE PROYID = :1 ORDER BY ANNO, MES",
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = proyId }))).ToList(),
            Descuentos = (await connection.QueryAsync<DescuentosItem>(
                "SELECT PRDE_ID AS PrdeId, ANNO AS Anno, MES AS Mes, PORCENTAJE AS Porcentaje, VALOR AS Valor FROM PROY_DESCUENTOS WHERE PROYID = :1 ORDER BY ANNO, MES",
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = proyId }))).ToList()
        };

        return payload;
    }

    public Task<MutationResponse> RegistrarUsuariosAsync(CrecimientoUsuariosRequest request, CancellationToken cancellationToken)
        => ReplaceUsuariosAsync(request, cancellationToken);

    public Task<MutationResponse> RegistrarPropiaAsync(CrecimientoPropiaRequest request, CancellationToken cancellationToken)
        => ReplacePropiaAsync(request, cancellationToken);

    public Task<MutationResponse> RegistrarTercerosAsync(CrecimientoTercerosRequest request, CancellationToken cancellationToken)
        => ReplaceTercerosAsync(request, cancellationToken);

    public Task<MutationResponse> RegistrarDescuentosAsync(DescuentosRequest request, CancellationToken cancellationToken)
        => ReplaceDescuentosAsync(request, cancellationToken);

    private async Task<MutationResponse> ReplaceUsuariosAsync(CrecimientoUsuariosRequest request, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            await connection.ExecuteAsync(new CommandDefinition("DELETE FROM PROY_USUARIOS WHERE PROYID = :1", new DynamicParameters(new Dictionary<string, object?> { ["1"] = request.ProyId }), transaction: transaction, cancellationToken: cancellationToken));

            const string insertSql = @"INSERT INTO PROY_USUARIOS (PRUS_ID, PROYID, APSA_ID, ANNO, SEMESTRE, CODUSO, CODTIPOPRED, CANTIDAD, TONELADAS)
                                       VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)";
            foreach (var item in request.Items)
            {
                var id = item.PrusId ?? await GetNextIdAsync(connection, transaction, "PROY_USUARIOS", "PRUS_ID", cancellationToken);
                var parameters = new DynamicParameters();
                parameters.Add("1", id);
                parameters.Add("2", request.ProyId);
                parameters.Add("3", request.ApsaId);
                parameters.Add("4", item.Anno);
                parameters.Add("5", item.Semestre);
                parameters.Add("6", item.Coduso);
                parameters.Add("7", item.Codtipopred);
                parameters.Add("8", item.Cantidad);
                parameters.Add("9", item.Toneladas);
                await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Crecimiento de usuarios guardado.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar usuarios: {ex.Message}", Id = request.ProyId };
        }
    }

    private async Task<MutationResponse> ReplacePropiaAsync(CrecimientoPropiaRequest request, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync(new CommandDefinition("DELETE FROM PROY_PROPIA WHERE PROYID = :1", new DynamicParameters(new Dictionary<string, object?> { ["1"] = request.ProyId }), transaction: transaction, cancellationToken: cancellationToken));
            const string insertSql = @"INSERT INTO PROY_PROPIA (PRPR_ID, PROYID, APSA_ID, ANNO, MES, V_USUARIOS, V_TONELADAS, V_INGRESOS, V_COSTOS)
                                       VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)";
            foreach (var item in request.Items)
            {
                var id = item.PrprId ?? await GetNextIdAsync(connection, transaction, "PROY_PROPIA", "PRPR_ID", cancellationToken);
                var parameters = new DynamicParameters();
                parameters.Add("1", id);
                parameters.Add("2", request.ProyId);
                parameters.Add("3", request.ApsaId);
                parameters.Add("4", item.Anno);
                parameters.Add("5", item.Mes);
                parameters.Add("6", item.VUsuarios);
                parameters.Add("7", item.VToneladas);
                parameters.Add("8", item.VIngresos);
                parameters.Add("9", item.VCostos);
                await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Crecimiento de información propia guardado.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar info propia: {ex.Message}", Id = request.ProyId };
        }
    }

    private async Task<MutationResponse> ReplaceTercerosAsync(CrecimientoTercerosRequest request, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync(new CommandDefinition("DELETE FROM PROY_COMPETIDOR WHERE PROYID = :1", new DynamicParameters(new Dictionary<string, object?> { ["1"] = request.ProyId }), transaction: transaction, cancellationToken: cancellationToken));
            const string insertSql = @"INSERT INTO PROY_COMPETIDOR (PRCO_ID, PROYID, APSA_ID, ANNO, MES, C_USUARIOS, C_TONELADAS, C_INGRESOS, C_COSTOS)
                                       VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)";
            foreach (var item in request.Items)
            {
                var id = item.PrcoId ?? await GetNextIdAsync(connection, transaction, "PROY_COMPETIDOR", "PRCO_ID", cancellationToken);
                var parameters = new DynamicParameters();
                parameters.Add("1", id);
                parameters.Add("2", request.ProyId);
                parameters.Add("3", request.ApsaId);
                parameters.Add("4", item.Anno);
                parameters.Add("5", item.Mes);
                parameters.Add("6", item.CUsuarios);
                parameters.Add("7", item.CToneladas);
                parameters.Add("8", item.CIngresos);
                parameters.Add("9", item.CCostos);
                await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Crecimiento de terceros guardado.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar info terceros: {ex.Message}", Id = request.ProyId };
        }
    }

    private async Task<MutationResponse> ReplaceDescuentosAsync(DescuentosRequest request, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync(new CommandDefinition("DELETE FROM PROY_DESCUENTOS WHERE PROYID = :1", new DynamicParameters(new Dictionary<string, object?> { ["1"] = request.ProyId }), transaction: transaction, cancellationToken: cancellationToken));
            const string insertSql = @"INSERT INTO PROY_DESCUENTOS (PRDE_ID, PROYID, APSA_ID, ANNO, MES, PORCENTAJE, VALOR)
                                       VALUES (:1, :2, :3, :4, :5, :6, :7)";
            foreach (var item in request.Items)
            {
                var id = item.PrdeId ?? await GetNextIdAsync(connection, transaction, "PROY_DESCUENTOS", "PRDE_ID", cancellationToken);
                var parameters = new DynamicParameters();
                parameters.Add("1", id);
                parameters.Add("2", request.ProyId);
                parameters.Add("3", request.ApsaId);
                parameters.Add("4", item.Anno);
                parameters.Add("5", item.Mes);
                parameters.Add("6", item.Porcentaje);
                parameters.Add("7", item.Valor);
                await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Descuentos guardados.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar descuentos: {ex.Message}", Id = request.ProyId };
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
