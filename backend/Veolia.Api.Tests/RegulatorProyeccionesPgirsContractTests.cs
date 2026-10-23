using System.Collections;
using System.Data;
using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Dapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Pgirs;
using Veolia.Api.Modules.Regulator.Proyecciones;

namespace Veolia.Api.Tests;

public sealed class RegulatorProyeccionesPgirsContractTests
{
    // ------------------------------------------------------------------
    // G1 (2001): PGIRS edit/create must open the connection before BeginTransaction().
    // ------------------------------------------------------------------

    [Fact]
    public async Task PgirsEditarOpensConnectionBeforeTransactionAndUpdatesEveryVariable()
    {
        var database = new RecordingConnectionFactory();
        var repository = new PgirsRepository(database);

        var updated = await repository.EditarVariablesAsync(
        [
            new EditarVariableDto { ApsId = 3, Anno = 2025, Mes = 4, CodVariable = 11, Valor = 1.5m, Frecuencia = "DIARIA" },
            new EditarVariableDto { ApsId = 3, Anno = 2025, Mes = 4, CodVariable = 22, Valor = 2m, Frecuencia = "MENSUAL" }
        ], usuarioId: 7);

        Assert.True(updated);
        Assert.Equal(["Open", "BeginTransaction", "Execute", "Execute", "Commit"], database.Events);
        Assert.All(database.Commands, c => Assert.Contains("UPDATE PGRI_PARAMETROS", c.Sql));
        Assert.Equal(1.5m, database.Commands[0].Parameters["valor"]);
        Assert.Equal("DIARIA", database.Commands[0].Parameters["frecuencia"]);
        Assert.Equal(7L, database.Commands[0].Parameters["usuarioId"]);
        Assert.Equal(11, database.Commands[0].Parameters["codVariable"]);
        Assert.Equal(22, database.Commands[1].Parameters["codVariable"]);
        Assert.Equal(3L, database.Commands[1].Parameters["apsId"]);
    }

    [Fact]
    public async Task PgirsNuevoOpensConnectionBeforeTransactionAndInsertsOnlyFilledVariables()
    {
        var database = new RecordingConnectionFactory();
        var repository = new PgirsRepository(database);

        var inserted = await repository.NuevoVariablesAsync(new NuevoVariablesRequestDto
        {
            ApsId = 3, Anno = 2025, Mes = 4,
            Lbl = 10m, LblFrecuencia = "DIARIA",
            Poda = 20m, PodaFrecuencia = "ANUAL"
        }, usuarioId: 7);

        Assert.True(inserted);
        Assert.Equal(["Open", "BeginTransaction", "Execute", "Execute", "Commit"], database.Events);
        Assert.All(database.Commands, c => Assert.Contains("INSERT INTO PGRI_PARAMETROS", c.Sql));
        Assert.Equal([11, 22], database.Commands.Select(c => c.Parameters["codVariable"]));
        Assert.Equal([10m, 20m], database.Commands.Select(c => c.Parameters["valor"]));
        Assert.Equal(["DIARIA", "ANUAL"], database.Commands.Select(c => c.Parameters["frecuencia"]));
        Assert.All(database.Commands, c => Assert.Equal(7L, c.Parameters["usuarioId"]));
    }

