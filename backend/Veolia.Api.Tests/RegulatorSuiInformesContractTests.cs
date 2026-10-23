using System.Collections;
using System.Data;
using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging.Abstractions;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Sui;

namespace Veolia.Api.Tests;

/// <summary>
/// Regulator SUI 801/802 parity with the legacy back-tarificador (sui/routes.js, sui/controller.js).
/// </summary>
public sealed class RegulatorSuiInformesContractTests
{
    internal const int Aps = 7;
    internal const int Anno = 2025;
    internal const int Mes = 3;

    // ---------- S1: PK_SUI.fsui_fejecutasui bind order and OUT handling (legacy sui/controller.js:137-150) ----------

    [Fact]
    public async Task ProcesarBindsApsAnnoMesUsuarioInLegacyOrder()
    {
        var connection = new RecordingDbConnection(SuiTestData.SuiResponder(fejecutaResult: "OK"));
        var repository = new SuiRepository(new RecordingConnectionFactory(connection), NullLogger<SuiRepository>.Instance);

        await repository.ProcesarAsync(new SuiProcesarRequest { Aps = Aps, Anno = Anno, Mes = Mes }, 101, CancellationToken.None);

        var ejecuta = Assert.Single(connection.Commands, c => c.CommandText.Contains("fsui_fejecutasui", StringComparison.OrdinalIgnoreCase));
        Assert.Contains("PK_SUI.fsui_fejecutasui(:1, :2, :3, :4)", ejecuta.CommandText);
        Assert.Equal(Aps, ejecuta.Value("1"));
        Assert.Equal(Anno, ejecuta.Value("2"));
        Assert.Equal(Mes, ejecuta.Value("3"));
        Assert.Equal(101L, ejecuta.Value("4"));
        var res = ejecuta.Parameter("res");
        Assert.Equal(ParameterDirection.Output, res.Direction);
        Assert.Equal(DbType.String, res.DbType);
        Assert.True(connection.Committed);
    }

    [Theory]
    [InlineData("OK")]
    [InlineData("1")]
    [InlineData("0")]
    public async Task ProcesarReadsOutAsStringAndSucceedsWhenThePackageDoesNotThrow(string resultado)
    {
        // Legacy returned HTTP 200 with resPl.res (a STRING) whenever the block did not throw; only 500 was an error.
        var connection = new RecordingDbConnection(SuiTestData.SuiResponder(fejecutaResult: resultado));
        var repository = new SuiRepository(new RecordingConnectionFactory(connection), NullLogger<SuiRepository>.Instance);

        var response = await repository.ProcesarAsync(new SuiProcesarRequest { Aps = Aps, Anno = Anno, Mes = Mes }, 101, CancellationToken.None);

        Assert.True(response.Exitoso);
        Assert.Equal(resultado, response.Resultado);
        // SUI_AUDITORIA exists in no schema of the real database (oracle-real-validation L5) and legacy
        // sui/controller.js never audited Procesar, so nothing is written there.
        Assert.DoesNotContain(connection.Commands, c => c.CommandText.Contains("SUI_AUDITORIA"));
    }

    [Fact]
    public async Task ProcesarReadsPostProcessStatusFromTheTwoArgTableFunctionForTheAps()
    {
        var connection = new RecordingDbConnection(SuiTestData.SuiResponder(fejecutaResult: "OK"));
        var repository = new SuiRepository(new RecordingConnectionFactory(connection), NullLogger<SuiRepository>.Instance);

        var response = await repository.ProcesarAsync(new SuiProcesarRequest { Aps = Aps, Anno = Anno, Mes = Mes }, 101, CancellationToken.None);

        Assert.DoesNotContain(connection.Commands, c => c.CommandText.Contains(":res := PK_SUI.fsui_estado", StringComparison.OrdinalIgnoreCase));
        var estado = Assert.Single(connection.Commands, c => c.CommandText.Contains("TABLE(PK_SUI.fsui_estado(:anno, :mes))"));
        Assert.Contains("APSID = :aps", estado.CommandText);
        Assert.Equal(Anno, estado.Value("anno"));
        Assert.Equal(Mes, estado.Value("mes"));
        Assert.Equal(Aps, estado.Value("aps"));
        Assert.Equal("F19: PROCESADO | F23: PROCESADO | F24: PROCESADO | F35: NO APLICA | F36: NO APLICA", response.Estado);
        Assert.Equal(["F19", "F24"], response.FormatosProcesados);
    }

