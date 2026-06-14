using Dapper;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.Common;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Tests;

public sealed class AuthRepositoryOracleIntegrationTests
{
    private readonly IConfiguration configuration;
    private readonly IOracleConnectionFactory connectionFactory;
    private readonly AuthRepository repository;

    public AuthRepositoryOracleIntegrationTests()
    {
        configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Veolia.Api"))
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        connectionFactory = new OracleConnectionFactory(configuration);
        repository = new AuthRepository(connectionFactory, configuration);
    }

    [Fact]
    public async Task R_AUTH_06_Repository_GetApsAsignadas_UserWithoutAssignments_ReturnsAsignadasEmpty()
    {
        if (!await IsOracleReadyAsync()) return;

        const long syntheticUserId = 90909991;
        var (asignadas, sinAsignar) = await repository.GetApsAsignadasAsync(syntheticUserId, CancellationToken.None);

        Assert.Empty(asignadas);
        Assert.True(sinAsignar.Count >= 1);
    }

    [Fact]
    public async Task R_AUTH_06_Repository_SetApsxUsuario_EmptyLists_DoNotChangeRows()
    {
        if (!await IsOracleReadyAsync()) return;

        var userId = await GetAnyUserWithApsAsync();
        var before = await GetActiveAssignmentCountAsync(userId);

        await repository.SetApsxUsuarioAsync(userId, Array.Empty<long>(), Array.Empty<long>(), CancellationToken.None);

        var after = await GetActiveAssignmentCountAsync(userId);
        Assert.Equal(before, after);
    }

