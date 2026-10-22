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
using Veolia.Api.Modules.Regulator.Aps;

namespace Veolia.Api.Tests.Legacy.T5;

/// <summary>
/// /api/v1/aps SQL and the untested eliminar route against legacy back-tarificador/src/modules/aps/{routes.js,controller.js}
/// (HTTP contract of the other 6 routes is covered by ApsContractSmokeTests). Placeholders compared by position.
/// </summary>
public sealed class LegacyT5ApsContractTests
{
    // Legacy controller.js:53: SELECT * FROM auco_apsaseo ORDER BY APSA_NOMAPS; apsGrid.vue:34-146 shows APSA_ID, APSA_NOMAPS,
    // APSA_RESOLUCION, APSA_PROPIO, APSA_SOLORELL, APSA_ESTADO, APSA_VIAT, APSA_IDSUI (APSA_NUAP column commented out).
    [Fact]
    public async Task ConsultaGeneralSql_SelectsTheGridColumnsOrderedByName()
    {
        var db = new T5ApsRecConnection();

        await new ApsRepository(new T5ApsRecFactory(db)).ConsultaGeneralAsync(default);

        var (sql, binds) = Assert.Single(db.Commands);
        foreach (var column in new[] { "APSA_ID", "APSA_NOMAPS", "APSA_RESOLUCION", "APSA_PROPIO", "APSA_SOLORELL", "APSA_ESTADO", "APSA_VIAT", "APSA_IDSUI" })
            Assert.Matches($@"\b{column}\b", sql);
        Assert.EndsWith("FROM AUCO_APSASEO ORDER BY APSA_NOMAPS", sql);
        Assert.Empty(binds);
    }

