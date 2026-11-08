using System.Collections.Concurrent;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.GoogleDrive;
using Veolia.Api.Modules.Auth.Asignaciones;
using Veolia.Api.Modules.Auth.Login;
using Veolia.Api.Modules.Reliquidaciones.Cargue;
using Veolia.Api.Modules.Reliquidaciones.Crear;
using Veolia.Api.Modules.Reliquidaciones.Tarificador;
using Veolia.Api.Modules.Sui853.Cdft;
using Veolia.Api.Modules.Sui853.Cft;
using Veolia.Api.Modules.Sui853.Comercial;
using Veolia.Api.Modules.Sui853.Configuracion;
using Veolia.Api.Modules.Sui853.General;
using Veolia.Api.Modules.Sui853.Operaciones;

namespace Veolia.Api.Tests;

// odd/tasks/oracle-error-context.md S6 (T4): the Reliquidaciones, Sui853 and Auth controllers no longer answer
// repository failures with their own 500 bodies; the global handler (S3-S5) logs once and answers the envelope.
// 4xx paths the controllers produce themselves, and module-specific answers, keep their status and message.
public sealed class GlobalErrorHandlingT4Tests
{
    private const long TokenSisuId = 4242;

    // SUI 853 loads and Residuos Generados only run for system 3; every other route accepts any system.
    private const int Sui853System = 3;