    // ------------------------------------------------------------------
    // P1 (901): Descripción required and written on create and edit (formCrear.vue:41-47,184; controller.js:18,145).
    // ------------------------------------------------------------------

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CrearProyeccionWithoutDescripcionIsRejected(string? descripcion)
    {
        using var factory = new ProyeccionesApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/proyecciones/crear", new
        {
            apsaId = 1, proyNombre = "Proy", proyDescripcion = descripcion, proyTipo100 = 1,
            proyAnnoDes = 2025, proyMesDes = 4, proyAnnoHas = 2026, proyMesHas = 3
        });
        var body = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(body.GetProperty("status").GetBoolean());
        Assert.Equal("La descripción de la proyección es obligatoria.", body.GetProperty("message").GetString());
        Assert.Null(factory.Proyecciones.LastCreate);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task EditarProyeccionWithoutDescripcionIsRejected(string? descripcion)
    {
        using var factory = new ProyeccionesApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PutAsJsonAsync("/api/v1/proyecciones/editar/8", new
        {
            apsaId = 1, proyNombre = "Proy", proyDescripcion = descripcion, proyTipo100 = 1,
            proyAnnoDes = 2025, proyMesDes = 4, proyAnnoHas = 2026, proyMesHas = 3
        });
        var body = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(body.GetProperty("status").GetBoolean());
        Assert.Equal("La descripción de la proyección es obligatoria.", body.GetProperty("message").GetString());
        Assert.Null(factory.Proyecciones.LastUpdate);
    }

    [Fact]
    public async Task CrearAndEditarForwardTheDescripcion()
    {
        using var factory = new ProyeccionesApiFactory();
        using var client = CreateClient(factory);
        var body = new
        {
            apsaId = 1, proyNombre = "Proy", proyDescripcion = "Escenario base", proyTipo100 = 2,
            proyAnnoDes = 2025, proyMesDes = 4, proyAnnoHas = 2026, proyMesHas = 3
        };

        var crear = await client.PostAsJsonAsync("/api/v1/proyecciones/crear", body);
        var editar = await client.PutAsJsonAsync("/api/v1/proyecciones/editar/8", body);

        Assert.Equal(HttpStatusCode.OK, crear.StatusCode);
        Assert.Equal(HttpStatusCode.OK, editar.StatusCode);
        Assert.Equal("Escenario base", factory.Proyecciones.LastCreate!.ProyDescripcion);
        Assert.Equal("Escenario base", factory.Proyecciones.LastUpdate!.ProyDescripcion);
        Assert.Equal(8, factory.Proyecciones.LastUpdateId);
    }

    [Fact]
    public async Task CrearInsertsTheDescripcion()
    {
        var database = new RecordingConnectionFactory { OutputValue = 55L };
        var repository = new ProyeccionRepository(database);

        var result = await repository.CrearAsync(new ProyeccionCreateRequest
        {
            ApsaId = 3, ProyNombre = "Proy", ProyDescripcion = "Escenario base", ProyTipo100 = 2,
            ProyAnnoDes = 2025, ProyMesDes = 4, ProyAnnoHas = 2026, ProyMesHas = 3
        }, usuarioId: 7, CancellationToken.None);

        var insert = Assert.Single(database.Commands);
        Assert.True(result.Success);
        Assert.Equal(55L, result.Id);
        Assert.Matches(@"\(PROYID, APS, PROYNOMBRE, PROYDESCRIPCION, PROYTIPO100,", insert.Sql);
        Assert.Equal(
            new object?[] { 3L, "Proy", "Escenario base", 2, 2025, 4, 2026, 3, 7L },
            new[] { "1", "2", "3", "4", "5", "6", "7", "8", "9" }.Select(k => insert.Parameters[k]));
    }

    // P1 + P6: legacy modificar (controller.js:145) updates nombre/descripción/tipo/hasta only;
    // APS and "Desde" are fixed once the proyección exists.
    [Fact]
    public async Task EditarUpdatesDescripcionButNeverApsOrDesde()
    {
        var database = new RecordingConnectionFactory();
        var repository = new ProyeccionRepository(database);

        await repository.EditarAsync(8, new ProyeccionUpdateRequest
        {
            ApsaId = 99, ProyNombre = "Proy", ProyDescripcion = "Nueva", ProyTipo100 = 2,
            ProyAnnoDes = 2001, ProyMesDes = 1, ProyAnnoHas = 2026, ProyMesHas = 3
        }, CancellationToken.None);

        var update = Assert.Single(database.Commands);
        var setClause = Regex.Match(update.Sql, @"SET(?<set>.*)WHERE", RegexOptions.Singleline).Groups["set"].Value;
        var assigned = Regex.Matches(setClause, @"(\w+)\s*=").Select(m => m.Groups[1].Value);
        Assert.Equal(["PROYNOMBRE", "PROYDESCRIPCION", "PROYTIPO100", "PROYANNOHAS", "PROYMESHAS"], assigned);
        Assert.Equal(
            new object?[] { "Proy", "Nueva", 2, 2026, 3, 8L },
            new[] { "1", "2", "3", "4", "5", "6" }.Select(k => update.Parameters[k]));
        Assert.DoesNotContain(99L, update.Parameters.Values);
        Assert.DoesNotContain(2001, update.Parameters.Values);
    }

