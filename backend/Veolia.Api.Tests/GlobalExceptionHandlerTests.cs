using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Auth;
using Veolia.Api.Modules.Auth.Login;
using Veolia.Api.Modules.Regulator.Costos;
using Veolia.Api.Modules.Regulator.Health;

namespace Veolia.Api.Tests;

// Any exception a controller does not turn into a 4xx reaches one global handler that logs it
// once with context and answers with the envelope { status, data, message, traceId, oraCode, detail }.
public sealed class GlobalExceptionHandlerTests
{
    private const long TokenSisuId = 4242;
    private const string CostosRoute = "/api/v1/costos/calculartarifas";
    private const string AnonymousRoute = "/api/v1/auth/validate-credentials";

    public static TheoryData<string, HttpStatusCode, string> StatusCases() => new()
    {
        { "timeout", HttpStatusCode.BadGateway, "Se perdió la conexión con Oracle." },
        { "conflict", HttpStatusCode.Conflict, "Ya existe." },
        { "notfound", HttpStatusCode.NotFound, "No existe." },
        { "precondition", HttpStatusCode.PreconditionFailed, "Período cerrado." },
        { "validation", HttpStatusCode.BadRequest, "Dato inválido." },
        { "plain", HttpStatusCode.InternalServerError, "Ocurrió un error procesando la solicitud." },
        { "oracle", HttpStatusCode.InternalServerError, "Oracle devolvió un error al procesar la solicitud." }
    };

    [Theory]
    [MemberData(nameof(StatusCases))]
    public async Task UncaughtExceptionsMapToTheExistingStatusContract(string kind, HttpStatusCode status, string message)
    {
        using var factory = new ErrorApiFactory(login: Failure(kind));
        using var client = factory.CreateClient();

        var response = await client.PostAsync(AnonymousRoute, Json("{\"correo\":\"a@b.co\",\"pass\":\"x\"}"));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(status, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Object, body.GetProperty("data").ValueKind);
        Assert.Equal(message, body.GetProperty("message").GetString());
        Assert.False(string.IsNullOrEmpty(body.GetProperty("traceId").GetString()));
    }

    [Fact]
    public async Task NonOracleErrorHasNoOraCodeAndNoDetail()
    {
        using var factory = new ErrorApiFactory(costos: new InvalidCastException("boom"));
        using var client = CostosClient(factory);

        var response = await client.PostAsync(CostosRoute, Json("{\"aps\":5,\"mes\":12,\"anno\":2025}"));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("Ocurrió un error procesando la solicitud.", body.GetProperty("message").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("oraCode").ValueKind);
        Assert.False(body.TryGetProperty("detail", out _));
    }

    [Fact]
    public async Task CostosTimeoutKeepsItsMessageAndOraCode()
    {
        using var factory = new ErrorApiFactory(costos: new OracleTimeoutException("Se perdió la conexión con Oracle durante el cálculo de tarifas."));
        using var client = CostosClient(factory);

        var response = await client.PostAsync(CostosRoute, Json("{\"aps\":5,\"mes\":12,\"anno\":2025}"));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Equal("Se perdió la conexión con Oracle durante el cálculo de tarifas.", body.GetProperty("message").GetString());
        Assert.Equal("ORA-03135", body.GetProperty("oraCode").GetString());
    }

    [Theory]
    [InlineData(1400, "ORA-01400: cannot insert NULL into (\"VEOLIA\".\"T\".\"C\")", "Faltan datos obligatorios para completar la operación en Oracle.")]
    [InlineData(2291, "ORA-02291: integrity constraint (VEOLIA.FK_Y) violated - parent key not found", "No existe información relacionada para la operación solicitada.")]
    [InlineData(1, "ORA-00001: unique constraint (VEOLIA.PK_X) violated", "Oracle rechazó datos duplicados (restricción VEOLIA.PK_X). La operación no se completó.")]
    [InlineData(20001, "ORA-20001: El período 12/2025 ya está certificado.\nORA-06512: at \"VEOLIA.PK_LIQUIDAR\", line 120\nORA-06512: at line 1", "El período 12/2025 ya está certificado.")]
    [InlineData(20999, "ORA-20999: No hay tarifas para el APS 5.", "No hay tarifas para el APS 5.")]
    [InlineData(904, "ORA-00904: \"X\": invalid identifier", "Oracle devolvió un error al procesar la solicitud.")]
    public async Task OracleErrorsUseTheSharedMessageTable(int number, string oracleMessage, string expected)
    {
        var failure = new OracleOperationException("PK_LIQUIDAR.fauco_calculartarifas", new Dictionary<string, object?> { ["aps"] = 5 }, number, oracleMessage);
        using var factory = new ErrorApiFactory(costos: failure);
        using var client = CostosClient(factory);

        var response = await client.PostAsync(CostosRoute, Json("{\"aps\":5,\"mes\":12,\"anno\":2025}"));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(expected, body.GetProperty("message").GetString());
        Assert.Equal($"ORA-{number:D5}", body.GetProperty("oraCode").GetString());
        Assert.Equal(oracleMessage, body.GetProperty("detail").GetProperty("oracleMessage").GetString());
    }

