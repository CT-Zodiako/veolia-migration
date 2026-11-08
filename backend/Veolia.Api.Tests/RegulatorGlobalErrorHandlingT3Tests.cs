using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Informes;
using Veolia.Api.Modules.Regulator.Killometros;
using Veolia.Api.Modules.Regulator.Pgirs;
using Veolia.Api.Modules.Regulator.Productividad;
using Veolia.Api.Modules.Regulator.Proyecciones;
using Veolia.Api.Modules.Regulator.Rellenos;
using Veolia.Api.Modules.Regulator.Reversiones;
using Veolia.Api.Modules.Regulator.SubCont;
using Veolia.Api.Modules.Regulator.Sui;
using Veolia.Api.Modules.Regulator.SuiReversiones;
using Veolia.Api.Modules.Regulator.Suministros;
using Veolia.Api.Modules.Regulator.Tafna;
using Veolia.Api.Modules.Regulator.Tarifas;
using Veolia.Api.Modules.Regulator.Toneladas;
using Veolia.Api.Modules.Regulator.Trna;
using Veolia.Api.Modules.Regulator.UsuariosGrafico;
using Veolia.Api.Modules.Regulator.Validaciones;

namespace Veolia.Api.Tests;

// odd/tasks/oracle-error-context.md S6 (T3): the Regulator controllers Informes..Validaciones no longer answer
// repository failures with their own 500 bodies; the global handler (S3-S5) logs once and answers the envelope.
// 4xx paths the controllers produce themselves keep their status and message.
public sealed class RegulatorGlobalErrorHandlingT3Tests
{
    private const long TokenSisuId = 4242;

    private const string Periodo = "{\"aps\":5,\"anno\":2025,\"mes\":3}";

