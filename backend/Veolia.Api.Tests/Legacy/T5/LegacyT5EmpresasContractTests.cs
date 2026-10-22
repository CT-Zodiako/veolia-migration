using System.Collections.Concurrent;
using System.Data;
using System.Data.Common;
using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Empresas;

namespace Veolia.Api.Tests.Legacy.T5;

/// <summary>
/// /api/v1/empresas SQL and the untested eliminar/toggle-estado routes against legacy
/// back-tarificador/src/modules/empresas/{routes.js,controller.js} (HTTP contract of the other routes is covered by
/// EmpresasContractSmokeTests/RegulatorConfigContractTests). Binds listed in the order they are added (legacy positional order).
/// </summary>
public sealed class LegacyT5EmpresasContractTests
{
    // Legacy routes.js:6-9 + controller.js:20: SELECT * FROM auge_empresas ORDER BY EMPR_NOMBRE.
    [Fact]
    public async Task GetAllSql_IsTheLegacySelect()
    {
        var db = new T5EmprRecConnection();

        await new EmpresasRepository(new T5EmprRecFactory(db)).GetAllAsync(default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Equal("SELECT * FROM AUGE_EMPRESAS ORDER BY EMPR_NOMBRE", sql, ignoreCase: true);
        Assert.Empty(binds);
    }

    // Legacy routes.js:15-20 + controller.js:6-8: INSERT INTO AUGE_EMPRESAS VALUES (SAUGE_EMPRESAS.nextval, :1, :2, :3, sysdate, :4, :5)
    // with [nombre, estado, propia, usuario (= req.SISU_ID), nuap].
    [Fact]
    public async Task CreateSql_IsTheLegacyInsertWithTheTokenUser()
    {
        var db = new T5EmprRecConnection();

        await new EmpresasRepository(new T5EmprRecFactory(db)).CreateAsync("Aseo Sur", 1, 0, "321", 101, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Equal("INSERT INTO AUGE_EMPRESAS VALUES (SAUGE_EMPRESAS.nextval, :1, :2, :3, sysdate, :4, :5)", sql, ignoreCase: true);
        Assert.Equal(new object?[] { "Aseo Sur", 1, 0, 101L, "321" }, binds.Values.ToArray());
    }

    // Legacy routes.js:22-26 + controller.js:33-34: companies of the APS (AUCO_APSEMPRDIVI apsa_id = :1) with EMPR_PROPIA = :2
    // and EMPR_ESTADO = 1, binds [aps, propia].
    [Fact]
    public async Task ConsultarPropiasSql_IsTheLegacyJoin()
    {
        var db = new T5EmprRecConnection();

        await new EmpresasRepository(new T5EmprRecFactory(db)).ConsultarPropiasAsync(7, 1, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Equal("SELECT es.* FROM AUGE_EMPRESAS es INNER JOIN AUCO_APSEMPRDIVI apsem ON (es.empr_empr = apsem.empr_empr AND apsa_id = :1) WHERE EMPR_PROPIA = :2 AND ES.EMPR_ESTADO = 1", sql, ignoreCase: true);
        Assert.Equal(new object?[] { 7L, 1 }, binds.Values.ToArray());
    }

    // Legacy routes.js:28-33 reads { empr }; controller.js:26: SELECT * FROM auge_empresas WHERE empr_empr = :1.
    [Fact]
    public async Task ConsultaEmprSql_FiltersByEmprEmpr()
    {
        var db = new T5EmprRecConnection();

        await new EmpresasRepository(new T5EmprRecFactory(db)).ConsultaEmprAsync(3, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Equal("SELECT * FROM AUGE_EMPRESAS WHERE EMPR_EMPR = :1", sql, ignoreCase: true);
        Assert.Equal(new object?[] { 3L }, binds.Values.ToArray());
    }

    // Legacy routes.js:35-40 + controller.js:40-41: UPDATE ... EMPR_NUAP = :5 WHERE EMPR_EMPR = :4 bound positionally with
    // [nombre, estado, propia, nuap, id] — the 4th placeholder (:5) receives nuap and the 5th (:4) the URL id.
    [Fact]
    public async Task UpdateSql_BindsNuapAndIdLikeLegacy()
    {
        var db = new T5EmprRecConnection();

        await new EmpresasRepository(new T5EmprRecFactory(db)).UpdateAsync(3, "Aseo Sur", 0, 1, "321", default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Equal("UPDATE AUGE_EMPRESAS SET EMPR_NOMBRE = :1, EMPR_ESTADO = :2, EMPR_PROPIA = :3, EMPR_NUAP = :5 WHERE EMPR_EMPR = :4", sql, ignoreCase: true);
        Assert.Equal(new object?[] { "Aseo Sur", 0, 1, "321", 3L }, binds.Values.ToArray());
        Assert.Equal(("321", 3L), ((string)binds["5"]!, (long)binds["4"]!));
    }

    // Legacy routes.js:42-46 + controller.js:47: logical delete SET empr_estado = 0 WHERE empr_empr = :1 behind the token
    // (legacy read { empresa } from the body and had a stray ")" — the URL id is the route; middlewares/authJwt.js:12-15 → 403).
    [Fact]
    public async Task EliminarRoute_SetsEstadoZeroForTheUrlId()
    {
        using var factory = new T5EmprFactory();
        using var client = factory.CreateClient();

        var anonymous = await client.DeleteAsync("/api/v1/empresas/eliminar/3");
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TestJwt.AdminSisuId, 1));
        var response = await client.DeleteAsync("/api/v1/empresas/eliminar/3");

        Assert.Equal(HttpStatusCode.Forbidden, anonymous.StatusCode);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var (sql, binds) = Assert.Single(factory.Db.Commands);
        Assert.Equal("UPDATE AUGE_EMPRESAS SET EMPR_ESTADO = 0 WHERE EMPR_EMPR = :1", sql, ignoreCase: true);
        Assert.Equal(new object?[] { 3L }, binds.Values.ToArray());
    }

    // No legacy route: the grid toggle is new. It must keep the legacy estado catalog 1 = activa / 0 = inactiva
    // (formEmpr.vue:125,136 sends parseInt(emprEstado ? 1 : 0)).
    [Fact]
    public async Task ToggleEstadoRoute_FlipsBetweenTheLegacyValuesOneAndZero()
    {
        using var factory = new T5EmprFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TestJwt.AdminSisuId, 1));

        var response = await client.PatchAsync("/api/v1/empresas/toggle-estado/3", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var (sql, binds) = Assert.Single(factory.Db.Commands);
        Assert.Equal("UPDATE AUGE_EMPRESAS SET EMPR_ESTADO = CASE WHEN EMPR_ESTADO = 1 THEN 0 ELSE 1 END WHERE EMPR_EMPR = :1", sql, ignoreCase: true);
        Assert.Equal(new object?[] { 3L }, binds.Values.ToArray());
    }
}

file sealed class T5EmprFactory : WebApplicationFactory<Program>
{
    internal T5EmprRecConnection Db { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IEmpresasRepository>();
            services.AddSingleton<IEmpresasRepository>(new EmpresasRepository(new T5EmprRecFactory(Db)));
        });
    }
}

file sealed class T5EmprRecFactory(T5EmprRecConnection connection) : IOracleConnectionFactory
{
    public IDbConnection CreateConnection() => connection;
}

/// <summary>Records SQL (whitespace-collapsed) and binds in insertion order; returns empty result sets.</summary>
file sealed class T5EmprRecConnection : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;
    internal ConcurrentQueue<(string Sql, Dictionary<string, object?> Binds)> Commands { get; } = new();

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
    protected override DbCommand CreateDbCommand() => new T5EmprRecCommand(this);

    internal void Record(DbCommand command)
        => Commands.Enqueue((Regex.Replace(command.CommandText, @"\s+", " ").Trim(),
            command.Parameters.Cast<DbParameter>().ToDictionary(p => p.ParameterName, p => p.Value is DBNull ? null : p.Value)));
}

file sealed class T5EmprRecCommand(T5EmprRecConnection owner) : DbCommand
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