    // ------------------------------------------------------------------
    // P6 (901): "Desde" comes from the last tariff (controller.js:186-207, vpro_lastarifa).
    // ------------------------------------------------------------------

    [Fact]
    public async Task UltimasTarifasReturnsTheLastTariffPeriodOfTheAps()
    {
        using var database = new SqliteRecordingDatabase(
            "CREATE TABLE VPRO_LASTARIFA (APSA_ID INTEGER, LAST_TARIFA TEXT)",
            "INSERT INTO VPRO_LASTARIFA VALUES (3, '2025-03'), (4, '2024-11')");
        var repository = new ProyeccionRepository(database);

        var aps3 = await repository.UltimasTarifasAsync(3, CancellationToken.None);
        var sinTarifa = await repository.UltimasTarifasAsync(5, CancellationToken.None);

        Assert.Equal([new UltimaTarifaResponse { Anno = 2025, Mes = 3 }], aps3.Cast<UltimaTarifaResponse>());
        Assert.Empty(sinTarifa);
    }

    [Fact]
    public async Task UltimasTarifasEndpointSerializesAnnoAndMes()
    {
        using var factory = new ProyeccionesApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/proyecciones/ultimastarifas", new { apsaId = 3 });
        var body = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(3, factory.Proyecciones.LastUltimaTarifaAps);
        var tarifa = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(2025, tarifa.GetProperty("anno").GetInt32());
        Assert.Equal(3, tarifa.GetProperty("mes").GetInt32());
    }

    // ------------------------------------------------------------------
    // P2 (903): Drive rows bind to the DTOs; COD_APS comes from the sheet like legacy
    // (controller.js:345,435-482,565-578,640-685).
    // ------------------------------------------------------------------