    [Fact]
    public async Task OracleFailureLogLinesCarryRedactedBodyAndThrowingMethod()
    {
        using var factory = new ErrorApiFactory(costos: new OracleOperationException(
            "PK_LIQUIDAR.fauco_calculartarifas",
            new Dictionary<string, object?> { ["aps"] = 5, ["mes"] = 12 },
            1,
            "ORA-00001: unique constraint (VEOLIA.PK_AUCO_TARIFAS) violated"));
        using var client = CostosClient(factory);

        var response = await client.PostAsync(CostosRoute, Json("{\"aps\":5,\"mes\":12,\"anno\":2025,\"password\":\"hunter2\",\"miToken\":\"abc\"}"));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        var entry = Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.IsType<OracleOperationException>(entry.Exception);
        Assert.Contains("PK_LIQUIDAR.fauco_calculartarifas", entry.Message);
        Assert.Contains("ORA-00001", entry.Message);
        Assert.Contains("constraint=VEOLIA.PK_AUCO_TARIFAS", entry.Message);
        Assert.Contains("aps=5 mes=12", entry.Message);
        Assert.Contains($"usuario={TokenSisuId}", entry.Message);
        Assert.Contains($"endpoint=POST {CostosRoute}", entry.Message);
        Assert.Contains($"traceId={body.GetProperty("traceId").GetString()}", entry.Message);
        Assert.Contains("metodo=CostosController.Calculartarifas", entry.Message);
        Assert.Contains("\"aps\":5", entry.Message);
        Assert.Contains("\"password\":\"***\"", entry.Message);
        Assert.Contains("\"miToken\":\"***\"", entry.Message);
        Assert.DoesNotContain("hunter2", entry.Message);
        Assert.DoesNotContain("\"abc\"", entry.Message);
    }

    [Fact]
    public async Task AnonymousRouteLogsDashUserAndMasksPass()
    {
        using var factory = new ErrorApiFactory(login: new InvalidCastException("boom"));
        using var client = factory.CreateClient();

        var response = await client.PostAsync(AnonymousRoute, Json("{\"correo\":\"a@b.co\",\"pass\":\"s3creto\",\"Clave\":{\"nueva\":\"z9\"}}"));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        var entry = Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.IsType<InvalidCastException>(entry.Exception);
        Assert.Contains("usuario=-", entry.Message);
        Assert.Contains($"endpoint=POST {AnonymousRoute}", entry.Message);
        Assert.Contains($"traceId={body.GetProperty("traceId").GetString()}", entry.Message);
        Assert.Contains("metodo=LoginController.ValidateCredentials", entry.Message);
        Assert.Contains("\"correo\":\"a@b.co\"", entry.Message);
        Assert.Contains("\"pass\":\"***\"", entry.Message);
        Assert.Contains("\"Clave\":\"***\"", entry.Message);
        Assert.DoesNotContain("s3creto", entry.Message);
        Assert.DoesNotContain("z9", entry.Message);
    }

    [Fact]
    public async Task NonJsonBodyIsNotLogged()
    {
        using var factory = new ErrorApiFactory(health: new InvalidCastException("boom"));
        using var client = factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health/db")
        {
            Content = new StringContent("password=plain-secret", Encoding.UTF8, "text/plain")
        };
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var entry = Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.Contains("body=[cuerpo no JSON omitido]", entry.Message);
        Assert.DoesNotContain("plain-secret", entry.Message);
        Assert.Contains("usuario=-", entry.Message);
        Assert.Contains("endpoint=GET /api/health/db", entry.Message);
    }