    [Fact]
    public async Task ProcesarStillBlocksWhenThePrecheckDoesNotReturnOne()
    {
        var connection = new RecordingDbConnection(SuiTestData.SuiResponder(fejecutaResult: "OK", precheck: "0"));
        var repository = new SuiRepository(new RecordingConnectionFactory(connection), NullLogger<SuiRepository>.Instance);

        await Assert.ThrowsAsync<PreconditionFailedException>(() =>
            repository.ProcesarAsync(new SuiProcesarRequest { Aps = Aps, Anno = Anno, Mes = Mes }, 101, CancellationToken.None));

        Assert.DoesNotContain(connection.Commands, c => c.CommandText.Contains("fsui_fejecutasui", StringComparison.OrdinalIgnoreCase));
        Assert.False(connection.Committed);
        Assert.True(connection.RolledBack);
    }

    // ---------- S2: Usuario comes from the JWT (legacy routes.js:58-63 and :41-45 use req.SISU_ID) ----------

    [Fact]
    public async Task ProcesarTakesUsuarioFromTheTokenAndIgnoresTheBody()
    {
        using var factory = new RegulatorSuiApiFactory();
        using var client = SuiTestData.CreateClient(factory, sisuId: 101);

        var response = await client.PostAsJsonAsync("/api/v1/sui/Procesar", new { aps = Aps, anno = Anno, mes = Mes, usuario = 999 });
        var body = JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal(101L, factory.Sui.LastProcesarUsuario);
        Assert.Equal(Anno, factory.Sui.LastProcesar!.Anno);
        Assert.Equal(Mes, factory.Sui.LastProcesar!.Mes);
    }

    [Fact]
    public async Task ProcesarWithoutUsuarioInTheBodyIsAccepted()
    {
        using var factory = new RegulatorSuiApiFactory();
        using var client = SuiTestData.CreateClient(factory, sisuId: 303);

        var response = await client.PostAsJsonAsync("/api/v1/sui/Procesar", new { aps = Aps, anno = Anno, mes = Mes });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(303L, factory.Sui.LastProcesarUsuario);
    }

    [Fact]
    public async Task ProcesarWithoutTokenIsStillRejected()
    {
        using var factory = new RegulatorSuiApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/sui/Procesar", new { aps = Aps, anno = Anno, mes = Mes });

        // Legacy authJwt.verificarToken answers 403 "No token provided".
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Null(factory.Sui.LastProcesar);
    }