    [Fact]
    public async Task CrecimientoUsuariosBindsCodApsFromTheSheet()
    {
        using var factory = new ProyeccionesApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/proyecciones/registrarcrecimientousuarios", new
        {
            proyId = 8, apsaId = 3,
            items = new[] { new { codAps = 77, anno = 2025, semestre = 2, coduso = 1, nomclaseuso = "E1", codtipopred = 3, nomtipopred = "Urbano", cantidad = 10, toneladas = 1.5 } }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single(factory.Crecimiento.LastUsuarios!.Items);
        Assert.Equal(77m, item.CodAps);
        Assert.Equal(2, item.Semestre);
        Assert.Equal("E1", item.Nomclaseuso);
        Assert.Equal(10m, item.Cantidad);
        Assert.Equal(1.5m, item.Toneladas);
    }

    [Fact]
    public async Task CrecimientoUsuariosDeletesAndInsertsWithTheSheetCodAps()
    {
        var database = new RecordingConnectionFactory();
        var repository = new CrecimientoRepository(database);

        await repository.RegistrarUsuariosAsync(new CrecimientoUsuariosRequest
        {
            ProyId = 8, ApsaId = 3,
            Items = [new CrecimientoUsuariosItem { CodAps = 77, Anno = 2025, Semestre = 2, Coduso = 1 }]
        }, usuarioId: 7, CancellationToken.None);

        Assert.Equal(["Open", "BeginTransaction", "Execute", "Execute", "Commit"], database.Events);
        Assert.Equal(77m, database.Commands[0].Parameters["2"]);
        Assert.Equal(77m, database.Commands[1].Parameters["2"]);
        Assert.Equal(2, database.Commands[1].Parameters["4"]);
    }

    [Fact]
    public async Task CrecimientoPropiaAndTercerosUseTheSheetCodAps()
    {
        var database = new RecordingConnectionFactory();
        var repository = new CrecimientoRepository(database);

        await repository.RegistrarPropiaAsync(new CrecimientoPropiaRequest
        {
            ProyId = 8, ApsaId = 3, Items = [new CrecimientoPropiaItem { CodAps = 77, Anno = 2025, Mes = 1, VN = 5m, VCblj = 6m }]
        }, 7, CancellationToken.None);
        await repository.RegistrarTercerosAsync(new CrecimientoTercerosRequest
        {
            ProyId = 8, ApsaId = 3, Items = [new CrecimientoTercerosItem { CodAps = 78, Anno = 2025, Mes = 1, CN = 4m }]
        }, 7, CancellationToken.None);

        Assert.Equal([77m, 77m, 78m, 78m], database.Commands.Select(c => c.Parameters["2"]));
        Assert.Equal(5m, database.Commands[1].Parameters["10"]);
        Assert.Equal(6m, database.Commands[1].Parameters["20"]);
        Assert.Equal(4m, database.Commands[3].Parameters["8"]);
    }

    [Fact]
    public async Task CrecimientoWithoutSheetCodApsFallsBackToTheSelectedAps()
    {
        var database = new RecordingConnectionFactory();
        var repository = new CrecimientoRepository(database);

        await repository.RegistrarUsuariosAsync(new CrecimientoUsuariosRequest
        {
            ProyId = 8, ApsaId = 3, Items = [new CrecimientoUsuariosItem { Anno = 2025, Semestre = 1 }]
        }, 7, CancellationToken.None);

        Assert.Equal([3m, 3m], database.Commands.Select(c => c.Parameters["2"]));
    }

    [Fact]
    public async Task DescuentosDeleteByProyeccionAndInsertTheSheetCodAps()
    {
        var database = new RecordingConnectionFactory();
        var repository = new CrecimientoRepository(database);

        await repository.RegistrarDescuentosAsync(new DescuentosRequest
        {
            ProyId = 8, ApsaId = 3, Items = [new DescuentosItem { CodAps = 77, NomAps = "Tunja", Anno = 2025, Mes = 2, Dccs = 0.5m }]
        }, 7, CancellationToken.None);

        Assert.Equal("DELETE FROM PROY_DESCUENTOS WHERE PROY_ID = :1", database.Commands[0].Sql);
        Assert.Equal(8L, database.Commands[0].Parameters["1"]);
        Assert.Equal(77m, database.Commands[1].Parameters["2"]);
        Assert.Equal(0.5m, database.Commands[1].Parameters["6"]);
    }

    // ------------------------------------------------------------------
    // P4 (902): saving updates the unlocked rows and leaves DELTESTADO=1 rows untouched
    // (legacy editarLineadeTiempo.vue:106 only blocked the locked cells).
    // ------------------------------------------------------------------

    private const string LineaTiempoTable = """
        CREATE TABLE PROY_DETLINEATIEMPO (PROYID INTEGER, APS INTEGER, PROYANNO INTEGER, PROYMES INTEGER,
            DELTIPC NUMERIC, DELTIPCC NUMERIC, DELTSMLV NUMERIC, DELTIOEXP NUMERIC, DELTFACPRODUC NUMERIC,
            DELTESTADO INTEGER NOT NULL, DELTFECHA TEXT, USUARIO INTEGER, DELTINDIPCC NUMERIC, DELTIPCCS NUMERIC)
        """;

    [Fact]
    public async Task LineaTiempoSaveUpdatesUnlockedRowsAndKeepsLockedRowsUnchanged()
    {
        using var database = new SqliteRecordingDatabase(LineaTiempoTable, """
            INSERT INTO PROY_DETLINEATIEMPO (PROYID, APS, PROYANNO, PROYMES, DELTIPC, DELTESTADO, DELTFECHA, USUARIO)
            VALUES (8, 3, 2025, 1, 1, 1, 'antes', 5), (8, 3, 2025, 2, 2, 0, 'antes', 5)
            """);
        var repository = new LineaTiempoRepository(database);

        var result = await repository.UpsertAsync(new LineaTiempoUpsertRequest
        {
            ProyId = 8, ApsaId = 3, IsNew = false,
            Rows =
            [
                new LineaTiempoRow { Anno = 2025, Mes = 1, Deltipc = 9m, Deltestado = 1 },
                new LineaTiempoRow { Anno = 2025, Mes = 2, Deltipc = 9m, Deltestado = 0 }
            ]
        }, usuarioId: 7, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal("Línea de tiempo guardada correctamente. 1 fila(s) bloqueada(s) no se modificaron.", result.Message);
        Assert.Equal(8, result.Id);
        var rows = database.Query("SELECT PROYMES, CAST(DELTIPC AS TEXT), DELTESTADO, DELTFECHA, USUARIO FROM PROY_DETLINEATIEMPO ORDER BY PROYMES");
        Assert.Equal(2, rows.Count);
        Assert.Equal("1|1|1|antes|5", rows[0]);
        Assert.StartsWith("2|9|0|", rows[1]);
        Assert.EndsWith("|7", rows[1]);
        Assert.DoesNotContain("|antes|", rows[1]);
    }

    [Fact]
    public async Task LineaTiempoSaveWithOnlyUnlockedRowsKeepsTheOriginalMessage()
    {
        using var database = new SqliteRecordingDatabase(LineaTiempoTable, """
            INSERT INTO PROY_DETLINEATIEMPO (PROYID, APS, PROYANNO, PROYMES, DELTIPC, DELTESTADO, DELTFECHA, USUARIO)
            VALUES (8, 3, 2025, 1, 1, 0, 'antes', 5)
            """);
        var repository = new LineaTiempoRepository(database);

        var result = await repository.UpsertAsync(new LineaTiempoUpsertRequest
        {
            ProyId = 8, ApsaId = 3, IsNew = false,
            Rows = [new LineaTiempoRow { Anno = 2025, Mes = 1, Deltipc = 4m }]
        }, usuarioId: 7, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal("Línea de tiempo guardada correctamente.", result.Message);
        Assert.Equal(["1|4|0|7"], database.Query("SELECT PROYMES, CAST(DELTIPC AS TEXT), DELTESTADO, USUARIO FROM PROY_DETLINEATIEMPO"));
    }

    // PRESERVE: the first save of a timeline still inserts every row unlocked.
    [Fact]
    public async Task LineaTiempoFirstSaveStillInsertsUnlockedRows()
    {
        using var database = new SqliteRecordingDatabase(LineaTiempoTable);
        var repository = new LineaTiempoRepository(database);

        var result = await repository.UpsertAsync(new LineaTiempoUpsertRequest
        {
            ProyId = 8, ApsaId = 3, IsNew = true,
            Rows = [new LineaTiempoRow { Anno = 2025, Mes = 1, Deltipc = 4m }, new LineaTiempoRow { Anno = 2025, Mes = 2, Deltipc = 5m }]
        }, usuarioId: 7, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal("Línea de tiempo guardada correctamente.", result.Message);
        Assert.Equal(["8|3|1|4|0|7", "8|3|2|5|0|7"],
            database.Query("SELECT PROYID, APS, PROYMES, CAST(DELTIPC AS TEXT), DELTESTADO, USUARIO FROM PROY_DETLINEATIEMPO ORDER BY PROYMES"));
    }

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build());
        return client;
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
}

file sealed class ProyeccionesApiFactory : WebApplicationFactory<Program>
{
    internal CapturingProyeccionRepository Proyecciones { get; } = new();
    internal CapturingCrecimientoRepository Crecimiento { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IProyeccionRepository>();
            services.AddSingleton<IProyeccionRepository>(Proyecciones);
            services.RemoveAll<ICrecimientoRepository>();
            services.AddSingleton<ICrecimientoRepository>(Crecimiento);
        });
    }
}

file sealed class CapturingProyeccionRepository : IProyeccionRepository
{
    internal ProyeccionCreateRequest? LastCreate { get; private set; }
    internal ProyeccionUpdateRequest? LastUpdate { get; private set; }
    internal long? LastUpdateId { get; private set; }
    internal long? LastUltimaTarifaAps { get; private set; }

    public Task<IReadOnlyList<ProyeccionListItem>> ConsultaAsync(long apsaId, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<ProyeccionListItem>>([]);

    public Task<IReadOnlyList<ProyeccionListItem>> ConsultaGeneralAsync(long sisuId, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<ProyeccionListItem>>([]);

    public Task<ProyeccionDetail?> ConsultaProyAsync(long proyId, CancellationToken cancellationToken)
        => Task.FromResult<ProyeccionDetail?>(null);

    public Task<MutationResponse> CrearAsync(ProyeccionCreateRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        LastCreate = request;
        return Task.FromResult(new MutationResponse { Success = true, Message = "ok", Id = 1 });
    }

    public Task<MutationResponse> EditarAsync(long proyId, ProyeccionUpdateRequest request, CancellationToken cancellationToken)
    {
        LastUpdate = request;
        LastUpdateId = proyId;
        return Task.FromResult(new MutationResponse { Success = true, Message = "ok", Id = proyId });
    }

    public Task<MutationResponse> EliminarAsync(long proyId, CancellationToken cancellationToken)
        => Task.FromResult(new MutationResponse { Success = true, Id = proyId });

    public Task<IReadOnlyList<object>> UltimasTarifasAsync(long apsaId, CancellationToken cancellationToken)
    {
        LastUltimaTarifaAps = apsaId;
        return Task.FromResult<IReadOnlyList<object>>([new UltimaTarifaResponse { Anno = 2025, Mes = 3 }]);
    }
}

file sealed class CapturingCrecimientoRepository : ICrecimientoRepository
{
    internal CrecimientoUsuariosRequest? LastUsuarios { get; private set; }

    public Task<CrecimientoDriveConfig?> GetDriveConfigAsync(long apsaId, CancellationToken cancellationToken)
        => Task.FromResult<CrecimientoDriveConfig?>(null);

    public Task<CrecimientoPayload> ConsultarAsync(long proyId, CancellationToken cancellationToken)
        => Task.FromResult(new CrecimientoPayload());

    public Task<MutationResponse> RegistrarUsuariosAsync(CrecimientoUsuariosRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        LastUsuarios = request;
        return Task.FromResult(new MutationResponse { Success = true, Message = "ok", Id = request.ProyId });
    }

    public Task<MutationResponse> RegistrarPropiaAsync(CrecimientoPropiaRequest request, long usuarioId, CancellationToken cancellationToken)
        => Task.FromResult(new MutationResponse { Success = true, Id = request.ProyId });

    public Task<MutationResponse> RegistrarTercerosAsync(CrecimientoTercerosRequest request, long usuarioId, CancellationToken cancellationToken)
        => Task.FromResult(new MutationResponse { Success = true, Id = request.ProyId });

    public Task<MutationResponse> RegistrarDescuentosAsync(DescuentosRequest request, long usuarioId, CancellationToken cancellationToken)
        => Task.FromResult(new MutationResponse { Success = true, Id = request.ProyId });
}

file sealed record RecordedCommand(string Sql, IReadOnlyDictionary<string, object?> Parameters);

/// <summary>
/// Oracle-like fake: connections start closed, BeginTransaction on a closed connection throws
/// (like ODP.NET), and every command is recorded without touching a database.
/// </summary>
file class RecordingConnectionFactory : IOracleConnectionFactory
{
    internal List<string> Events { get; } = [];
    internal List<RecordedCommand> Commands { get; } = [];

    /// <summary>Value assigned to output parameters (e.g. RETURNING ... INTO).</summary>
    internal object? OutputValue { get; init; }

    public IDbConnection CreateConnection() => new RecordingDbConnection(this, CreateDatabaseConnection());

    protected virtual SqliteConnection? CreateDatabaseConnection() => null;
}

/// <summary>Same recorder backed by a shared in-memory SQLite database (SYSDATE mapped to CURRENT_TIMESTAMP).</summary>
file sealed class SqliteRecordingDatabase : RecordingConnectionFactory, IDisposable
{
    private readonly string connectionString = $"Data Source=proy{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
    private readonly SqliteConnection anchor;

    internal SqliteRecordingDatabase(params string[] setup)
    {
        anchor = new SqliteConnection(connectionString);
        anchor.Open();
        foreach (var sql in setup)
            anchor.Execute(sql);
    }

    protected override SqliteConnection CreateDatabaseConnection() => new(connectionString);

    internal List<string> Query(string sql)
    {
        using var reader = anchor.ExecuteReader(sql);
        var rows = new List<string>();
        while (reader.Read())
            rows.Add(string.Join("|", Enumerable.Range(0, reader.FieldCount).Select(i => reader.IsDBNull(i) ? "" : Convert.ToString(reader.GetValue(i), System.Globalization.CultureInfo.InvariantCulture))));
        return rows;
    }

    public void Dispose() => anchor.Dispose();
}

file sealed class RecordingDbConnection(RecordingConnectionFactory owner, SqliteConnection? database) : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;

    internal RecordingConnectionFactory Owner => owner;
    internal SqliteConnection? DatabaseConnection => database;

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => "recording";
    public override string DataSource => "recording";
    public override string ServerVersion => "1";
    public override ConnectionState State => state;

    public override void ChangeDatabase(string databaseName) { }

    public override void Open()
    {
        owner.Events.Add("Open");
        database?.Open();
        state = ConnectionState.Open;
    }

    public override Task OpenAsync(CancellationToken cancellationToken)
    {
        Open();
        return Task.CompletedTask;
    }

    public override void Close()
    {
        database?.Close();
        state = ConnectionState.Closed;
    }

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel)
    {
        owner.Events.Add("BeginTransaction");
        if (state != ConnectionState.Open)
            throw new InvalidOperationException("Connection must be open for this operation");
        return new RecordingTransaction(this, database?.BeginTransaction());
    }

    protected override DbCommand CreateDbCommand() => new RecordingCommand(this);

    protected override void Dispose(bool disposing)
    {
        if (disposing)
            database?.Dispose();
        base.Dispose(disposing);
    }
}

file sealed class RecordingTransaction(RecordingDbConnection connection, SqliteTransaction? inner) : DbTransaction
{
    internal SqliteTransaction? Inner => inner;
    public override IsolationLevel IsolationLevel => IsolationLevel.ReadCommitted;
    protected override DbConnection DbConnection => connection;

    public override void Commit()
    {
        connection.Owner.Events.Add("Commit");
        inner?.Commit();
    }

    public override void Rollback()
    {
        connection.Owner.Events.Add("Rollback");
        inner?.Rollback();
    }
}

file sealed class RecordingCommand(RecordingDbConnection connection) : DbCommand
{
    private readonly RecordingParameterCollection parameters = new();

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string CommandText { get; set; } = string.Empty;
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; } = CommandType.Text;
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get => connection; set { } }
    protected override DbParameterCollection DbParameterCollection => parameters;
    protected override DbTransaction? DbTransaction { get; set; }

    public override void Cancel() { }
    public override void Prepare() { }
    protected override DbParameter CreateDbParameter() => new RecordingParameter();

    public override int ExecuteNonQuery()
    {
        Record();
        using var inner = CreateDatabaseCommand();
        if (inner is not null)
            return inner.ExecuteNonQuery();

        foreach (var parameter in parameters.Items.Where(p => p.Direction != ParameterDirection.Input))
            parameter.Value = connection.Owner.OutputValue;
        return 1;
    }

    public override object? ExecuteScalar()
    {
        Record();
        using var inner = CreateDatabaseCommand();
        return inner?.ExecuteScalar();
    }

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
    {
        Record();
        var inner = CreateDatabaseCommand();
        return inner is not null ? inner.ExecuteReader(behavior) : new DataTable().CreateDataReader();
    }

    private void Record()
    {
        connection.Owner.Events.Add("Execute");
        connection.Owner.Commands.Add(new RecordedCommand(
            CommandText.Trim(),
            parameters.Items.ToDictionary(p => p.ParameterName, p => p.Value is DBNull ? null : p.Value)));
    }

    private SqliteCommand? CreateDatabaseCommand()
    {
        if (connection.DatabaseConnection is null)
            return null;

        var command = connection.DatabaseConnection.CreateCommand();
        command.CommandText = Regex.Replace(CommandText, @"\bSYSDATE\b", "CURRENT_TIMESTAMP", RegexOptions.IgnoreCase);
        command.Transaction = (DbTransaction as RecordingTransaction)?.Inner;
        foreach (var parameter in parameters.Items)
            command.Parameters.AddWithValue(":" + parameter.ParameterName, parameter.Value ?? DBNull.Value);
        return command;
    }
}