    [Fact]
    public async Task OversizedJsonBodyIsNotLogged()
    {
        using var factory = new ErrorApiFactory(costos: new InvalidCastException("boom"));
        using var client = CostosClient(factory);

        var filler = new string('x', 9000);
        var response = await client.PostAsync(CostosRoute, Json($"{{\"aps\":5,\"mes\":12,\"anno\":2025,\"nota\":\"{filler}\"}}"));

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var entry = Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.Contains("body=[cuerpo JSON mayor a 8 KB omitido]", entry.Message);
        Assert.DoesNotContain(filler, entry.Message);
    }

    [Fact]
    public async Task ErrorResponseKeepsCorsHeadersForTheFrontend()
    {
        using var factory = new ErrorApiFactory(health: new InvalidCastException("boom"));
        using var client = factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health/db");
        request.Headers.Add("Origin", "http://localhost:4200");
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("http://localhost:4200", Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Ocurrió un error procesando la solicitud.", body.GetProperty("message").GetString());
    }

    private static Exception Failure(string kind) => kind switch
    {
        "timeout" => new OracleTimeoutException("Se perdió la conexión con Oracle."),
        "conflict" => new ConflictException("Ya existe."),
        "notfound" => new NotFoundException("No existe."),
        "precondition" => new PreconditionFailedException("Período cerrado."),
        "validation" => new ValidationException("Dato inválido."),
        "oracle" => new OracleOperationException("PK_X.f", new Dictionary<string, object?>(), 6502, "ORA-06502: PL/SQL: numeric or value error"),
        _ => new InvalidCastException("boom")
    };

    private static StringContent Json(string json) => new(json, Encoding.UTF8, "application/json");

    private static HttpClient CostosClient(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TokenSisuId));
        return client;
    }
}

file sealed class ErrorApiFactory(Exception? costos = null, Exception? login = null, Exception? health = null) : WebApplicationFactory<Program>
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
            services.AddSingleton<ICostosRepository>(new ThrowingCostosRepository(costos ?? new InvalidCastException("unused")));
            services.RemoveAll<ILoginRepository>();
            services.AddSingleton<ILoginRepository>(new ThrowingLoginRepository(login ?? new InvalidCastException("unused")));
            services.RemoveAll<IHealthRepository>();
            services.AddSingleton<IHealthRepository>(new ThrowingHealthRepository(health ?? new InvalidCastException("unused")));
        });
    }
}

file sealed class ThrowingCostosRepository(Exception failure) : ICostosRepository
{
    public Task<CalculartarifasResponse> CalculartarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
        => Task.FromException<CalculartarifasResponse>(failure);

    public Task<ValidapreactualizaResponse> ValidapreactualizaAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
        => throw failure;

    public Task<RunPrechecksResponse> RunPrechecksAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
        => throw failure;

    public Task<CertificarTarifasResponse> CertificarTarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
        => throw failure;

    public Task<IReadOnlyList<CostoItemResponse>> ConsultarCostosAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => throw failure;

    public Task<IReadOnlyList<CostoClusItemResponse>> ConsultarCostosClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => throw failure;

    public Task<IReadOnlyList<ComportaClusItemResponse>> ConsultarComportaClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => throw failure;
}

file sealed class ThrowingLoginRepository(Exception failure) : ILoginRepository
{
    public Task<IReadOnlyList<object>?> ValidateCredentialsAsync(string correo, string pass, CancellationToken cancellationToken)
        => throw failure;

    public Task<IReadOnlyList<object>> GetSistemasByCorreoAsync(string correo, CancellationToken cancellationToken) => throw failure;

    public Task<object?> LoginAsync(string correo, string pass, int idSistema, CancellationToken cancellationToken) => throw failure;

    public Task<SwitchSistemaRepositoryResult> SwitchSistemaAsync(long sisuId, int idSistema, CancellationToken cancellationToken) => throw failure;

    public Task<object?> LogoutAsync(long sisuId, string token, CancellationToken cancellationToken) => throw failure;

    public Task<IReadOnlyList<object>> AllSistemasAsync(CancellationToken cancellationToken) => throw failure;
}

file sealed class ThrowingHealthRepository(Exception failure) : IHealthRepository
{
    public Task<DatabaseHealthResult> CheckDatabaseAsync(CancellationToken cancellationToken) => throw failure;
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