    [Fact]
    public async Task ComplementoTakesUsuarioFromTheTokenAndIgnoresTheBody()
    {
        using var factory = new RegulatorSuiApiFactory();
        using var client = SuiTestData.CreateClient(factory, sisuId: 101);

        var response = await client.PostAsJsonAsync("/api/v1/sui/setCargueInfComplemento",
            new { aps = Aps, anno = Anno, mes = Mes, usuario = 999, filas = new[] { SuiTestData.FilaCompleta() } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(101L, factory.Sui.LastComplementoUsuario);
    }

    [Fact]
    public async Task ComplementoWithoutUsuarioInTheBodyIsAccepted()
    {
        using var factory = new RegulatorSuiApiFactory();
        using var client = SuiTestData.CreateClient(factory, sisuId: 303);

        var response = await client.PostAsJsonAsync("/api/v1/sui/setCargueInfComplemento",
            new { aps = Aps, anno = Anno, mes = Mes, filas = new[] { SuiTestData.FilaCompleta() } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(303L, factory.Sui.LastComplementoUsuario);
    }

    // ---------- S5: F35/F36 fields are optional (legacy TO_NUMBER(:n) with null, controller.js:68-97) ----------

    [Fact]
    public async Task ComplementoAcceptsBlankF35F36FieldsAndForwardsNull()
    {
        using var factory = new RegulatorSuiApiFactory();
        using var client = SuiTestData.CreateClient(factory, sisuId: 101);

        var fila = new Dictionary<string, object?>
        {
            ["aps"] = Aps, ["det"] = 1.5m, ["f1et"] = null, ["cpeet"] = null, ["prtzet"] = null, ["ceg"] = null,
            ["camrers"] = null, ["inccdfalt9"] = null, ["prctcrrcp"] = null, ["v0"] = null, ["vm"] = null,
            ["mcrs"] = null, ["icrsm"] = null, ["iccrs"] = null, ["frein"] = null, ["capperdf"] = null,
            ["qrsMes"] = null, ["dispalt9"] = null, ["vlMes"] = null
        };

        var response = await client.PostAsJsonAsync("/api/v1/sui/setCargueInfComplemento",
            new { aps = Aps, anno = Anno, mes = Mes, filas = new[] { fila } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var recibida = Assert.Single(factory.Sui.LastComplemento!.Filas);
        Assert.Equal(1.5m, recibida.Det);
        Assert.All(SuiTestData.F35F36(recibida), Assert.Null);
    }

    [Fact]
    public async Task ComplementoWithMissingF35F36FieldsForwardsNullNotZero()
    {
        using var factory = new RegulatorSuiApiFactory();
        using var client = SuiTestData.CreateClient(factory, sisuId: 101);

        var response = await client.PostAsJsonAsync("/api/v1/sui/setCargueInfComplemento",
            new { aps = Aps, anno = Anno, mes = Mes, filas = new[] { new { aps = Aps, det = 2m } } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var recibida = Assert.Single(factory.Sui.LastComplemento!.Filas);
        Assert.All(SuiTestData.F35F36(recibida), Assert.Null);
    }

    [Fact]
    public async Task ComplementoKeepsTypedF35F36Values()
    {
        using var factory = new RegulatorSuiApiFactory();
        using var client = SuiTestData.CreateClient(factory, sisuId: 101);

        var response = await client.PostAsJsonAsync("/api/v1/sui/setCargueInfComplemento",
            new { aps = Aps, anno = Anno, mes = Mes, filas = new[] { SuiTestData.FilaCompleta() } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var recibida = Assert.Single(factory.Sui.LastComplemento!.Filas);
        Assert.Equal(Enumerable.Range(1, 13).Select(i => (decimal?)i), SuiTestData.F35F36(recibida));
        Assert.Equal(Anno, factory.Sui.LastComplemento!.Anno);
        Assert.Equal(Mes, factory.Sui.LastComplemento!.Mes);
    }

    [Fact]
    public async Task GuardarComplementoBindsNullForBlankFieldsAndTheTokenUser()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuiRepository(new RecordingConnectionFactory(connection), NullLogger<SuiRepository>.Instance);
        var request = new SuiComplementoRequest
        {
            Aps = Aps, Anno = Anno, Mes = Mes,
            Filas = [new SuiComplementoFilaRequest { Aps = Aps, Det = 4m }]
        };

        var response = await repository.GuardarComplementoAsync(request, 101, CancellationToken.None);

        Assert.True(response.Guardado);
        Assert.Equal(1, response.FilasAfectadas);
        var delete = Assert.Single(connection.Commands, c => c.CommandText.StartsWith("DELETE", StringComparison.Ordinal));
        Assert.Equal(Anno, delete.Value("anno"));
        Assert.Equal(Mes, delete.Value("mes"));
        var insert = Assert.Single(connection.Commands, c => c.CommandText.StartsWith("INSERT INTO TARIFICADOR.SUI_COMPLEMENTO", StringComparison.Ordinal));
        Assert.Equal(101L, insert.Value("usuario"));
        Assert.Equal(4m, insert.Value("det"));
        foreach (var nombre in new[] { "camrers", "inccdfalt9", "prctcrrcp", "v0", "vm", "mcrs", "icrsm", "iccrs", "frein", "capperdf", "qrsMes", "dispalt9", "vlMes" })
        {
            Assert.Equal(DBNull.Value, insert.Value(nombre));
        }
        Assert.True(connection.Committed);
    }

}

/// <summary>Shared test data and responders (file-local so helper names cannot collide with other test files).</summary>
file static class SuiTestData
{
    internal static IEnumerable<decimal?> F35F36(SuiComplementoFilaRequest f) =>
        [f.Camrers, f.Inccdfalt9, f.Prctcrrcp, f.V0, f.Vm, f.Mcrs, f.Icrsm, f.Iccrs, f.Frein, f.Capperdf, f.QrsMes, f.Dispalt9, f.VlMes];

    internal static object FilaCompleta() => new
    {
        aps = RegulatorSuiInformesContractTests.Aps, det = 0.5m, f1et = 0.5m, cpeet = 0.5m, prtzet = 0.5m, ceg = 0.5m,
        camrers = 1m, inccdfalt9 = 2m, prctcrrcp = 3m, v0 = 4m, vm = 5m, mcrs = 6m, icrsm = 7m, iccrs = 8m,
        frein = 9m, capperdf = 10m, qrsMes = 11m, dispalt9 = 12m, vlMes = 13m
    };

    internal static HttpClient CreateClient(RegulatorSuiApiFactory factory, long sisuId)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(sisuId));
        return client;
    }

    /// <summary>Answers the Oracle calls made by <see cref="SuiRepository.ProcesarAsync"/>.</summary>
    internal static Func<RecordedCommand, object?> SuiResponder(string fejecutaResult, string precheck = "1") => command =>
    {
        if (command.CommandText.Contains("fauco_generasui", StringComparison.OrdinalIgnoreCase))
        {
            command.Parameter("res").Value = precheck;
            return 1;
        }

        if (command.CommandText.Contains("fsui_fejecutasui", StringComparison.OrdinalIgnoreCase))
        {
            command.Parameter("res").Value = fejecutaResult;
            return 1;
        }

        if (command.CommandText.Contains("TABLE(PK_SUI.fsui_estado", StringComparison.OrdinalIgnoreCase))
        {
            var table = new DataTable();
            foreach (var col in new[] { "F19", "F23", "F24", "F35", "F36" }) table.Columns.Add(col, typeof(string));
            table.Rows.Add("PROCESADO", "PROCESADO", "PROCESADO", "NO APLICA", "NO APLICA");
            return table;
        }

        if (command.CommandText.Contains("AS FORMATO", StringComparison.OrdinalIgnoreCase))
        {
            var table = new DataTable();
            table.Columns.Add("FORMATO", typeof(string));
            table.Rows.Add("F19");
            table.Rows.Add("F24");
            return table;
        }

        return 1;
    };
}

file sealed class RegulatorSuiApiFactory : WebApplicationFactory<Program>
{
    internal StubSuiRepository Sui { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<ISuiRepository>();
            services.AddSingleton<ISuiRepository>(Sui);
        });
    }
}

file sealed class StubSuiRepository : ISuiRepository
{
    public SuiProcesarRequest? LastProcesar { get; private set; }
    public long? LastProcesarUsuario { get; private set; }
    public SuiComplementoRequest? LastComplemento { get; private set; }
    public long? LastComplementoUsuario { get; private set; }

    public Task<SuiDashboardResponse> DashboardAsync(int anno, int mes, long usuario, CancellationToken cancellationToken)
        => Task.FromResult(new SuiDashboardResponse([]));

    public Task<IReadOnlyList<dynamic>> ConsultarFormatoAsync(string formato, int aps, int mes, int anno, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<dynamic>>([]);

    public Task<IReadOnlyList<object>> ResumenFormatosAsync(string formato, int aps, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<object>>([]);

    public Task<SuiProcesarResponse> ProcesarAsync(SuiProcesarRequest request, long usuario, CancellationToken cancellationToken)
    {
        LastProcesar = request;
        LastProcesarUsuario = usuario;
        return Task.FromResult(new SuiProcesarResponse(true, ["F19"], "F19: PROCESADO", "OK"));
    }

    public Task<SuiComplementoResponse> GuardarComplementoAsync(SuiComplementoRequest request, long usuario, CancellationToken cancellationToken)
    {
        LastComplemento = request;
        LastComplementoUsuario = usuario;
        return Task.FromResult(new SuiComplementoResponse(true, request.Filas.Count));
    }

    public Task<SuiPrecheckResponse> GetCanCertificateAsync(int aps, int mes, int anno, CancellationToken cancellationToken)
        => Task.FromResult(new SuiPrecheckResponse(true, ["1"]));

    public Task<SuiExistenArchivosResponse> ExistenArchivosGeneradosAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => Task.FromResult(new SuiExistenArchivosResponse(false, 0));
}

file sealed class RecordingConnectionFactory(RecordingDbConnection connection) : IOracleConnectionFactory
{
    public IDbConnection CreateConnection() => connection;
}

/// <summary>A command as the repository sent it: SQL text plus the bound parameters.</summary>
file sealed class RecordedCommand(string commandText, IReadOnlyList<DbParameter> parameters)
{
    public string CommandText { get; } = commandText;
    public IReadOnlyList<DbParameter> Parameters { get; } = parameters;

    public DbParameter Parameter(string name)
        => Parameters.Single(p => string.Equals(p.ParameterName.TrimStart(':', '@'), name, StringComparison.Ordinal));

    public object? Value(string name) => Parameter(name).Value;
}

/// <summary>
/// In-memory ADO.NET connection that records every command Dapper executes and answers it through
/// <c>respond</c> (a <see cref="DataTable"/> for readers, an int for non-queries; output parameters are set in place).
/// </summary>
file sealed class RecordingDbConnection(Func<RecordedCommand, object?> respond) : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;

    public List<RecordedCommand> Commands { get; } = [];
    public bool Committed { get; set; }
    public bool RolledBack { get; set; }

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => "recording";
    public override string DataSource => "recording";
    public override string ServerVersion => "1";
    public override ConnectionState State => state;

    public override void ChangeDatabase(string databaseName) { }
    public override void Close() => state = ConnectionState.Closed;
    public override void Open() => state = ConnectionState.Open;

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) => new RecordingTransaction(this);
    protected override DbCommand CreateDbCommand() => new RecordingCommand(this);

    internal object? Execute(RecordingCommand command)
    {
        var recorded = new RecordedCommand(command.CommandText, command.RecordedParameters.ToList());
        Commands.Add(recorded);
        return respond(recorded);
    }

    private sealed class RecordingTransaction(RecordingDbConnection owner) : DbTransaction
    {
        private bool done;

        public override IsolationLevel IsolationLevel => IsolationLevel.ReadCommitted;
        protected override DbConnection? DbConnection => done ? null : owner;

        public override void Commit()
        {
            owner.Committed = true;
            done = true;
        }

        public override void Rollback()
        {
            owner.RolledBack = true;
            done = true;
        }
    }
}

file sealed class RecordingCommand(RecordingDbConnection owner) : DbCommand
{
    private readonly RecordingParameterCollection parameters = new();

    internal IEnumerable<DbParameter> RecordedParameters => parameters.Items;

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string CommandText { get; set; } = string.Empty;
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; } = CommandType.Text;
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get; set; }
    protected override DbParameterCollection DbParameterCollection => parameters;
    protected override DbTransaction? DbTransaction { get; set; }

    public override void Cancel() { }
    public override void Prepare() { }
    protected override DbParameter CreateDbParameter() => new RecordingParameter();

    public override int ExecuteNonQuery() => owner.Execute(this) is int rows ? rows : 0;

    public override object? ExecuteScalar()
    {
        var result = owner.Execute(this);
        return result is DataTable table ? table.Rows[0][0] : result;
    }

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
        => (owner.Execute(this) as DataTable ?? new DataTable()).CreateDataReader();
}

file sealed class RecordingParameter : DbParameter
{
    public override DbType DbType { get; set; } = DbType.Object;
    public override ParameterDirection Direction { get; set; } = ParameterDirection.Input;
    public override bool IsNullable { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ParameterName { get; set; } = string.Empty;
    public override int Size { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string SourceColumn { get; set; } = string.Empty;
    public override bool SourceColumnNullMapping { get; set; }
    public override object? Value { get; set; }

    public override void ResetDbType() => DbType = DbType.Object;
}

file sealed class RecordingParameterCollection : DbParameterCollection
{
    internal List<DbParameter> Items { get; } = [];

    public override int Count => Items.Count;
    public override object SyncRoot => Items;

    public override int Add(object value)
    {
        Items.Add((DbParameter)value);
        return Items.Count - 1;
    }

    public override void AddRange(Array values)
    {
        foreach (var value in values) Add(value);
    }

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