file sealed class RecordingParameter : DbParameter
{
    public override DbType DbType { get; set; }
    public override ParameterDirection Direction { get; set; } = ParameterDirection.Input;
    public override bool IsNullable { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ParameterName { get; set; } = string.Empty;
    public override int Size { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string SourceColumn { get; set; } = string.Empty;
    public override bool SourceColumnNullMapping { get; set; }
    public override object? Value { get; set; }
    public override void ResetDbType() { }
}

file sealed class RecordingParameterCollection : DbParameterCollection
{
    internal List<DbParameter> Items { get; } = [];

    public override int Count => Items.Count;
    public override object SyncRoot => Items;
    public override int Add(object value) { Items.Add((DbParameter)value); return Items.Count - 1; }
    public override void AddRange(Array values) { foreach (var value in values) Add(value!); }
    public override void Clear() => Items.Clear();
    public override bool Contains(object value) => Items.Contains((DbParameter)value);
    public override bool Contains(string value) => IndexOf(value) >= 0;
    public override void CopyTo(Array array, int index) => ((ICollection)Items).CopyTo(array, index);
    public override IEnumerator GetEnumerator() => Items.GetEnumerator();
    public override int IndexOf(object value) => Items.IndexOf((DbParameter)value);
    public override int IndexOf(string parameterName) => Items.FindIndex(p => p.ParameterName == parameterName);
    public override void Insert(int index, object value) => Items.Insert(index, (DbParameter)value);
    public override void Remove(object value) => Items.Remove((DbParameter)value);
    public override void RemoveAt(int index) => Items.RemoveAt(index);
    public override void RemoveAt(string parameterName) => Items.RemoveAt(IndexOf(parameterName));
    protected override DbParameter GetParameter(int index) => Items[index];
    protected override DbParameter GetParameter(string parameterName) => Items[IndexOf(parameterName)];
    protected override void SetParameter(int index, DbParameter value) => Items[index] = value;
    protected override void SetParameter(string parameterName, DbParameter value) => Items[IndexOf(parameterName)] = value;
}
