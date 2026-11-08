using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Costos;

namespace Veolia.Api.Tests;

// Oracle failures in costos must reach the log with operation, parameters, user, endpoint and
// traceId, and reach the client with a readable message plus a support detail.
public sealed class CostosOracleErrorContextTests
{
    private const long TokenSisuId = 4242;

    [Fact]
    public async Task UniqueViolationReturnsReadableMessageAndSupportDetail()
    {
        using var factory = new CostosErrorApiFactory(Duplicate());
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/costos/calculartarifas", new { aps = 5, mes = 12, anno = 2025 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal(
            "Oracle rechazó datos duplicados (restricción VEOLIA.PK_AUCO_TARIFAS). La operación no se completó.",
            body.GetProperty("message").GetString());
        Assert.Equal("ORA-00001", body.GetProperty("oraCode").GetString());
        var detail = body.GetProperty("detail");
        Assert.Equal("PK_LIQUIDAR.fauco_calculartarifas", detail.GetProperty("operacion").GetString());
        Assert.Equal("VEOLIA.PK_AUCO_TARIFAS", detail.GetProperty("constraint").GetString());
        Assert.Equal("ORA-00001: unique constraint (VEOLIA.PK_AUCO_TARIFAS) violated", detail.GetProperty("oracleMessage").GetString());
    }

    [Fact]
    public async Task OracleFailureIsLoggedWithFullContext()
    {
        using var factory = new CostosErrorApiFactory(Duplicate());
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/costos/calculartarifas", new { aps = 5, mes = 12, anno = 2025 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var traceId = body.GetProperty("traceId").GetString();

        var entry = Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.IsType<OracleOperationException>(entry.Exception);
        Assert.Contains("PK_LIQUIDAR.fauco_calculartarifas", entry.Message);
        Assert.Contains("ORA-00001", entry.Message);
        Assert.Contains("constraint=VEOLIA.PK_AUCO_TARIFAS", entry.Message);
        Assert.Contains("aps=5 mes=12 anno=2025", entry.Message);
        Assert.Contains($"usuario={TokenSisuId}", entry.Message);
        Assert.Contains("endpoint=POST /api/v1/costos/calculartarifas", entry.Message);
        Assert.Contains($"traceId={traceId}", entry.Message);
    }

    [Fact]
    public async Task UnmappedOracleErrorDoesNotLeakRawMessageToTheToast()
    {
        var failure = new OracleOperationException(
            "PK_LIQUIDAR.fauco_calculartarifas",
            new Dictionary<string, object?> { ["aps"] = 5 },
            6502,
            "ORA-06502: PL/SQL: numeric or value error");
        using var factory = new CostosErrorApiFactory(failure);
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/costos/calculartarifas", new { aps = 5, mes = 12, anno = 2025 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("Oracle devolvió un error al procesar la solicitud.", body.GetProperty("message").GetString());
        Assert.Equal("ORA-06502", body.GetProperty("oraCode").GetString());
        Assert.Equal("ORA-06502: PL/SQL: numeric or value error", body.GetProperty("detail").GetProperty("oracleMessage").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("detail").GetProperty("constraint").ValueKind);
    }

    [Fact]
    public async Task SuccessfulResponseHasNoDetailField()
    {
        using var factory = new CostosErrorApiFactory(failure: null);
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/costos/calculartarifas", new { aps = 5, mes = 12, anno = 2025 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(body.TryGetProperty("detail", out _));
    }

    [Fact]
    public async Task CertificarConflictKeepsItsPreviousMessage()
    {
        using var factory = new CostosErrorApiFactory(new ConflictException("El período ya se encuentra certificado."));
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/costos/calculartarifas", new { aps = 5, mes = 12, anno = 2025 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("El período ya se encuentra certificado.", body.GetProperty("message").GetString());
        Assert.False(body.TryGetProperty("detail", out _));
    }

    [Theory]
    [InlineData(1, "ORA-00001: unique constraint (VEOLIA.PK_X) violated", "VEOLIA.PK_X")]
    [InlineData(2291, "ORA-02291: integrity constraint (VEOLIA.FK_Y) violated - parent key not found", "VEOLIA.FK_Y")]
    [InlineData(6502, "ORA-06502: PL/SQL: numeric or value error", null)]
    public void ConstraintIsParsedFromTheOracleMessage(int number, string message, string? constraint)
    {
        var ex = new OracleOperationException("OP", new Dictionary<string, object?>(), number, message);

        Assert.Equal(constraint, ex.Constraint);
        Assert.Equal($"ORA-{number:D5}", ex.OraCode);
    }

    private static OracleOperationException Duplicate() => new(
        "PK_LIQUIDAR.fauco_calculartarifas",
        new Dictionary<string, object?> { ["aps"] = 5, ["mes"] = 12, ["anno"] = 2025, ["usuario"] = (int)TokenSisuId },
        1,
        "ORA-00001: unique constraint (VEOLIA.PK_AUCO_TARIFAS) violated");

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TokenSisuId));
        return client;
    }
}

file sealed class CostosErrorApiFactory(Exception? failure) : WebApplicationFactory<Program>
{
    internal CapturingLoggerProvider Logs { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureLogging(logging => logging.AddProvider(Logs));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<ICostosRepository>();
            services.AddSingleton<ICostosRepository>(new FailingCostosRepository(failure));
        });
    }
}

file sealed class FailingCostosRepository(Exception? failure) : ICostosRepository
{
    public Task<CalculartarifasResponse> CalculartarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
        => failure is null ? Task.FromResult(new CalculartarifasResponse(true, "ok")) : Task.FromException<CalculartarifasResponse>(failure);

    public Task<ValidapreactualizaResponse> ValidapreactualizaAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
        => throw new NotImplementedException();

    public Task<RunPrechecksResponse> RunPrechecksAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
        => throw new NotImplementedException();

    public Task<CertificarTarifasResponse> CertificarTarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<CostoItemResponse>> ConsultarCostosAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<CostoClusItemResponse>> ConsultarCostosClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<ComportaClusItemResponse>> ConsultarComportaClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => throw new NotImplementedException();
}

file sealed class CapturingLoggerProvider : ILoggerProvider
{
    public ConcurrentQueue<(LogLevel Level, string Message, Exception? Exception)> Entries { get; } = new();

    public ILogger CreateLogger(string categoryName) => new CapturingLogger(Entries);

    public void Dispose()
    {
    }

    private sealed class CapturingLogger(ConcurrentQueue<(LogLevel, string, Exception?)> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => entries.Enqueue((logLevel, formatter(state, exception), exception));
    }
}
