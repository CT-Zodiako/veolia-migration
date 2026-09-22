using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Sui853.Comercial;
using Veolia.Api.Modules.Sui853.Operaciones;

namespace Veolia.Api.Tests.Modules.Sui853.Operaciones;

public sealed class ResiduosGeneradosTests
{
    private static readonly string[] Columns =
    [
        "APS", "NOMAPS", "ANNO", "MES", "NUAP", "TIP_SITIO", "NRO_SITIO", "PLACA",
        "FEC_ENTRADA", "HOR_ENTRADA", "HOR_SALIDA", "NUM_MICRO", "TON_RBU", "TON_RBR",
        "TON_RSOU", "TON_RSOR", "SIS_MEDICION", "TON_APROVE", "VLR_PEAJES", "FEC_REGIST", "USU_REG"
    ];

    [Theory]
    [InlineData(null, 2026, 1)]
    [InlineData("", 2026, 1)]
    [InlineData("1 OR 1=1", 2026, 1)]
    [InlineData("-1", 2026, 1)]
    [InlineData("123456789012345678901234567890123456789", 2026, 1)]
    [InlineData("1", 0, 1)]
    [InlineData("1", 10000, 1)]
    [InlineData("1", 2026, 0)]
    [InlineData("1", 2026, 13)]
    public async Task InvalidRequestsFailBeforeOpeningDatabase(string? aps, int year, int month)
    {
        var request = new ResiduosGeneradosRequest(aps!, year, month);
        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), [], true));
        var repository = new ResiduosGeneradosRepository(new NoDatabase(), new SummaryRepository());
        await Assert.ThrowsAsync<ValidationException>(() => repository.GetDetailAsync(request, default));
    }

    [Fact]
    public async Task DetailProjectsOnlyLegacyColumnsAndBindsAllThreeFilters()
    {
        using var database = new MemoryDatabase();
        var repository = new ResiduosGeneradosRepository(database, new SummaryRepository());
        var rows = await repository.GetDetailAsync(new("42", 2026, 2), default);
        var row = Assert.Single(rows);
        Assert.Equal(Columns, row.Keys.ToArray());
        Assert.Equal("chosen", row["NOMAPS"]);
        Assert.Null(row["TON_RBU"]);
        Assert.DoesNotContain("EXTRA_COLUMN", row.Keys);
        var json = JsonSerializer.SerializeToElement(row, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.True(json.TryGetProperty("FEC_ENTRADA", out _));
        Assert.Empty(await repository.GetDetailAsync(new("99", 2026, 2), default));
        Assert.Empty(await repository.GetDetailAsync(new("42", 2027, 2), default));
        Assert.Empty(await repository.GetDetailAsync(new("42", 2026, 3), default));
    }

    [Fact]
    public async Task SummaryReusesGlobalReportWithoutOpeningDetailConnection()
    {
        var summary = new SummaryRepository();
        var repository = new ResiduosGeneradosRepository(new NoDatabase(), summary);
        Assert.Same(summary.Payload, await repository.GetSummaryAsync(default));
        Assert.True(summary.Called);
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData(1, 403)]
    [InlineData(2, 403)]
    [InlineData(3, 200)]
    public async Task BothActionsRequireSystemThree(int? system, int status)
    {
        var repository = new Repository();
        var controller = Controller(repository, system);
        Assert.Equal(status, Assert.IsAssignableFrom<ObjectResult>(await controller.Detail(new("42", 2026, 2), default)).StatusCode);
        Assert.Equal(status, Assert.IsAssignableFrom<ObjectResult>(await controller.Summary(default)).StatusCode);
        Assert.Equal(system == 3, repository.Called);
    }

    [Fact]
    public void ControllerRequiresSignatureCheckingMiddleware()
    {
        var attribute = Assert.Single(typeof(ResiduosGeneradosController)
            .GetCustomAttributes(typeof(MiddlewareFilterAttribute), true).Cast<MiddlewareFilterAttribute>());
        Assert.Equal(typeof(OperacionesAuthentication), attribute.ConfigurationType);
    }

    private static ResiduosGeneradosController Controller(Repository repository, int? system)
    {
        var http = new DefaultHttpContext();
        // Direct action tests cover claims only; these unsigned tokens must never be used over HTTP.
        if (system.HasValue)
            http.Request.Headers["x-access-token"] = "test." + Convert.ToBase64String(Encoding.UTF8.GetBytes(
                JsonSerializer.Serialize(new { SISU_ID = 1, idSistema = system.Value }))) + ".test";
        return new(repository, NullLogger<ResiduosGeneradosController>.Instance)
        { ControllerContext = new ControllerContext { HttpContext = http } };
    }

    private sealed class MemoryDatabase : IOracleConnectionFactory, IDisposable
    {
        private readonly string name = "residuos" + Guid.NewGuid().ToString("N");
        private readonly SqliteConnection anchor;
        public MemoryDatabase()
        {
            anchor = (SqliteConnection)CreateConnection();
            anchor.Open();
            anchor.Execute("CREATE TABLE SUI.TGEN_RESGENERADOS (" +
                string.Join(", ", Columns.Select(column => column + " TEXT")) + ", EXTRA_COLUMN TEXT)");
            anchor.Execute("""
                INSERT INTO SUI.TGEN_RESGENERADOS (APS, NOMAPS, ANNO, MES, EXTRA_COLUMN)
                VALUES ('42', 'chosen', '2026', '2', 'must not leak'),
                       ('43', 'other APS', '2026', '2', NULL),
                       ('42', 'other year', '2025', '2', NULL),
                       ('42', 'other month', '2026', '1', NULL)
                """);
        }
        public IDbConnection CreateConnection()
        {
            var connection = new SqliteConnection($"Data Source={name};Mode=Memory;Cache=Shared");
            connection.StateChange += (_, args) =>
            {
                if (args.CurrentState == ConnectionState.Open)
                    connection.Execute($"ATTACH DATABASE 'file:{name}sui?mode=memory&cache=shared' AS SUI");
            };
            return connection;
        }
        public void Dispose() => anchor.Dispose();
    }

    private sealed class NoDatabase : IOracleConnectionFactory
    {
        public IDbConnection CreateConnection() => throw new InvalidOperationException("Unexpected database access.");
    }

    private sealed class SummaryRepository : IComercialRepository
    {
        public bool Called;
        public JsonObject Payload { get; } = new() { ["meta"] = new JsonObject(), ["data"] = new JsonArray() };
        public Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken)
        { Called = true; return Task.FromResult<JsonObject?>(Payload); }
        public Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(ComercialRequest request, CancellationToken cancellationToken)
            => throw new InvalidOperationException("Comercial detail must not be used.");
    }

    private sealed class Repository : IResiduosGeneradosRepository
    {
        public bool Called;
        public Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(ResiduosGeneradosRequest request, CancellationToken cancellationToken)
        { Called = true; return Task.FromResult<IReadOnlyList<Dictionary<string, object?>>>([]); }
        public Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken)
        { Called = true; return Task.FromResult<JsonObject?>(null); }
    }
}
