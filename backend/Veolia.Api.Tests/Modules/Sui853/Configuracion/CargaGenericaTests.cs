using System.Text;
using System.Data;
using Dapper;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Veolia.Api.Infrastructure.Data;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Veolia.Api.Infrastructure.GoogleDrive;
using Veolia.Api.Modules.Sui853.Configuracion;

namespace Veolia.Api.Tests;

public sealed class CargaGenericaTests
{
    [Theory]
    [InlineData("OTHER", "TABLE1")]
    [InlineData("SUI", "SUI.TABLE1")]
    [InlineData("SUI", "T;DELETE")]
    [InlineData("SUI", "\"TABLE1\"")]
    [InlineData("SUI", "T--")]
    [InlineData("SUI", "T@LINK")]
    [InlineData("SUI", "")]
    public void RejectsUnsafeDestinations(string owner, string table)
        => Assert.Throws<ArgumentException>(() => CargaGenericaValidation.Destination(owner, table));

    [Fact]
    public void NormalizesAndRejectsDuplicateHeadersAndUnknownSelections()
    {
        Assert.Equal("TABLE1", CargaGenericaValidation.Destination("sui", " table1 "));
        Assert.Throws<ArgumentException>(() => CargaGenericaValidation.Headers(["ID", " id "]));
        Assert.Throws<ArgumentException>(() => CargaGenericaValidation.Headers(["ID", ""]));
        Assert.Throws<ArgumentException>(() => CargaGenericaValidation.Columns(["ID"], Metadata, ["UNKNOWN"]));
        Assert.Throws<ArgumentException>(() => CargaGenericaValidation.Columns(["ID"], Metadata, ["ID", "ID"]));
    }

    [Fact]
    public void ConvertsValuesWithoutSilentDataLoss()
    {
        Assert.Equal(12.5m, CargaGenericaValidation.Value("12,5", "NUMBER"));
        Assert.Null(CargaGenericaValidation.Value("  ", "NUMBER"));
        Assert.Throws<ArgumentException>(() => CargaGenericaValidation.Value("NaN", "NUMBER"));
        Assert.Throws<ArgumentException>(() => CargaGenericaValidation.Value("garbage", "NUMBER"));
        Assert.Equal(new DateTime(2026, 1, 2), CargaGenericaValidation.Value("2026-01-02", "DATE"));
        Assert.Throws<ArgumentException>(() => CargaGenericaValidation.Value("01/02/26", "DATE"));
        Assert.Equal("x');DELETE", CargaGenericaValidation.Value("x');DELETE", "VARCHAR2"));
    }

    [Fact]
    public async Task PreviewReadsHeadersOnlyAndNeverMutates()
    {
        var repo = new Repository(); var sheets = new Sheets();
        var result = Assert.IsType<OkObjectResult>(await Controller(repo, sheets).Load(Request(), default));
        var data = JsonSerializer.SerializeToElement(result.Value).GetProperty("data");
        Assert.Equal("PREVIEW", data.GetProperty("mode").GetString());
        Assert.Equal("ID", data.GetProperty("commonColumns")[0].GetString());
        Assert.False(sheets.RowsRead); Assert.False(repo.Inserted); Assert.False(repo.Truncated);
    }

    [Fact]
    public async Task LoadInsertsSelectedBoundValuesWithoutTruncate()
    {
        var repo = new Repository(); var sheets = new Sheets();
        Assert.IsType<OkObjectResult>(await Controller(repo, sheets).Load(Request() with { PreviewOnly = false }, default));
        Assert.True(repo.Inserted); Assert.False(repo.Truncated);
        Assert.Equal(12.5m, repo.Rows![0][0]);
    }

    [Fact]
    public async Task InvalidValuesOrChangedHeadersNeverReachInsert()
    {
        var repo = new Repository(); var sheets = new Sheets { Value = "invalid" };
        Assert.IsType<BadRequestObjectResult>(await Controller(repo, sheets).Load(Request() with { PreviewOnly = false }, default));
        Assert.False(repo.Inserted);
        sheets = new Sheets { ChangedHeaders = true };
        Assert.IsType<BadRequestObjectResult>(await Controller(repo, sheets).Load(Request() with { PreviewOnly = false }, default));
        Assert.False(repo.Inserted);
    }

