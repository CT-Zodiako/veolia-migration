using System.Collections.Concurrent;
using System.Data;
using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Rellenos;

namespace Veolia.Api.Tests.Legacy.T5;

/// <summary>
/// /api/v1/rellenos (5 routes) against legacy back-tarificador/src/modules/rellenos/{routes.js,controller.js} and
/// front-tarificador/src/{service/RellenoService.js,components/rellConf/*.vue}. Request keys rell_* instead of
/// nombre/nusd/regional/estado/propio/id are the typed DTO the new client sends (rellenos.models.ts); the legacy
/// eliminar bug (empr_estado) is recorded as fixed (parity-review-all T14 "Rellenos: legacy CRITICAL bugs fixed").
/// </summary>
public sealed class LegacyT5RellenosContractTests
{
    // Legacy routes.js:6-10 + controller.js:15: rows of AUCO_RELLENOS sent raw (no envelope) with Oracle column names;
    // rellGrid.vue:34-104 shows RELL_ID, RELL_NOMRELLENO, RELL_PROPIO, RELL_REGIONAL, RELL_ESTADO, RELL_NUSD.
    [Fact]
    public async Task Listar_ReturnsRawRowsWithTheGridColumns()
    {
        using var factory = new T5RellenosFactory();
        using var client = T5RellenosFactory.Client(factory);

        var response = await client.GetAsync("/api/v1/rellenos");
        var row = (await T5RellenosFactory.Json(response))[0];

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(4, row.GetProperty("RELL_ID").GetInt64());
        Assert.Equal("Doña Juana", row.GetProperty("RELL_NOMRELLENO").GetString());
        Assert.Equal(1, row.GetProperty("RELL_PROPIO").GetInt32());
        Assert.Equal(0, row.GetProperty("RELL_REGIONAL").GetInt32());
        Assert.Equal(1, row.GetProperty("RELL_ESTADO").GetInt32());
        Assert.Equal("900", row.GetProperty("RELL_NUSD").GetString());
    }

    // Legacy routes.js:12-16 reads the id and controller.js:23 binds it as RELL_ID; RellenoService.js:22-34 uses data[0].
    [Fact]
    public async Task Consultar_BindsTheIdAndReturnsTheRowArray()
    {
        using var factory = new T5RellenosFactory();
        using var client = T5RellenosFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/rellenos/consultarrelleno", new { rell_id = 4 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(4, (await T5RellenosFactory.Json(response))[0].GetProperty("RELL_ID").GetInt64());
        Assert.Equal(["Consultar:4"], factory.Repository.Calls);
    }