    public static TheoryData<string, string, string?> Routes() => new()
    {
        { "GET", "/api/v1/informes/costos?aps=5&anno=2025&mes=3", null },
        { "GET", "/api/v1/informes/clus?aps=5&anno=2025&mes=3", null },
        { "POST", "/api/v1/kilometros/lbl", Periodo },
        { "POST", "/api/v1/pgirs/resumen", "{\"apsId\":5}" },
        { "POST", "/api/v1/pgirs/variables", "{\"apsId\":5,\"anno\":2025,\"mes\":3}" },
        { "POST", "/api/v1/productividad/consulta", Periodo },
        { "PUT", "/api/v1/productividad/editar", "{\"aps\":5,\"anno\":2025,\"mes\":3,\"valor\":1.5}" },
        { "POST", "/api/v1/proyecciones/consulta", "{\"apsaId\":5}" },
        { "POST", "/api/v1/proyecciones/consultageneral", null },
        { "POST", "/api/v1/proyecciones/cargardesdedrive", "{\"apsaId\":5}" },
        { "POST", "/api/v1/proyecciones/ejecutarproyectar", "{\"proyId\":9,\"apsaId\":5}" },
        { "GET", "/api/v1/rellenos", null },
        { "DELETE", "/api/v1/rellenos/eliminar/7", null },
        { "GET", "/api/v1/reversiones/detalladoAutorizacion", null },
        { "GET", "/api/v1/subcon", null },
        { "POST", "/api/v1/subcon/consulta", Periodo },
        { "POST", "/api/v1/sui/dashboard", "{\"anno\":2025,\"mes\":3}" },
        { "POST", "/api/v1/sui/consuformu19", Periodo },
        { "POST", "/api/v1/sui/resumenF35", "{\"aps\":5}" },
        { "POST", "/api/v1/sui/reversionesF19", "{\"aps\":5}" },
        { "GET", "/api/v1/suministros/getReversion", null },
        { "POST", "/api/v1/suministros/getPoda", Periodo },
        { "POST", "/api/v1/suministros/cargueProductividad", "{\"anno\":2025,\"mes\":3}" },
        { "POST", "/api/v1/suministros/existeRelleno", "{\"aps\":5,\"anno\":2025,\"semestre\":1}" },
        { "POST", "/api/v1/tafna/tafna", Periodo },
        { "POST", "/api/v1/tarifas", Periodo },
        { "POST", "/api/v1/tarifas/tarxcomgeneral", "{\"anno\":2025,\"mes\":3}" },
        { "POST", "/api/v1/toneladas/qrt", Periodo },
        { "POST", "/api/v1/trna/trna", Periodo },
        { "POST", "/api/v1/usuarios/usuagraf", Periodo },
        { "POST", "/api/v1/validaciones/certificarFauco_cpenero", Periodo }
    };

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task NonOracleRepositoryFailureYieldsTheHandlerEnvelopeAndOneErrorLog(string method, string route, string? json)
    {
        using var factory = new T3ApiFactory(new Exception("boom"));
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
        using var factory = new T3ApiFactory(new OracleOperationException("PK_X.f", new Dictionary<string, object?>(), 1400, oracleMessage));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request(method, route, json));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal("Faltan datos obligatorios para completar la operación en Oracle.", body.GetProperty("message").GetString());
        Assert.Equal("ORA-01400", body.GetProperty("oraCode").GetString());
        Assert.False(string.IsNullOrEmpty(body.GetProperty("traceId").GetString()));
        Assert.Equal("PK_X.f", body.GetProperty("detail").GetProperty("operacion").GetString());
        Assert.Equal(oracleMessage, body.GetProperty("detail").GetProperty("oracleMessage").GetString());
        Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
    }

    [Fact]
    public async Task OracleTimeoutStillAnswers502()
    {
        using var factory = new T3ApiFactory(new OracleTimeoutException("Se perdió la conexión con Oracle."));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request("POST", "/api/v1/sui/dashboard", "{\"anno\":2025,\"mes\":3}"));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Equal("Se perdió la conexión con Oracle.", body.GetProperty("message").GetString());
        Assert.Equal("ORA-03135", body.GetProperty("oraCode").GetString());
    }

    // PK_SUI.sql in the repo has no raise_application_error text for ORA-20001/20002, so the SUI controller keeps
    // today's business messages and 500 status for exactly those two codes.
    [Theory]
    [InlineData(20001, "Formato no aplicable para esta APS según regla apsa_solorell.")]
    [InlineData(20002, "La APS requiere información de relleno para F35/F36 y no está disponible.")]
    public async Task SuiBusinessRuleErrorsKeepTheirMessages(int number, string expected)
    {
        var oracleMessage = $"ORA-{number}: regla\nORA-06512: at \"VEOLIA.PK_SUI\", line 1";
        using var factory = new T3ApiFactory(new OracleOperationException("PK_SUI.fsui_f35", new Dictionary<string, object?>(), number, oracleMessage));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request("POST", "/api/v1/sui/consuforma35", Periodo));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal(expected, body.GetProperty("message").GetString());
        Assert.Equal($"ORA-{number}", body.GetProperty("oraCode").GetString());
        Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
    }

    public static TheoryData<string, string, string?, string, HttpStatusCode, string, string> ClientErrors() => new()
    {
        // Model validation (ApiController) on out-of-range fields, before the repository runs: property "" skips the body check.
        { "POST", "/api/v1/kilometros/lbl", "{\"aps\":5,\"anno\":2025,\"mes\":13}", "boom", HttpStatusCode.BadRequest, "", "" },
        { "POST", "/api/v1/tafna/tafna", "{\"aps\":0,\"anno\":2025,\"mes\":3}", "boom", HttpStatusCode.BadRequest, "", "" },
        { "POST", "/api/v1/trna/trna", "{\"aps\":5,\"anno\":1999,\"mes\":3}", "boom", HttpStatusCode.BadRequest, "", "" },
        { "POST", "/api/v1/toneladas/qrt", "{\"aps\":5,\"anno\":2025,\"mes\":0}", "boom", HttpStatusCode.BadRequest, "", "" },
        { "POST", "/api/v1/usuarios/usuagraf", "{\"aps\":5,\"anno\":2025,\"mes\":13}", "boom", HttpStatusCode.BadRequest, "", "" },
        { "POST", "/api/v1/reversiones/crearAutorizacion", "{\"aps\":5,\"anno\":2025,\"mes\":3,\"descripcion\":\"x\"}", "boom", HttpStatusCode.BadRequest, "", "" },
        // Controller-produced 4xx.
        { "GET", "/api/v1/informes/costos?aps=5&anno=2025&mes=3", null, "invalid", HttpStatusCode.BadRequest, "message", "Periodo no disponible." },
        { "GET", "/api/v1/informes/clus?aps=5&anno=2025&mes=3", null, "notfound", HttpStatusCode.NotFound, "message", "Sin datos." },
        { "POST", "/api/v1/pgirs/resumen", "{\"apsId\":0}", "boom", HttpStatusCode.BadRequest, "message", "aps es obligatorio." },
        { "POST", "/api/v1/productividad/consulta", "{\"aps\":5,\"anno\":2025,\"mes\":13}", "boom", HttpStatusCode.BadRequest, "message", "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12." },
        { "POST", "/api/v1/proyecciones/cargardesdedrive", "{\"apsaId\":5}", "invalid", HttpStatusCode.NotFound, "message", "Periodo no disponible." },
        { "POST", "/api/v1/proyecciones/ejecutarproyectar", "{\"proyId\":0,\"apsaId\":5}", "boom", HttpStatusCode.BadRequest, "message", "El ID de proyección es obligatorio." },
        { "DELETE", "/api/v1/subcon/eliminar/0", null, "boom", HttpStatusCode.BadRequest, "data", "id inválido." },
        { "POST", "/api/v1/sui/consuformu23", Periodo, "invalid", HttpStatusCode.BadRequest, "message", "Periodo no disponible." },
        { "POST", "/api/v1/sui/dashboard", "{\"anno\":2025,\"mes\":3}", "conflict", HttpStatusCode.Conflict, "message", "Ya procesado." },
        { "POST", "/api/v1/sui/existenArchivosGenerados", Periodo, "precondition", HttpStatusCode.PreconditionFailed, "message", "Falta certificar." },
        { "POST", "/api/v1/sui/getcanCertificate", Periodo, "validation", HttpStatusCode.BadRequest, "message", "Dato inválido." },
        { "POST", "/api/v1/sui/reversionesF19", "{\"aps\":0}", "boom", HttpStatusCode.BadRequest, "message", "El campo aps es requerido y debe ser mayor a cero" },
        { "POST", "/api/v1/suministros/guardarProductividad", "{\"dataPropios\":[],\"dataTerceros\":[]}", "invalid", HttpStatusCode.BadRequest, "message", "Periodo no disponible." }
    };

    [Theory]
    [MemberData(nameof(ClientErrors))]
    public async Task ControllerValidationStillAnswersItsOwn4xx(
        string method, string route, string? json, string failure, HttpStatusCode status, string property, string message)
    {
        using var factory = new T3ApiFactory(Failure(failure));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request(method, route, json));
        var body = await Json(response);

        Assert.Equal(status, response.StatusCode);
        if (property.Length > 0)
        {
            Assert.Equal(message, body.GetProperty(property).GetString());
        }

        Assert.DoesNotContain(factory.Logs.Entries, e => e.Level == LogLevel.Error);
    }

    [Fact]
    public async Task SuministrosSetReversionWithoutMotivoKeepsItsBusinessAnswer()
    {
        using var factory = new T3ApiFactory(new Exception("boom"));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request("POST", "/api/v1/suministros/setReversion", "{\"aps\":5,\"anno\":2025,\"mes\":3,\"motivo\":\" \"}"));
        var raw = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("El motivo es obligatorio.", raw);
    }

    private static Exception Failure(string kind) => kind switch
    {
        "invalid" => new InvalidOperationException("Periodo no disponible."),
        "notfound" => new NotFoundException("Sin datos."),
        "conflict" => new ConflictException("Ya procesado."),
        "precondition" => new PreconditionFailedException("Falta certificar."),
        "validation" => new ValidationException("Dato inválido."),
        _ => new Exception("boom")
    };

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

    private sealed class T3ApiFactory(Exception failure) : WebApplicationFactory<Program>
    {
        internal T3CapturingLoggerProvider Logs { get; } = new();

        internal HttpClient AuthorizedClient()
        {
            var client = CreateClient();
            client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TokenSisuId));
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
                Throwing<IInformesRepository>(services);
                Throwing<IKillometrosRepository>(services);
                Throwing<IPgirsRepository>(services);
                Throwing<IProductividadRepository>(services);
                Throwing<IProyeccionRepository>(services);
                Throwing<ILineaTiempoRepository>(services);
                Throwing<ICrecimientoRepository>(services);
                Throwing<ICrecimientoDriveService>(services);
                Throwing<ISubcontProyRepository>(services);
                Throwing<IEjecucionProyeccionRepository>(services);
                Throwing<IRellenosRepository>(services);
                Throwing<IReversionesRepository>(services);
                Throwing<ISubContRepository>(services);
                Throwing<ISuiRepository>(services);
                Throwing<ISuiReversionesRepository>(services);
                Throwing<ISuministrosRepository>(services);
                Throwing<ICargueProductividadService>(services);
                Throwing<IValidacionesRepository>(services);
                Throwing<ITafnaRepository>(services);
                Throwing<ITarifasRepository>(services);
                Throwing<IToneladasRepository>(services);
                Throwing<ITrnaRepository>(services);
                Throwing<IUsuariosGraficoRepository>(services);
            });
        }

        private void Throwing<T>(IServiceCollection services) where T : class
        {
            services.RemoveAll<T>();
            services.AddSingleton(ThrowingProxy.Create<T>(failure));
        }
    }

    // Every repository method fails with the configured exception (faulted Task for async members).
    public class ThrowingProxy : DispatchProxy
    {
        private static readonly MethodInfo FromException = typeof(Task)
            .GetMethods()
            .Single(m => m.Name == nameof(Task.FromException) && m.IsGenericMethodDefinition);

        private Exception failure = null!;

        internal static T Create<T>(Exception failure) where T : class
        {
            var proxy = Create<T, ThrowingProxy>();
            ((ThrowingProxy)(object)proxy).failure = failure;
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            var returnType = targetMethod!.ReturnType;
            if (returnType == typeof(Task))
            {
                return Task.FromException(failure);
            }

            if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
            {
                return FromException.MakeGenericMethod(returnType.GetGenericArguments()[0]).Invoke(null, [failure]);
            }

            throw failure;
        }
    }

    private sealed class T3CapturingLoggerProvider : ILoggerProvider
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