    public static TheoryData<string, string, string?> Routes() => new()
    {
        // Reliquidaciones
        { "POST", "/api/v1/reliqCargue/compararCostos", "{\"reliq\":1}" },
        { "POST", "/api/v1/reliqCargue/getReliInfoUsuarios", "{\"idReliq\":1}" },
        { "POST", "/api/v1/reliqCargue/updateResumenEmpresa", "{\"data\":[{\"inedId\":1,\"reliId\":1,\"cblj\":1}]}" },
        { "POST", "/api/v1/reliqCrear/crear", "{\"apsaId\":5,\"usuSolicita\":1,\"usuAprueba\":2,\"relqNombre\":\"R\",\"relqDesde\":\"202401\",\"relqHasta\":\"202402\"}" },
        { "POST", "/api/v1/reliqCrear/getReliquidaciones", "{}" },
        { "POST", "/api/v1/reliqCrear/delete", "{\"relqId\":3}" },
        { "POST", "/api/v1/reliqTarificador/resumenUsuarios", "{\"reliqId\":1}" },
        { "POST", "/api/v1/reliqTarificador/aprobarReliquidacion", "{\"reliqId\":1}" },
        // Sui853
        { "POST", "/api/v1/sui853/cdft/cdft", "{\"anno\":2025}" },
        { "POST", "/api/v1/sui853/cft/cft", null },
        { "POST", "/api/v1/sui853/comercial/residuosGeneradosInforme", "{\"apsId\":\"5\",\"year\":2025,\"month\":3}" },
        { "POST", "/api/v1/sui853/comercial/resumenResiduosGenerados", null },
        { "POST", "/api/v1/sui853Configuracion/tablasSui", null },
        { "POST", "/api/v1/sui853Configuracion/truncateTable", "{\"owner\":\"SUI\",\"tableName\":\"TABLE1\",\"confirm\":true}" },
        { "POST", "/api/v1/sui853Configuracion/getFormularios", null },
        { "POST", "/api/v1/sui853Configuracion/vcfgapsempresa", null },
        { "POST", "/api/v1/sui853Configuracion/cargueResiduos", "{\"apsId\":7,\"anno\":2024}" },
        { "POST", "/api/v1/sui853/general/fac", null },
        { "POST", "/api/v1/sui853/operaciones/residuosGenerados", "{\"apsId\":\"5\",\"year\":2025,\"month\":3}" },
        // Auth
        { "POST", "/api/v1/auth/getApsAsignadas", "{\"id\":101}" },
        { "POST", "/api/v1/auth/setApsxUsuario", "{\"id\":101,\"outAps\":[1],\"inAps\":[2]}" },
        { "GET", "/api/v1/auth/getSistemasByCorreo?correo=a@b.co", null },
        { "POST", "/api/v1/auth/login", "{\"correo\":\"a@b.co\",\"pass\":\"x\",\"idSistema\":10}" }
    };

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task NonOracleRepositoryFailureYieldsTheHandlerEnvelopeAndOneErrorLog(string method, string route, string? json)
    {
        using var factory = new T4ApiFactory(new Exception("boom"));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request(method, route, json));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Object, body.GetProperty("data").ValueKind);
        Assert.Equal("Ocurrió un error procesando la solicitud.", body.GetProperty("message").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("oraCode").ValueKind);
        var traceId = body.GetProperty("traceId").GetString();
        Assert.False(string.IsNullOrEmpty(traceId));
        Assert.DoesNotContain("boom", body.GetRawText());

        var path = route.Split('?')[0];
        var entry = Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.Contains($"endpoint={method} {path}", entry.Message);
        Assert.Contains($"traceId={traceId}", entry.Message);
        Assert.Contains($"usuario={TokenSisuId}", entry.Message);
    }

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task OracleRepositoryFailureYieldsTheSharedOracleMessage(string method, string route, string? json)
    {
        const string oracleMessage = "ORA-01400: cannot insert NULL into (\"VEOLIA\".\"T\".\"C\")";
        using var factory = new T4ApiFactory(new OracleOperationException("PK_X.f", new Dictionary<string, object?>(), 1400, oracleMessage));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request(method, route, json));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal("Faltan datos obligatorios para completar la operación en Oracle.", body.GetProperty("message").GetString());
        Assert.Equal("ORA-01400", body.GetProperty("oraCode").GetString());
        Assert.False(string.IsNullOrEmpty(body.GetProperty("traceId").GetString()));
        Assert.Equal("PK_X.f", body.GetProperty("detail").GetProperty("operacion").GetString());
        Assert.Equal("ORA-01400", body.GetProperty("detail").GetProperty("oraCode").GetString());
        Assert.Equal(oracleMessage, body.GetProperty("detail").GetProperty("oracleMessage").GetString());
        Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
    }

    [Fact]
    public async Task OracleTimeoutStillAnswers502()
    {
        using var factory = new T4ApiFactory(new OracleTimeoutException("Se perdió la conexión con Oracle."));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request("POST", "/api/v1/sui853/cdft/cdft", "{\"anno\":2025}"));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Equal("Se perdió la conexión con Oracle.", body.GetProperty("message").GetString());
        Assert.Equal("ORA-03135", body.GetProperty("oraCode").GetString());
    }

    public static TheoryData<string, string, string?, HttpStatusCode, string> ClientErrors() => new()
    {
        // Reliquidaciones: controller validation before the repository runs.
        { "POST", "/api/v1/reliqCargue/compararCostos", "{\"reliq\":0}", HttpStatusCode.UnprocessableEntity, "message=reliq es obligatorio." },
        { "POST", "/api/v1/reliqCrear/delete", "{\"relqId\":0}", HttpStatusCode.UnprocessableEntity, "message=relqId es obligatorio." },
        { "POST", "/api/v1/reliqTarificador/estadoReliquidacion", "{\"reliqId\":0}", HttpStatusCode.UnprocessableEntity, "message=reliqId es obligatorio." },
        // Sui853: ArgumentException → 400 INVALID_PARAMS; model validation → 400.
        { "POST", "/api/v1/sui853Configuracion/cargueResiduos", "{\"apsId\":0,\"anno\":2024}", HttpStatusCode.BadRequest, "data.message=Seleccione una APS." },
        { "POST", "/api/v1/sui853Configuracion/truncateTable", "{\"owner\":\"SUI\",\"tableName\":\"TABLE1\"}", HttpStatusCode.BadRequest, "data.message=Se requiere confirmación explícita para vaciar la tabla." },
        { "POST", "/api/v1/sui853/operaciones/residuosGenerados", "{\"apsId\":\"5\",\"year\":2025,\"month\":13}", HttpStatusCode.BadRequest, "" }
    };

    [Theory]
    [MemberData(nameof(ClientErrors))]
    public async Task ControllerValidationStillAnswersItsOwn4xx(string method, string route, string? json, HttpStatusCode status, string expected)
    {
        using var factory = new T4ApiFactory(new Exception("boom"));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request(method, route, json));
        var body = await Json(response);

        Assert.Equal(status, response.StatusCode);
        if (expected.Length > 0)
        {
            var (property, message) = (expected[..expected.IndexOf('=')], expected[(expected.IndexOf('=') + 1)..]);
            var element = property.Split('.').Aggregate(body, (current, name) => current.GetProperty(name));
            Assert.Equal(message, element.GetString());
        }

        Assert.DoesNotContain(factory.Logs.Entries, e => e.Level == LogLevel.Error);
    }

    // Module-specific answer kept by T4: the user sees why the extraction failed (ReliqCrearContractTests pins the body).
    [Fact]
    public async Task ReliqCrearFailedExtraccionKeepsItsMessageAndIsLoggedOnce()
    {
        using var factory = new T4ApiFactory(new ReliqExtraccionFallidaException("ERR"));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request("POST", "/api/v1/reliqCrear/crear",
            "{\"apsaId\":5,\"usuSolicita\":1,\"usuAprueba\":2,\"relqNombre\":\"R\",\"relqDesde\":\"202401\",\"relqHasta\":\"202402\"}"));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("La extracción de la reliquidación no se completó (resultado: 'ERR').", body.GetProperty("message").GetString());
        var traceId = body.GetProperty("traceId").GetString();
        var entry = Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.Contains("endpoint=POST /api/v1/reliqCrear/crear", entry.Message);
        Assert.Contains($"traceId={traceId}", entry.Message);
        Assert.Contains($"usuario={TokenSisuId}", entry.Message);
    }

    // Kept per-load business result: the failing row is reported, not the generic handler envelope.
    [Fact]
    public async Task DriveLoadHarvestFailureKeepsIts502Answer()
    {
        using var factory = new T4ApiFactory(new Exception("boom"), throwingHarvest: true);
        using var client = factory.AuthorizedClient();
        factory.Aps = new Sui853ApsInfo(7, "Salamina", ["Veolia"]);

        var response = await client.SendAsync(Request("POST", "/api/v1/sui853Configuracion/cargueResiduos", "{\"apsId\":7,\"anno\":2024}"));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Equal("HARVEST_ERROR", body.GetProperty("data").GetProperty("type").GetString());
        Assert.DoesNotContain("boom", body.GetRawText());
    }

    [Fact]
    public async Task LoginWithBadCredentialsStillAnswers401()
    {
        using var factory = new T4ApiFactory(failure: null);
        using var client = factory.CreateClient();

        var response = await client.SendAsync(Request("POST", "/api/v1/auth/login", "{\"correo\":\"a@b.co\",\"pass\":\"mala\",\"idSistema\":10}"));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(401, body.GetProperty("status").GetInt32());
        Assert.Equal("Correo o contraseña inválida", body.GetProperty("message").GetString());
        Assert.DoesNotContain(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.DoesNotContain(factory.Logs.Entries, e => e.Message.Contains("mala"));
    }

    // S3 on the real login route: the failing body is logged with pass/clave masked.
    [Fact]
    public async Task LoginFailureLogsTheBodyWithPassAndClaveMasked()
    {
        using var factory = new T4ApiFactory(new Exception("boom"));
        using var client = factory.CreateClient();

        var response = await client.SendAsync(Request("POST", "/api/v1/auth/login",
            "{\"correo\":\"a@b.co\",\"pass\":\"s3creto\",\"clave\":\"otra1\",\"idSistema\":10}"));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var entry = Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.Contains("usuario=-", entry.Message);
        Assert.Contains("endpoint=POST /api/v1/auth/login", entry.Message);
        Assert.Contains($"traceId={body.GetProperty("traceId").GetString()}", entry.Message);
        Assert.Contains("metodo=LoginController.Login", entry.Message);
        Assert.Contains("\"correo\":\"a@b.co\"", entry.Message);
        Assert.Contains("\"pass\":\"***\"", entry.Message);
        Assert.Contains("\"clave\":\"***\"", entry.Message);
        Assert.DoesNotContain("s3creto", entry.Message);
        Assert.DoesNotContain("otra1", entry.Message);
    }

    private static HttpRequestMessage Request(string method, string route, string? json)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), route);
        if (json is not null)
        {
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        return request;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

    private sealed class T4ApiFactory(Exception? failure, bool throwingHarvest = false) : WebApplicationFactory<Program>
    {
        internal T4CapturingLoggerProvider Logs { get; } = new();

        // FindApsAsync answer for the Drive-load harvest test; every other repository member fails.
        internal Sui853ApsInfo? Aps { get; set; }

        internal HttpClient AuthorizedClient()
        {
            var client = CreateClient();
            client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TokenSisuId, Sui853System));
            return client;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
            builder.ConfigureLogging(logging => logging.AddProvider(Logs));
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IOracleConnectionFactory>();
                services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
                Failing<IReliqCargueRepository>(services);
                Failing<IReliqCrearRepository>(services);
                Failing<IReliqTarificadorRepository>(services);
                Failing<ICdftRepository>(services);
                Failing<ISui853CftRepository>(services);
                Failing<IComercialRepository>(services);
                Failing<ICargaGenericaRepository>(services);
                Failing<IFormulariosRepository>(services);
                Failing<ISui853ReadmodelsRepository>(services);
                Failing<IFacRepository>(services);
                Failing<IResiduosGeneradosRepository>(services);
                Failing<IAsignacionesRepository>(services);
                Failing<ILoginRepository>(services);
                services.RemoveAll<ISui853DriveLoadsRepository>();
                services.AddSingleton(sp => DriveLoadsProxy.Create(this, failure));
                if (throwingHarvest)
                {
                    services.RemoveAll<IGoogleDriveHarvestService>();
                    services.AddSingleton(FailingProxy.Create<IGoogleDriveHarvestService>(failure));
                }

                services.RemoveAll<IUserAdminAuthorization>();
                services.AddSingleton<IUserAdminAuthorization, AllowAll>();
            });
        }

        private void Failing<T>(IServiceCollection services) where T : class
        {
            services.RemoveAll<T>();
            services.AddSingleton(FailingProxy.Create<T>(failure));
        }
    }

    private sealed class AllowAll : IUserAdminAuthorization
    {
        public Task<IActionResult?> RequireAdminAsync(HttpRequest request, CancellationToken cancellationToken) => Task.FromResult<IActionResult?>(null);

        public Task<IActionResult?> RequireSelfOrAdminAsync(HttpRequest request, long targetSisuId, CancellationToken cancellationToken)
            => Task.FromResult<IActionResult?>(null);

        public Task<bool> IsAdminAsync(long sisuId, CancellationToken cancellationToken) => Task.FromResult(true);
    }

    // Every member fails with the configured exception (faulted Task for async members); with no exception every
    // async member completes with its default value (null login result → bad credentials).
    public class FailingProxy : DispatchProxy
    {
        private static readonly MethodInfo FromException = typeof(Task)
            .GetMethods()
            .Single(m => m.Name == nameof(Task.FromException) && m.IsGenericMethodDefinition);

        private static readonly MethodInfo FromResult = typeof(Task).GetMethod(nameof(Task.FromResult))!;

        private Exception? failure;

        internal static T Create<T>(Exception? failure) where T : class
        {
            var proxy = Create<T, FailingProxy>();
            ((FailingProxy)(object)proxy).failure = failure;
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) => Answer(targetMethod!, failure);

        internal static object? Answer(MethodInfo method, Exception? failure)
        {
            var returnType = method.ReturnType;
            if (returnType == typeof(Task))
            {
                return failure is null ? Task.CompletedTask : Task.FromException(failure);
            }

            if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
            {
                var result = returnType.GetGenericArguments()[0];
                return failure is null
                    ? FromResult.MakeGenericMethod(result).Invoke(null, [result.IsValueType ? Activator.CreateInstance(result) : null])
                    : FromException.MakeGenericMethod(result).Invoke(null, [failure]);
            }

            if (failure is not null)
            {
                throw failure;
            }

            return returnType.IsValueType && returnType != typeof(void) ? Activator.CreateInstance(returnType) : null;
        }
    }

    public class DriveLoadsProxy : DispatchProxy
    {
        private T4ApiFactory owner = null!;
        private Exception? failure;

        internal static ISui853DriveLoadsRepository Create(object owner, Exception? failure)
        {
            var proxy = Create<ISui853DriveLoadsRepository, DriveLoadsProxy>();
            ((DriveLoadsProxy)(object)proxy).owner = (T4ApiFactory)owner;
            ((DriveLoadsProxy)(object)proxy).failure = failure;
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
            => targetMethod!.Name == nameof(ISui853DriveLoadsRepository.FindApsAsync) && owner.Aps is { } aps
                ? Task.FromResult<Sui853ApsInfo?>(aps)
                : FailingProxy.Answer(targetMethod, failure);
    }

    private sealed class T4CapturingLoggerProvider : ILoggerProvider
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
}