    // Legacy routes.js:18-23 stamps USUA_USUA with req.SISU_ID (token user); routes.js:26-31 / 34-37 take the id from the URL.
    [Fact]
    public async Task Mutations_UseTheTokenUserAndTheUrlId()
    {
        using var factory = new T5RellenosFactory();
        using var client = T5RellenosFactory.Client(factory);
        var body = new { rell_nomrelleno = "Nuevo", rell_descripcion = "Nuevo", rell_estado = 1, rell_propio = 1, rell_regional = 0, rell_nusd = "77" };

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/v1/rellenos/crear", body)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/v1/rellenos/editar/4", body)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.DeleteAsync("/api/v1/rellenos/eliminar/4")).StatusCode);

        Assert.Equal([$"Crear:Nuevo:{TestJwt.AdminSisuId}", "Editar:4:Nuevo", "Eliminar:4"], factory.Repository.Calls);
    }

    // Legacy controller.js:15: SELECT * FROM auco_rellenos ORDER BY RELL_NOMRELLENO.
    [Fact]
    public async Task ListarSql_ReadsAucoRellenosOrderedByName()
    {
        var db = new T5RecConnection();

        await new RellenosRepository(new T5RecFactory(db)).ListarAsync(default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Matches(@"FROM AUCO_RELLENOS ORDER BY RELL_NOMRELLENO$", sql);
        Assert.Empty(binds);
    }

    // Legacy controller.js:23: SELECT * FROM auco_rellenos WHERE RELL_ID = :1.
    [Fact]
    public async Task ConsultarSql_FiltersByRellId()
    {
        var db = new T5RecConnection();

        await new RellenosRepository(new T5RecFactory(db)).ConsultarAsync(new RellenoRequest { rell_id = 4 }, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Matches(@"FROM AUCO_RELLENOS WHERE RELL_ID = :\w+$", sql);
        Assert.Equal(new object?[] { 4L }, binds.Values.ToArray());
    }

    // Legacy controller.js:6-8: INSERT ... VALUES (SAUCO_RELLENOS.nextval, nombre, nombre, estado, nusd, propio, sysdate,
    // regional, usuario) — RELL_FECHACREACION = sysdate and USUA_USUA = token user.
    [Fact]
    public async Task CrearSql_InsertsWithSequenceSysdateAndTokenUser()
    {
        var db = new T5RecConnection();

        await new RellenosRepository(new T5RecFactory(db)).CrearAsync(
            new CrearRellenoRequest { rell_nomrelleno = "Nuevo", rell_descripcion = "Nuevo", rell_estado = 1, rell_propio = 1, rell_regional = 0, rell_nusd = "77" }, 101, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.StartsWith("INSERT INTO AUCO_RELLENOS", sql);
        Assert.Contains("SAUCO_RELLENOS.NEXTVAL", sql);
        Assert.Contains("SYSDATE", sql);
        Assert.Equal(("Nuevo", 1, 77L.ToString(), 1, 0, 101L),
            ((string)binds["rellNomrelleno"]!, (int)binds["rellEstado"]!, (string)binds["rellNusd"]!, (int)binds["rellPropio"]!, (int)binds["rellRegional"]!, (long)binds["usuaUsua"]!));
    }

    // Legacy controller.js:8 binds RELL_DESCRIPCION with the name (the legacy form formRell.vue has no Descripción field).
    [Fact(Skip = "PARITY-FINDING: RELL_DESCRIPCION is taken from a new required Descripción field (relleno-form.component.ts) and editar also overwrites it; legacy stored the name as description on create (controller.js:8) and never changed it on edit (controller.js:31). Without rell_descripcion the INSERT binds NULL. Not recorded in parity-review-all.")]
    public async Task CrearSql_StoresTheNameAsDescriptionLikeLegacy()
    {
        var db = new T5RecConnection();

        await new RellenosRepository(new T5RecFactory(db)).CrearAsync(new CrearRellenoRequest { rell_nomrelleno = "Nuevo", rell_estado = 1 }, 101, default);

        Assert.Equal("Nuevo", Assert.Single(db.Commands).Binds["rellDescripcion"]);
    }

    // Legacy controller.js:31-32: UPDATE auco_rellenos SET RELL_NOMRELLENO, RELL_ESTADO, RELL_NUSD, RELL_PROPIO, RELL_REGIONAL WHERE rell_id = id.
    [Fact]
    public async Task EditarSql_UpdatesTheLegacyColumnsOfTheUrlId()
    {
        var db = new T5RecConnection();

        await new RellenosRepository(new T5RecFactory(db)).EditarAsync(4,
            new EditarRellenoRequest { rell_nomrelleno = "Editado", rell_descripcion = "d", rell_estado = 1, rell_propio = 0, rell_regional = 1, rell_nusd = "88" }, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.StartsWith("UPDATE AUCO_RELLENOS SET", sql);
        foreach (var column in new[] { "RELL_NOMRELLENO", "RELL_ESTADO", "RELL_NUSD", "RELL_PROPIO", "RELL_REGIONAL" })
            Assert.Matches($@"\b{column} = :\w+", sql);
        Assert.Matches(@"WHERE RELL_ID = :\w+$", sql);
        Assert.Equal(("Editado", 1, "88", 0, 1, 4L),
            ((string)binds["rellNomrelleno"]!, (int)binds["rellEstado"]!, (string)binds["rellNusd"]!, (int)binds["rellPropio"]!, (int)binds["rellRegional"]!, (long)binds["rellId"]!));
    }

    // Legacy controller.js:38 meant a logical delete to estado 0 (column typo recorded as fixed); legacy formRell.vue:154,166
    // stores inactive as 0.
    [Fact(Skip = "PARITY-FINDING: eliminar writes RELL_ESTADO = 2 (and the form sends 2 for inactive); legacy used 0 for inactive (controller.js:38, formRell.vue:154,166). Already recorded as UNCERTAIN T14 L1 (check DISTINCT RELL_ESTADO in production); not approved.")]
    public async Task EliminarSql_SetsEstadoZeroLikeLegacy()
    {
        var db = new T5RecConnection();

        await new RellenosRepository(new T5RecFactory(db)).EliminarAsync(4, default);

        Assert.Contains("RELL_ESTADO = 0", Assert.Single(db.Commands).Sql);
    }
}

file sealed class T5RellenosFactory : WebApplicationFactory<Program>
{
    internal T5RellenosRepository Repository { get; } = new();

    internal static HttpClient Client(T5RellenosFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TestJwt.AdminSisuId, 1));
        return client;
    }

    internal static async Task<JsonElement> Json(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IRellenosRepository>();
            services.AddSingleton<IRellenosRepository>(Repository);
        });
    }
}

