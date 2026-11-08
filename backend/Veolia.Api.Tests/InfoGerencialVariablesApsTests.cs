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
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.InfoGerencial;

namespace Veolia.Api.Tests;

// odd/tasks/verificacion-promedio-semestre.md S1-S2: infogerencial/getvariablesaps runs
// pk_ocigral720.fauco_getvariablesaps(:aps, :anno, :mes) and returns its "variables" object as numbers.
public sealed class InfoGerencialVariablesApsTests
{
    private const string Route = "/api/v1/infogerencial/getvariablesaps";

    // S2: CLOB observed against real Oracle for (1011, 2026, 8).
    private const string SampleClob =
        "{\"aps\":1011,\"anno\":2026,\"mes\":8,\"variables\":{\"c\":0,\"cdf\":62578.22,\"crt\":285055.5,\"lbl\":164265.7867," +
        "\"n\":365504.5,\"na\":1518,\"naa\":0,\"nd\":2404.83,\"qa\":1142.36,\"qbl\":1447.37,\"qlu\":377.5633,\"qna\":15082.1667," +
        "\"qr\":46.2917,\"qrs\":0,\"qrsmunrecp\":0,\"qrt\":39125.6383,\"tafna\":3364.6055,\"vl\":0}}";

    private static readonly string[] VariableKeys =
        ["c", "cdf", "crt", "lbl", "n", "na", "naa", "nd", "qa", "qbl", "qlu", "qna", "qr", "qrs", "qrsmunrecp", "qrt", "tafna", "vl"];

    [Fact]
    public async Task ReturnsTheParsedVariablesWithTheExactKeysAsNumbers()
    {
        var stub = new StubVariablesApsRepository(InfoGerencialVariablesApsRepository.Parse(1011, 2026, 8, SampleClob));
        using var factory = new VariablesApsApiFactory(stub);
        using var client = factory.AuthorizedClient();

        var response = await client.PostAsJsonAsync(Route, new { aps = 1011, anno = 2026, mes = 8 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal([(1011, 2026, 8)], stub.Calls);

        var data = body.GetProperty("data");
        Assert.Equal(1011, data.GetProperty("aps").GetInt32());
        Assert.Equal(2026, data.GetProperty("anno").GetInt32());
        Assert.Equal(8, data.GetProperty("mes").GetInt32());
        var variables = data.GetProperty("variables");
        Assert.Equal(VariableKeys, variables.EnumerateObject().Select(p => p.Name).ToArray());
        Assert.All(variables.EnumerateObject(), p => Assert.Equal(JsonValueKind.Number, p.Value.ValueKind));
        Assert.Equal(164265.7867m, variables.GetProperty("lbl").GetDecimal());
        Assert.Equal(1518m, variables.GetProperty("na").GetDecimal());
        Assert.Equal(39125.6383m, variables.GetProperty("qrt").GetDecimal());
        Assert.Equal(0m, variables.GetProperty("qrsmunrecp").GetDecimal());
    }

    [Fact]
    public async Task NullClobReturnsEveryVariableAsNull()
    {
        var stub = new StubVariablesApsRepository(InfoGerencialVariablesApsRepository.Parse(5, 2026, 1, null));
        using var factory = new VariablesApsApiFactory(stub);
        using var client = factory.AuthorizedClient();

        var response = await client.PostAsJsonAsync(Route, new { aps = 5, anno = 2026, mes = 1 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var variables = body.GetProperty("data").GetProperty("variables");
        Assert.Equal(VariableKeys, variables.EnumerateObject().Select(p => p.Name).ToArray());
        Assert.All(variables.EnumerateObject(), p => Assert.Equal(JsonValueKind.Null, p.Value.ValueKind));
    }

    [Fact]
    // Like every sibling route, AuthJwtParityMiddleware rejects a missing token with 403 before the controller.
    public async Task WithoutTokenAnswersForbiddenAndDoesNotQuery()
    {
        var stub = new StubVariablesApsRepository(InfoGerencialVariablesApsRepository.Parse(5, 2026, 1, null));
        using var factory = new VariablesApsApiFactory(stub);
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(Route, new { aps = 5, anno = 2026, mes = 1 });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(stub.Calls);
    }

    [Theory]
    [InlineData(0, 2026, 8)]
    [InlineData(1011, 0, 8)]
    [InlineData(1011, 2026, 0)]
    [InlineData(1011, 2026, 13)]
    public async Task InvalidParametersAnswerTheSiblingBadRequestAndDoNotQuery(int aps, int anno, int mes)
    {
        var stub = new StubVariablesApsRepository(InfoGerencialVariablesApsRepository.Parse(5, 2026, 1, null));
        using var factory = new VariablesApsApiFactory(stub);
        using var client = factory.AuthorizedClient();

        var response = await client.PostAsJsonAsync(Route, new { aps, anno, mes });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal("aps, anno y mes son obligatorios. mes debe estar entre 1 y 12.", body.GetProperty("message").GetString());
        Assert.Empty(stub.Calls);
    }

    [Fact]
    public void ParseMapsMissingKeysAndNonNumericValuesToNull()
    {
        var result = InfoGerencialVariablesApsRepository.Parse(1, 2026, 3, "{\"variables\":{\"qrt\":12.5,\"n\":null,\"vl\":\"x\"}}");

        Assert.Equal(12.5m, result.Variables.Qrt);
        Assert.Null(result.Variables.N);
        Assert.Null(result.Variables.Vl);
        Assert.Null(result.Variables.Lbl);
        Assert.Equal((1, 2026, 3), (result.Aps, result.Anno, result.Mes));
    }

    [Fact]
    public void ParseWithoutVariablesObjectReturnsNulls()
    {
        var result = InfoGerencialVariablesApsRepository.Parse(1, 2026, 3, "{\"aps\":1}");

        Assert.Null(result.Variables.Qrt);
        Assert.Null(result.Variables.C);
    }

    [Fact]
    public async Task RepositoryOpensTheConnectionAndBindsAps_Anno_MesByName()
    {
        var database = new VariablesRecordingConnectionFactory(SampleClob);
        var repository = new InfoGerencialVariablesApsRepository(database);

        var result = await repository.GetVariablesApsAsync(1011, 2026, 8, CancellationToken.None);

        Assert.Equal(["Open", "Execute"], database.Events);
        var command = Assert.Single(database.Commands);
        Assert.Equal("SELECT pk_ocigral720.fauco_getvariablesaps(:aps, :anno, :mes) FROM dual", command.Sql);
        Assert.Equal(1011, Convert.ToInt32(command.Parameters["aps"]));
        Assert.Equal(2026, Convert.ToInt32(command.Parameters["anno"]));
        Assert.Equal(8, Convert.ToInt32(command.Parameters["mes"]));
        Assert.Equal(3364.6055m, result.Variables.Tafna);
        Assert.Equal(62578.22m, result.Variables.Cdf);
    }

    [Fact]
    public async Task RepositoryTreatsDbNullAsAllNullVariables()
    {
        var database = new VariablesRecordingConnectionFactory(DBNull.Value);
        var repository = new InfoGerencialVariablesApsRepository(database);

        var result = await repository.GetVariablesApsAsync(5, 2026, 1, CancellationToken.None);

        Assert.Null(result.Variables.Qrt);
        Assert.Equal(5, result.Aps);
    }

    private sealed class StubVariablesApsRepository(InfoGerencialVariablesApsDto result) : IInfoGerencialVariablesApsRepository
    {
        internal List<(int Aps, int Anno, int Mes)> Calls { get; } = [];

        public Task<InfoGerencialVariablesApsDto> GetVariablesApsAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        {
            Calls.Add((aps, anno, mes));
            return Task.FromResult(result);
        }
    }

    private sealed class VariablesApsApiFactory(IInfoGerencialVariablesApsRepository repository) : WebApplicationFactory<Program>
    {
        internal HttpClient AuthorizedClient()
        {
            var client = CreateClient();
            client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(4242));
            return client;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IOracleConnectionFactory>();
                services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
                services.RemoveAll<IInfoGerencialVariablesApsRepository>();
                services.AddSingleton(repository);
            });
        }
    }
}

file sealed record VariablesRecordedCommand(string Sql, IReadOnlyDictionary<string, object?> Parameters);

/// <summary>Records the opened connection and the executed command; ExecuteScalar returns the given scalar.</summary>
file sealed class VariablesRecordingConnectionFactory(object? scalar) : IOracleConnectionFactory
{
    internal List<string> Events { get; } = [];
    internal List<VariablesRecordedCommand> Commands { get; } = [];
    internal object? Scalar => scalar;

    public IDbConnection CreateConnection() => new VariablesRecordingDbConnection(this);
}

file sealed class VariablesRecordingDbConnection(VariablesRecordingConnectionFactory owner) : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;