    [Fact]
    public async Task TruncateRequiresExplicitConfirmation()
    {
        var repo = new Repository(); var controller = Controller(repo, new Sheets());
        Assert.IsType<BadRequestObjectResult>(await controller.Truncate(new("SUI", "TABLE1"), default));
        Assert.False(repo.Truncated);
        Assert.IsType<OkObjectResult>(await controller.Truncate(new("SUI", "TABLE1", true), default));
        Assert.True(repo.Truncated);
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData(2, 403)]
    public async Task RequiresAuthenticatedSystemThreeContext(int? system, int expected)
    {
        var repo = new Repository(); var controller = Controller(repo, new Sheets(), system);
        Assert.Equal(expected, Assert.IsAssignableFrom<ObjectResult>(await controller.Tables(default)).StatusCode);
        Assert.Equal(expected, Assert.IsAssignableFrom<ObjectResult>(await controller.Load(Request(), default)).StatusCode);
        Assert.Equal(expected, Assert.IsAssignableFrom<ObjectResult>(await controller.Truncate(new("SUI", "T", true), default)).StatusCode);
        Assert.False(repo.Called); Assert.False(repo.Truncated);
        Assert.NotNull(Attribute.GetCustomAttribute(typeof(CargaGenericaController), typeof(MiddlewareFilterAttribute)));
    }

    [Theory]
    [InlineData("tablasSui")]
    [InlineData("listarHojasDrive")]
    [InlineData("cargaDriveDinamica")]
    [InlineData("truncateTable")]
    public async Task RealPipelineRejectsMissingAndForgedTokensBeforeDataAccess(string route)
    {
        var repository = new Repository();
        using var host = await new HostBuilder().ConfigureWebHost(web => web.UseTestServer().ConfigureServices(services =>
        {
            services.AddRouting();
            services.AddControllers().AddApplicationPart(typeof(CargaGenericaController).Assembly);
            services.AddSingleton<ICargaGenericaRepository>(repository);
            services.AddSingleton<IGoogleSheetsService>(new Sheets());
            services.AddSingleton<IOracleConnectionFactory>(new NoDatabase());
        }).Configure(app =>
        {
            app.UseRouting();
            app.UseEndpoints(endpoints => endpoints.MapControllers());
        })).StartAsync();
        using var client = host.GetTestClient();
        var body = new { sheetId = "sheet_1", sheetTitle = "Tab", owner = "SUI", tableName = "TABLE1", confirm = true };
        var missing = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/" + route, body);
        Assert.Equal(HttpStatusCode.Forbidden, missing.StatusCode);
        client.DefaultRequestHeaders.Add("x-access-token", "forged.payload.signature");
        var forged = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/" + route, body);
        Assert.Equal(HttpStatusCode.Unauthorized, forged.StatusCode);
        Assert.False(repository.Called); Assert.False(repository.Truncated);
    }

    [Fact]
    public async Task RepositoryUsesBoundValuesAndRollsBackWholeFailedLoad()
    {
        using var factory = new MemoryDatabase();
        var repository = new CargaGenericaRepository(factory);
        CargaColumn[] columns = [new("ID", "NUMBER", 1), new("NOTE", "VARCHAR2", 2)];
        var text = "x'); DELETE FROM SUI.TARGET; --";
        Assert.Equal(1, await repository.InsertAsync("TARGET", columns, [new object?[] { 1m, text }], default));
        Assert.Equal(text, factory.Anchor.QuerySingle<string>("SELECT NOTE FROM SUI.TARGET"));
        await Assert.ThrowsAsync<SqliteException>(() => repository.InsertAsync("TARGET", columns,
            [new object?[] { 2m, "rolled back" }, new object?[] { 1m, "duplicate" }], default));
        Assert.Equal(1, factory.Anchor.QuerySingle<int>("SELECT COUNT(*) FROM SUI.TARGET"));
        await Assert.ThrowsAsync<ArgumentException>(() => repository.InsertAsync("TARGET", [new("BAD", "NUMBER", 3)],
            [new object?[] { 1m }], default));
        await Assert.ThrowsAsync<ArgumentException>(() => repository.TruncateAsync("TARGET; DROP TABLE X", default));
    }