    [Fact]
    public async Task R_AUTH_06_Repository_SetApsxUsuario_ReactivatesWithoutDuplicates()
    {
        if (!await IsOracleReadyAsync()) return;

        var assignment = await GetAnyAssignmentAsync();

        // Force current row to inactive to validate reactivation path.
        await ExecuteAsync(
            "UPDATE AUCO_APSUSUARIOS SET APSI_ESTADO = 0 WHERE SISU_ID = :sisuId AND APSA_ID = :apsaId",
            new { assignment.SisuId, assignment.ApsaId });

        try
        {
            await repository.SetApsxUsuarioAsync(
                assignment.SisuId,
                Array.Empty<long>(),
                [assignment.ApsaId, assignment.ApsaId],
                CancellationToken.None);

            var rowCount = await ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM AUCO_APSUSUARIOS WHERE SISU_ID = :sisuId AND APSA_ID = :apsaId",
                new { assignment.SisuId, assignment.ApsaId });

            var estado = await ExecuteScalarAsync<int>(
                "SELECT APSI_ESTADO FROM AUCO_APSUSUARIOS WHERE SISU_ID = :sisuId AND APSA_ID = :apsaId",
                new { assignment.SisuId, assignment.ApsaId });

            Assert.Equal(1, rowCount);
            Assert.Equal(1, estado);
        }
        finally
        {
            // Preserve environment parity after test.
            await ExecuteAsync(
                "UPDATE AUCO_APSUSUARIOS SET APSI_ESTADO = :estado WHERE SISU_ID = :sisuId AND APSA_ID = :apsaId",
                new { estado = assignment.EstadoOriginal, assignment.SisuId, assignment.ApsaId });
        }
    }

    [Fact]
    public async Task R_AUTH_06_Repository_SetApsxUsuario_MixedOutAndIn_UpdatesFinalState()
    {
        if (!await IsOracleReadyAsync()) return;

        var assignment = await GetAnyAssignmentAsync();
        var outApsId = assignment.ApsaId;
        var inApsId = await GetAnotherCatalogApsAsync(outApsId);

        var originalOutState = await GetAssignmentStateAsync(assignment.SisuId, outApsId);
        var originalInState = await GetAssignmentStateAsync(assignment.SisuId, inApsId);

        // Ensure deterministic preconditions for mixed mutation.
        await ExecuteAsync(
            "UPDATE AUCO_APSUSUARIOS SET APSI_ESTADO = 1 WHERE SISU_ID = :sisuId AND APSA_ID = :apsaId",
            new { sisuId = assignment.SisuId, apsaId = outApsId });

        await ExecuteAsync(
            "UPDATE AUCO_APSUSUARIOS SET APSI_ESTADO = 0 WHERE SISU_ID = :sisuId AND APSA_ID = :apsaId",
            new { sisuId = assignment.SisuId, apsaId = inApsId });

        try
        {
            await repository.SetApsxUsuarioAsync(
                assignment.SisuId,
                [outApsId],
                [inApsId],
                CancellationToken.None);

            var finalOutState = await GetAssignmentStateAsync(assignment.SisuId, outApsId);
            var finalInState = await GetAssignmentStateAsync(assignment.SisuId, inApsId);
            var inRowsCount = await GetAssignmentRowCountAsync(assignment.SisuId, inApsId);

            Assert.Equal(0, finalOutState);
            Assert.Equal(1, finalInState);
            Assert.Equal(1, inRowsCount);
        }
        finally
        {
            await RestoreAssignmentStateAsync(assignment.SisuId, outApsId, originalOutState);
            await RestoreAssignmentStateAsync(assignment.SisuId, inApsId, originalInState);
        }
    }

    private async Task<bool> IsOracleReadyAsync()
    {
        var connectionString = configuration["ConnectionStrings:Oracle"];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return false;
        }

        try
        {
            await ExecuteScalarAsync<int>("SELECT COUNT(1) FROM AUCO_APSASEO", null);
            await ExecuteScalarAsync<int>("SELECT COUNT(1) FROM AUCO_APSUSUARIOS", null);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<(long SisuId, long ApsaId, int EstadoOriginal)> GetAnyAssignmentAsync()
    {
        const string sql = @"
SELECT SISU_ID, APSA_ID, APSI_ESTADO
FROM AUCO_APSUSUARIOS
WHERE ROWNUM = 1";

        using var connection = await OpenConnectionAsync();
        var row = await connection.QueryFirstOrDefaultAsync(sql);
        if (row is null)
        {
            throw new InvalidOperationException("AUCO_APSUSUARIOS has no rows to test.");
        }

        var item = (IDictionary<string, object>)row;
        return (
            Convert.ToInt64(item["SISU_ID"]),
            Convert.ToInt64(item["APSA_ID"]),
            Convert.ToInt32(item["APSI_ESTADO"]));
    }

    private async Task<long> GetAnyUserWithApsAsync()
    {
        const string sql = @"
SELECT SISU_ID
FROM AUCO_APSUSUARIOS
WHERE ROWNUM = 1";

        var userId = await ExecuteScalarAsync<long?>(sql, null);
        if (!userId.HasValue)
        {
            throw new InvalidOperationException("No user found in AUCO_APSUSUARIOS.");
        }

        return userId.Value;
    }

    private async Task<int> GetActiveAssignmentCountAsync(long sisuId)
    {
        const string sql = @"
SELECT COUNT(1)
FROM AUCO_APSUSUARIOS
WHERE SISU_ID = :sisuId
  AND APSI_ESTADO = 1";

        return await ExecuteScalarAsync<int>(sql, new { sisuId });
    }

    private async Task<long> GetAnotherCatalogApsAsync(long excludedApsId)
    {
        const string sql = @"
SELECT APSA_ID
FROM AUCO_APSASEO
WHERE APSA_ESTADO = 1
  AND APSA_ID != :excludedApsId
  AND ROWNUM = 1";

        var apsId = await ExecuteScalarAsync<long?>(sql, new { excludedApsId });
        if (!apsId.HasValue)
        {
            throw new InvalidOperationException("No alternate APS available in AUCO_APSASEO for mixed mutation test.");
        }

        return apsId.Value;
    }

    private async Task<int?> GetAssignmentStateAsync(long sisuId, long apsaId)
    {
        const string sql = @"
SELECT APSI_ESTADO
FROM AUCO_APSUSUARIOS
WHERE SISU_ID = :sisuId
  AND APSA_ID = :apsaId";

        return await ExecuteScalarAsync<int?>(sql, new { sisuId, apsaId });
    }

    private async Task<int> GetAssignmentRowCountAsync(long sisuId, long apsaId)
    {
        const string sql = @"
SELECT COUNT(1)
FROM AUCO_APSUSUARIOS
WHERE SISU_ID = :sisuId
  AND APSA_ID = :apsaId";

        return await ExecuteScalarAsync<int>(sql, new { sisuId, apsaId });
    }

    private async Task RestoreAssignmentStateAsync(long sisuId, long apsaId, int? originalState)
    {
        if (originalState.HasValue)
        {
            await ExecuteAsync(
                "UPDATE AUCO_APSUSUARIOS SET APSI_ESTADO = :estado WHERE SISU_ID = :sisuId AND APSA_ID = :apsaId",
                new { estado = originalState.Value, sisuId, apsaId });
            return;
        }

        await ExecuteAsync(
            "DELETE FROM AUCO_APSUSUARIOS WHERE SISU_ID = :sisuId AND APSA_ID = :apsaId",
            new { sisuId, apsaId });
    }

    private async Task<int> ExecuteAsync(string sql, object? param)
    {
        using var connection = await OpenConnectionAsync();
        return await connection.ExecuteAsync(sql, param);
    }

    private async Task<T> ExecuteScalarAsync<T>(string sql, object? param)
    {
        using var connection = await OpenConnectionAsync();
        return (await connection.ExecuteScalarAsync<T>(sql, param))!;
    }

    private async Task<IDbConnection> OpenConnectionAsync()
    {
        var connection = connectionFactory.CreateConnection();
        if (connection is DbConnection dbConnection)
        {
            await dbConnection.OpenAsync(CancellationToken.None);
        }
        else
        {
            connection.Open();
        }

        return connection;
    }
}