    internal VariablesRecordingConnectionFactory Owner => owner;

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
        state = ConnectionState.Open;
    }

    public override Task OpenAsync(CancellationToken cancellationToken)
    {
        Open();
        return Task.CompletedTask;
    }

    public override void Close() => state = ConnectionState.Closed;

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) => throw new NotSupportedException();

    protected override DbCommand CreateDbCommand() => new VariablesRecordingCommand(this);
}

file sealed class VariablesRecordingCommand(VariablesRecordingDbConnection connection) : DbCommand
{
    private readonly VariablesRecordingParameterCollection parameters = new();

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
    protected override DbParameter CreateDbParameter() => new VariablesRecordingParameter();

    public override int ExecuteNonQuery() => throw new NotSupportedException();

    public override object? ExecuteScalar()
    {
        if (connection.State != ConnectionState.Open)
            throw new InvalidOperationException("Connection must be open for this operation");
        connection.Owner.Events.Add("Execute");
        connection.Owner.Commands.Add(new VariablesRecordedCommand(
            CommandText.Trim(),
            parameters.Items.ToDictionary(p => p.ParameterName, p => p.Value is DBNull ? null : p.Value)));
        return connection.Owner.Scalar;
    }

    public override Task<object?> ExecuteScalarAsync(CancellationToken cancellationToken) => Task.FromResult(ExecuteScalar());

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior) => throw new NotSupportedException();
}

file sealed class VariablesRecordingParameter : DbParameter
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

file sealed class VariablesRecordingParameterCollection : DbParameterCollection
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