    // Legacy routes.js:24-29 reads { aps }; controller.js:116: SELECT * FROM AUCO_APSASEO WHERE APSA_ID = :1.
    [Fact]
    public async Task ConsultaApsSql_FiltersByApsaId()
    {
        var db = new T5ApsRecConnection();

        await new ApsRepository(new T5ApsRecFactory(db)).ConsultaApsAsync(7, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Matches(@"FROM AUCO_APSASEO WHERE APSA_ID = :\w+$", sql);
        Assert.Equal(new object?[] { 7L }, binds.Values.ToArray());
    }

    // Legacy routes.js:31-36 + controller.js:73: APS assigned to the token user (AUCO_APSUSUARIOS SISU_ID = :1 AND APSI_ESTADO = 1)
    // that are active (apsa_estado = 1), ORDER BY APSA_NOMAPS.
    [Fact]
    public async Task ApsByUsuarioSql_FiltersAssignedActiveApsOfTheUser()
    {
        var db = new T5ApsRecConnection();

        await new ApsRepository(new T5ApsRecFactory(db)).GetApsByUsuarioAsync(101, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Contains("AUCO_APSUSUARIOS", sql);
        Assert.Matches(@"SISU_ID = :\w+", sql);
        Assert.Contains("APSI_ESTADO = 1", sql);
        Assert.Matches(@"\bA\.APSA_ESTADO = 1\b", sql.ToUpperInvariant());
        Assert.EndsWith("ORDER BY A.APSA_NOMAPS", sql.ToUpperInvariant());
        Assert.Equal(new object?[] { 101L }, binds.Values.ToArray());
    }

    // Legacy controller.js:20-25: SELECT b.SISU_CORREO, A.SISU_ID FROM AUCO_APSUSUARIOS a JOIN AUGE_SISUSUARIO b
    // WHERE APSA_ID = :1 AND A.APSI_ESTADO = 1 AND B.SISU_ESTADO = 1.
    [Fact]
    public async Task UsuarioPorApsSql_ReturnsActiveUsersOfTheAps()
    {
        var db = new T5ApsRecConnection();

        await new ApsRepository(new T5ApsRecFactory(db)).GetUsuarioPorApsAsync(7, default);

        var (sql, binds) = Assert.Single(db.Commands);
        var upper = sql.ToUpperInvariant();
        Assert.Matches(@"^SELECT SU\.SISU_CORREO, SU\.SISU_ID FROM AUCO_APSUSUARIOS AU INNER JOIN AUGE_SISUSUARIO SU", upper);
        Assert.Matches(@"AU\.APSA_ID = :\w+", upper);
        Assert.Contains("AU.APSI_ESTADO = 1", upper);
        Assert.Contains("SU.SISU_ESTADO = 1", upper);
        Assert.Equal(new object?[] { 7L }, binds.Values.ToArray());
    }

    // Legacy routes.js:38-46 + controller.js:9-12: INSERT INTO AUCO_APSASEO with SAUCO_APSASEO.nextval, sysdate, APSA_NOMAPS,
    // APSA_PROPIO, USUA_USUA (= req.SISU_ID), APSA_RESOLUCION, APSA_SOLORELL, APSA_ESTADO, APSA_IDSUI. The legacy statement
    // never ran (":7 :8" syntax error, argument shift); APSA_VIAT added with the approved A1/A2 work (parity-review-all T14).
    [Fact]
    public async Task CrearSql_InsertsTheLegacyColumnsWithSequenceSysdateAndUser()
    {
        var db = new T5ApsRecConnection();

        await new ApsRepository(new T5ApsRecFactory(db)).CrearAsync("APS Sur", "55", 720, 1, 0, 1, 1, 101, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.StartsWith("INSERT INTO AUCO_APSASEO", sql);
        Assert.Contains("SAUCO_APSASEO.NEXTVAL", sql);
        Assert.Contains("SYSDATE", sql);
        foreach (var column in new[] { "APSA_NOMAPS", "APSA_FECHACREACION", "APSA_PROPIO", "USUA_USUA", "APSA_RESOLUCION", "APSA_SOLORELL", "APSA_ESTADO", "APSA_IDSUI" })
            Assert.Contains(column, sql);
        Assert.Equal(("APS Sur", 1, 101L, 720, 0, 1, "55"),
            ((string)binds["nombre"]!, (int)binds["propio"]!, (long)binds["usuario"]!, (int)binds["resolucion"]!, (int)binds["relleno"]!, (int)binds["estado"]!, (string)binds["idsui"]!));
    }

    // Legacy routes.js:48-67 + controller.js:91-92: UPDATE auco_apsaseo SET APSA_NOMAPS, APSA_ESTADO, APSA_PROPIO,
    // APSA_RESOLUCION, APSA_SOLORELL, APSA_VIAT, APSA_IDSUI WHERE APSA_ID = :8 (id from the URL).
    [Fact]
    public async Task EditarSql_UpdatesTheLegacyColumnsOfTheUrlId()
    {
        var db = new T5ApsRecConnection();

        await new ApsRepository(new T5ApsRecFactory(db)).EditarAsync(7, "APS Sur", "55", 351, 0, 1, 1, 0, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.StartsWith("UPDATE AUCO_APSASEO SET", sql);
        foreach (var column in new[] { "APSA_NOMAPS", "APSA_ESTADO", "APSA_PROPIO", "APSA_RESOLUCION", "APSA_SOLORELL", "APSA_VIAT", "APSA_IDSUI" })
            Assert.Matches($@"\b{column} = :\w+", sql);
        Assert.Matches(@"WHERE APSA_ID = :\w+$", sql);
        Assert.Equal(("APS Sur", 1, 0, 351, 1, 0, "55", 7L),
            ((string)binds["nombre"]!, (int)binds["estado"]!, (int)binds["propio"]!, (int)binds["resolucion"]!, (int)binds["relleno"]!, (int)binds["iat"]!, (string)binds["idsui"]!, (long)binds["id"]!));
    }

    // Legacy controller.js:99: logical delete UPDATE auco_apsaseo SET apsa_estado = 0 WHERE apsa_id = :1.
    [Fact]
    public async Task EliminarSql_SetsEstadoZero()
    {
        var db = new T5ApsRecConnection();

        await new ApsRepository(new T5ApsRecFactory(db)).EliminarAsync(7, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Matches(@"^UPDATE AUCO_APSASEO SET APSA_ESTADO = 0 WHERE APSA_ID = :\w+$", sql);
        Assert.Equal(new object?[] { 7L }, binds.Values.ToArray());
    }

    // Legacy routes.js:69-74: DELETE /eliminar/:id behind the token (legacy read the id from the body; the URL id is the route);
    // middlewares/authJwt.js:12-15 answers a missing token with 403 "No existe token de verificacion".
    [Fact]
    public async Task EliminarRoute_UsesTheUrlIdBehindTheToken()
    {
        using var factory = new T5ApsFactory();
        using var client = factory.CreateClient();

        var anonymous = await client.DeleteAsync("/api/v1/aps/eliminar/7");
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TestJwt.AdminSisuId, 1));
        var response = await client.DeleteAsync("/api/v1/aps/eliminar/7");

        Assert.Equal(HttpStatusCode.Forbidden, anonymous.StatusCode);
        Assert.Contains("No existe token de verificacion", await anonymous.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var (sql, binds) = Assert.Single(factory.Db.Commands);
        Assert.Contains("APSA_ESTADO = 0", sql);
        Assert.Equal(new object?[] { 7L }, binds.Values.ToArray());
    }
}

file sealed class T5ApsFactory : WebApplicationFactory<Program>
{
    internal T5ApsRecConnection Db { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IApsRepository>();
            services.AddSingleton<IApsRepository>(new ApsRepository(new T5ApsRecFactory(Db)));
        });
    }
}

file sealed class T5ApsRecFactory(T5ApsRecConnection connection) : IOracleConnectionFactory
{
    public IDbConnection CreateConnection() => connection;
}

/// <summary>Records SQL (whitespace-collapsed) and named binds; returns empty result sets.</summary>
file sealed class T5ApsRecConnection : DbConnection
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
    protected override DbCommand CreateDbCommand() => new T5ApsRecCommand(this);

    internal void Record(DbCommand command)
        => Commands.Enqueue((Regex.Replace(command.CommandText, @"\s+", " ").Trim(),
            command.Parameters.Cast<DbParameter>().ToDictionary(p => p.ParameterName, p => p.Value is DBNull ? null : p.Value)));
}

file sealed class T5ApsRecCommand(T5ApsRecConnection owner) : DbCommand
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