    private sealed class MemoryDatabase : IOracleConnectionFactory, IDisposable
    {
        private readonly string name = "carga" + Guid.NewGuid().ToString("N");
        public SqliteConnection Anchor { get; }
        public MemoryDatabase()
        {
            Anchor = (SqliteConnection)CreateConnection();
            Anchor.Open();
            Anchor.Execute("""
                CREATE TABLE ALL_TABLES (OWNER TEXT, TABLE_NAME TEXT);
                CREATE TABLE ALL_TAB_COLUMNS (OWNER TEXT, TABLE_NAME TEXT, COLUMN_NAME TEXT, DATA_TYPE TEXT, COLUMN_ID INTEGER);
                INSERT INTO ALL_TABLES VALUES ('SUI', 'TARGET');
                INSERT INTO ALL_TAB_COLUMNS VALUES ('SUI', 'TARGET', 'ID', 'NUMBER', 1), ('SUI', 'TARGET', 'NOTE', 'VARCHAR2', 2);
                CREATE TABLE SUI.TARGET (ID INTEGER PRIMARY KEY, NOTE TEXT);
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
        public void Dispose() => Anchor.Dispose();
    }

    private sealed class NoDatabase : IOracleConnectionFactory
    {
        public IDbConnection CreateConnection() => throw new InvalidOperationException("Database must not be accessed.");
    }

    private static readonly CargaColumn[] Metadata = [new("ID", "NUMBER", 1)];
    private static CargaGenericaRequest Request() => new("sheet_1", "Tab", "SUI", "TABLE1");
    private static CargaGenericaController Controller(Repository repository, Sheets sheets, int? system = 3)
    {
        var http = new DefaultHttpContext();
        if (system.HasValue) http.Request.Headers["x-access-token"] = "test." + Convert.ToBase64String(Encoding.UTF8.GetBytes(
            JsonSerializer.Serialize(new { SISU_ID = 1, idSistema = system.Value }))) + ".test";
        return new(repository, sheets, NullLogger<CargaGenericaController>.Instance)
        { ControllerContext = new ControllerContext { HttpContext = http } };
    }

    private sealed class Repository : ICargaGenericaRepository
    {
        public bool Called, Inserted, Truncated;
        public IReadOnlyList<object?[]>? Rows;
        public Task<IReadOnlyList<string>> TablesAsync(CancellationToken ct) { Called = true; return Task.FromResult<IReadOnlyList<string>>(["TABLE1"]); }
        public Task<IReadOnlyList<CargaColumn>> ColumnsAsync(string table, CancellationToken ct) { Called = true; return Task.FromResult<IReadOnlyList<CargaColumn>>(Metadata); }
        public Task<int> InsertAsync(string table, IReadOnlyList<CargaColumn> columns, IReadOnlyList<object?[]> rows, CancellationToken ct)
        { Inserted = true; Rows = rows; return Task.FromResult(rows.Count); }
        public Task TruncateAsync(string table, CancellationToken ct) { Truncated = true; return Task.CompletedTask; }
    }

    private sealed class Sheets : IGoogleSheetsService
    {
        public bool RowsRead, ChangedHeaders;
        public object Value = "12,5";
        public Task<IReadOnlyList<string>> ListTabTitlesAsync(string id, CancellationToken ct) => Task.FromResult<IReadOnlyList<string>>(["Tab"]);
        public Task<IReadOnlyList<GoogleSheetMetadata>> ListMetadataAsync(string id, CancellationToken ct)
            => Task.FromResult<IReadOnlyList<GoogleSheetMetadata>>([new(1, "Tab", 0, 2, 1)]);
        public Task<IReadOnlyList<string>> ReadHeadersAsync(string id, string title, CancellationToken ct)
            => Task.FromResult<IReadOnlyList<string>>([" id "]);
        public Task<GoogleSheetTabData> ReadTabAsync(string id, string title, CancellationToken ct)
        {
            RowsRead = true;
            return Task.FromResult(new GoogleSheetTabData { SheetTitle = title, Columns = [ChangedHeaders ? "OTHER" : " id "],
                Rows = [new() { [" id "] = Value }] });
        }
    }
}