file sealed class T5RellenosRepository : IRellenosRepository
{
    internal ConcurrentQueue<string> Calls { get; } = new();

    private static RellenoResponse Row(long id) => new()
    {
        RELL_ID = id, RELL_NOMRELLENO = "Doña Juana", RELL_DESCRIPCION = "Doña Juana", RELL_ESTADO = 1, RELL_PROPIO = 1,
        RELL_REGIONAL = 0, RELL_NUSD = "900", RELL_FECHACREACION = new DateTime(2024, 1, 2), USUA_USUA = 9
    };

    public Task<IReadOnlyList<RellenoResponse>> ListarAsync(CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<RellenoResponse>>([Row(4)]);

    public Task<IReadOnlyList<RellenoResponse>> ConsultarAsync(RellenoRequest request, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"Consultar:{request.rell_id}");
        return Task.FromResult<IReadOnlyList<RellenoResponse>>([Row(request.rell_id)]);
    }

    public Task<object?> CrearAsync(CrearRellenoRequest request, long sisuId, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"Crear:{request.rell_nomrelleno}:{sisuId}");
        return Task.FromResult<object?>(new { rowsAffected = 1 });
    }

    public Task<object?> EditarAsync(long id, EditarRellenoRequest request, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"Editar:{id}:{request.rell_nomrelleno}");
        return Task.FromResult<object?>(new { rowsAffected = 1 });
    }

    public Task<object?> EliminarAsync(long id, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"Eliminar:{id}");
        return Task.FromResult<object?>(new { rowsAffected = 1 });
    }
}

file sealed class T5RecFactory(T5RecConnection connection) : IOracleConnectionFactory
{
    public IDbConnection CreateConnection() => connection;
}

/// <summary>Records SQL (whitespace-collapsed) and named binds; returns empty result sets.</summary>
file sealed class T5RecConnection : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;
    internal List<(string Sql, Dictionary<string, object?> Binds)> Commands { get; } = [];

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => "t5";
    public override string DataSource => "t5";
    public override string ServerVersion => "1";
    public override ConnectionState State => state;
    public override void ChangeDatabase(string databaseName) { }
    public override void Close() => state = ConnectionState.Closed;
    public override void Open() => state = ConnectionState.Open;
    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) => throw new NotSupportedException();
    protected override DbCommand CreateDbCommand() => new T5RecCommand(this);

    internal void Record(DbCommand command)
        => Commands.Add((Regex.Replace(command.CommandText, @"\s+", " ").Trim(),
            command.Parameters.Cast<DbParameter>().ToDictionary(p => p.ParameterName, p => p.Value is DBNull ? null : p.Value)));
}

file sealed class T5RecCommand(T5RecConnection owner) : DbCommand
{
    private readonly SqliteCommand inner = new();

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string CommandText { get; set; } = string.Empty;
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; }
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get; set; }
    protected override DbParameterCollection DbParameterCollection => inner.Parameters;
    protected override DbTransaction? DbTransaction { get; set; }
    public override void Cancel() { }
    public override void Prepare() { }
    protected override DbParameter CreateDbParameter() => inner.CreateParameter();

    public override int ExecuteNonQuery()
    {
        owner.Record(this);
        return 1;
    }

    public override object? ExecuteScalar()
    {
        owner.Record(this);
        return null;
    }

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
    {
        owner.Record(this);
        return new DataTable().CreateDataReader();
    }
}
