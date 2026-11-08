using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Aprovechamiento;
using Veolia.Api.Modules.Regulator.Aps;
using Veolia.Api.Modules.Regulator.Empresas;
using Veolia.Api.Modules.Regulator.Facturacion;
using Veolia.Api.Modules.Regulator.General;
using Veolia.Api.Modules.Regulator.Indices;
using Veolia.Api.Modules.Regulator.InfoGenerales;
using Veolia.Api.Modules.Regulator.InfoGerencial;

namespace Veolia.Api.Tests;

// odd/tasks/oracle-error-context.md S6 (T2): the Regulator controllers Aps..InfoGerencial no longer answer
// repository failures with their own 500 bodies; the global handler (S3-S5) logs once and answers the envelope.
// 4xx paths the controllers produce themselves keep their status and message.
public sealed class RegulatorGlobalErrorHandlingT2Tests
{
    private const long TokenSisuId = 4242;

    public static TheoryData<string, string, string?> Routes() => new()
    {
        { "POST", "/api/v1/aps/consultageneral", "{}" },
        { "POST", "/api/v1/aps/crear", "{\"nombre\":\"APS\",\"idsui\":\"1\",\"resolucion\":1,\"propio\":1,\"relleno\":0,\"estado\":1,\"iat\":0}" },
        { "GET", "/api/v1/aps", null },
        { "POST", "/api/v1/aprovechamiento/consulta", "{\"aps\":5,\"anno\":2025,\"mes\":3}" },
        { "POST", "/api/v1/aprovechamiento/actualizar", "{\"aps\":5,\"anno\":2025,\"mes\":3,\"activar\":true}" },
        { "GET", "/api/v1/empresas", null },
        { "PATCH", "/api/v1/empresas/toggle-estado/7", null },
        { "POST", "/api/v1/facturacion/facturacion", "{\"aps\":5,\"anno\":2025,\"mes\":3}" },
        { "GET", "/api/v1/general/consultauso", null },
        { "GET", "/api/v1/general/paraindices", null },
        { "GET", "/api/v1/indices", null },
        { "POST", "/api/v1/indices/crear", "{\"anno\":2025,\"mes\":3,\"valores\":[{\"id\":2,\"val\":1.5}]}" },
        { "POST", "/api/v1/infogenerales/consultaenergia", "{\"apsaid\":5,\"proyid\":9}" },
        { "POST", "/api/v1/infogenerales/consultaHistorialCertificaciones", "{\"anno\":2025,\"mes\":3}" },
        { "POST", "/api/v1/infogerencial/detcostos", "{\"anno\":2025,\"mes\":3}" },
        { "POST", "/api/v1/infogerencial/setapsDesCost", "{\"aps\":5,\"anno\":2025,\"mes\":3,\"id\":2,\"valor\":1.5}" }
    };

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task NonOracleRepositoryFailureYieldsTheHandlerEnvelopeAndOneErrorLog(string method, string route, string? json)
    {
        using var factory = new T2ApiFactory(new Exception("boom"));
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

        var entry = Assert.Single(factory.Logs.Entries, e => e.Level == LogLevel.Error);
        Assert.Contains($"endpoint={method} {route}", entry.Message);
        Assert.Contains($"traceId={traceId}", entry.Message);
        Assert.Contains($"usuario={TokenSisuId}", entry.Message);
    }

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task OracleRepositoryFailureYieldsTheSharedOracleMessage(string method, string route, string? json)
    {
        const string oracleMessage = "ORA-01400: cannot insert NULL into (\"VEOLIA\".\"T\".\"C\")";
        using var factory = new T2ApiFactory(new OracleOperationException("PK_X.f", new Dictionary<string, object?>(), 1400, oracleMessage));
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
    }

    public static TheoryData<string, string, string?, HttpStatusCode, string> ClientErrors() => new()
    {
        // Model validation (ApiController) on a missing non-nullable field, before the repository runs.
        { "POST", "/api/v1/aps/crear", "{\"idsui\":\"1\",\"propio\":1,\"relleno\":0,\"estado\":1,\"iat\":0}", HttpStatusCode.BadRequest, "" },
        { "POST", "/api/v1/empresas/crear", "{\"estado\":1,\"propia\":1}", HttpStatusCode.BadRequest, "" },
        { "POST", "/api/v1/aprovechamiento/consulta", "{\"aps\":5,\"anno\":2025,\"mes\":13}", HttpStatusCode.BadRequest, "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12." },
        { "GET", "/api/v1/indices/0", null, HttpStatusCode.BadRequest, "id inválido." },
        { "POST", "/api/v1/infogenerales/consultaenergia", "{\"apsaid\":0,\"proyid\":9}", HttpStatusCode.BadRequest, "apsaid y proyid son obligatorios." },
        { "POST", "/api/v1/infogerencial/detcostos", "{\"anno\":2025,\"mes\":0}", HttpStatusCode.BadRequest, "anno y mes son obligatorios. mes debe estar entre 1 y 12." }
    };

    [Theory]
    [MemberData(nameof(ClientErrors))]
    public async Task ControllerValidationStillAnswersItsOwn4xx(string method, string route, string? json, HttpStatusCode status, string message)
    {
        using var factory = new T2ApiFactory(new Exception("boom"));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request(method, route, json));
        var body = await Json(response);

        Assert.Equal(status, response.StatusCode);
        if (message.Length > 0)
        {
            Assert.Equal("error", body.GetProperty("status").GetString());
            Assert.Equal(message, body.GetProperty("message").GetString());
        }

        Assert.DoesNotContain(factory.Logs.Entries, e => e.Level == LogLevel.Error);
    }

    [Fact]
    public async Task GeneralWithoutTokenStillAnswers403()
    {
        using var factory = new T2ApiFactory(new Exception("boom"));
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/general/consultauso");
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", body.GetProperty("message").GetString());
    }

    [Fact]
    public async Task FacturacionValidationExceptionKeepsItsControllerBadRequest()
    {
        using var factory = new T2ApiFactory(new ValidationException("Dato inválido."));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request("POST", "/api/v1/facturacion/facturacion", "{\"aps\":5,\"anno\":2025,\"mes\":3}"));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal("Dato inválido.", body.GetProperty("message").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("oraCode").ValueKind);
    }

    [Fact]
    public async Task IndicesDuplicatePeriodKeepsItsConflict()
    {
        using var factory = new T2ApiFactory(new InvalidOperationException("DUPLICATE_PERIOD"));
        using var client = factory.AuthorizedClient();

        var response = await client.SendAsync(Request("POST", "/api/v1/indices/crear", "{\"anno\":2025,\"mes\":3,\"valores\":[{\"id\":2,\"val\":1.5}]}"));
        var body = await Json(response);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal("Ya existen índices activos para ese período.", body.GetProperty("message").GetString());
        Assert.DoesNotContain(factory.Logs.Entries, e => e.Level == LogLevel.Error);
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

    private sealed class T2ApiFactory(Exception failure) : WebApplicationFactory<Program>
    {
        internal T2CapturingLoggerProvider Logs { get; } = new();

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
                var throwing = new ThrowingT2Repositories(failure);
                services.RemoveAll<IOracleConnectionFactory>();
                services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
                services.RemoveAll<IApsRepository>();
                services.AddSingleton<IApsRepository>(throwing);
                services.RemoveAll<IAprovechamientoRepository>();
                services.AddSingleton<IAprovechamientoRepository>(throwing);
                services.RemoveAll<IEmpresasRepository>();
                services.AddSingleton<IEmpresasRepository>(throwing);
                services.RemoveAll<IFacturacionRepository>();
                services.AddSingleton<IFacturacionRepository>(throwing);
                services.RemoveAll<IGeneralRepository>();
                services.AddSingleton<IGeneralRepository>(throwing);
                services.RemoveAll<IIndicesRepository>();
                services.AddSingleton<IIndicesRepository>(throwing);
                services.RemoveAll<IInfoGeneralesRepository>();
                services.AddSingleton<IInfoGeneralesRepository>(throwing);
                services.RemoveAll<IInfoGerencialRepository>();
                services.AddSingleton<IInfoGerencialRepository>(throwing);
            });
        }
    }

    private sealed class ThrowingT2Repositories(Exception failure) :
        IApsRepository, IAprovechamientoRepository, IEmpresasRepository, IFacturacionRepository,
        IGeneralRepository, IIndicesRepository, IInfoGeneralesRepository, IInfoGerencialRepository
    {
        private Task<T> Fail<T>() => Task.FromException<T>(failure);

        private Task Fail() => Task.FromException(failure);

        Task<IReadOnlyList<object>> IApsRepository.ConsultaGeneralAsync(CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IApsRepository.ConsultaApsAsync(long apsId, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<object?> IApsRepository.CrearAsync(string nombre, string? idsui, int? resolucion, int propio, int relleno, int estado, int iat, long usuario, CancellationToken cancellationToken) => Fail<object?>();
        Task<object?> IApsRepository.EditarAsync(long id, string nombre, string? idsui, int? resolucion, int propio, int relleno, int estado, int iat, CancellationToken cancellationToken) => Fail<object?>();
        Task<IReadOnlyList<object>> IApsRepository.GetApsByUsuarioAsync(long sisuId, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IApsRepository.GetUsuarioPorApsAsync(long apsId, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<object?> IApsRepository.EliminarAsync(long id, CancellationToken cancellationToken) => Fail<object?>();

        Task<AprovechamientoResponseDto?> IAprovechamientoRepository.ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken) => Fail<AprovechamientoResponseDto?>();
        Task IAprovechamientoRepository.ActualizarAsync(int aps, int anno, int mes, bool activar, long usuarioId, CancellationToken cancellationToken) => Fail();

        Task<IReadOnlyList<object>> IEmpresasRepository.GetAllAsync(CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<object?> IEmpresasRepository.CreateAsync(string nombre, int estado, int propia, string? nuap, long sisuId, CancellationToken cancellationToken) => Fail<object?>();
        Task<IReadOnlyList<object>> IEmpresasRepository.ConsultarPropiasAsync(long aps, int propia, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IEmpresasRepository.ConsultaEmprAsync(long empr, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<object?> IEmpresasRepository.UpdateAsync(long id, string nombre, int estado, int propia, string? nuap, CancellationToken cancellationToken) => Fail<object?>();
        Task<object?> IEmpresasRepository.EliminarAsync(long id, CancellationToken cancellationToken) => Fail<object?>();
        Task<object?> IEmpresasRepository.ToggleEstadoAsync(long id, CancellationToken cancellationToken) => Fail<object?>();

        Task<IReadOnlyList<IDictionary<string, object?>>> IFacturacionRepository.ConsultarAsync(string vista, int aps, int anno, int mes, CancellationToken cancellationToken) => Fail<IReadOnlyList<IDictionary<string, object?>>>();

        Task<IReadOnlyList<object>> IGeneralRepository.ConsultarUsoAsync(CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IGeneralRepository.ConsultarCostosAsync(CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IGeneralRepository.ConsultarIndicesAsync(CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();

        Task<IReadOnlyList<IndicesResponseDto>> IIndicesRepository.GetByPeriodAsync(int anno, int mes, CancellationToken cancellationToken) => Fail<IReadOnlyList<IndicesResponseDto>>();
        Task<IReadOnlyList<IndicesResponseDto>> IIndicesRepository.GetAllAsync(CancellationToken cancellationToken) => Fail<IReadOnlyList<IndicesResponseDto>>();
        Task<IndicesResponseDto?> IIndicesRepository.GetByIdAsync(long id, CancellationToken cancellationToken) => Fail<IndicesResponseDto?>();
        Task<long> IIndicesRepository.CrearAsync(IndicesCrearRequestDto dto, long usuarioId, CancellationToken cancellationToken) => Fail<long>();
        Task<bool> IIndicesRepository.EditarAsync(IndicesEditarRequestDto dto, CancellationToken cancellationToken) => Fail<bool>();
        Task<bool> IIndicesRepository.EliminarAsync(long indiceTipoId, int anno, int mes, CancellationToken cancellationToken) => Fail<bool>();
        Task<IReadOnlyList<IndiceCatalogoDto>> IIndicesRepository.GetCatalogoAsync(CancellationToken cancellationToken) => Fail<IReadOnlyList<IndiceCatalogoDto>>();

        Task<IReadOnlyList<object>> IInfoGeneralesRepository.ConsultaEnergiaAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGeneralesRepository.ConsultaAcueductoAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGeneralesRepository.ConsultaCostosAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGeneralesRepository.ConsultaTarifasAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGeneralesRepository.ConsultaHistorialCertificacionesAsync(int anno, int mes, long usuario, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGeneralesRepository.ConsultaHistorialProductividadAsync(int anno, int mes, long usuario, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();

        Task<IReadOnlyList<object>> IInfoGerencialRepository.GetDetalleCostosAsync(int anno, int mes, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGerencialRepository.GetDetalleSubAporteAsync(int anno, int mes, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGerencialRepository.GetInfoApsEmprDiviAsync(int aps, int anno, int mes, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGerencialRepository.GetInfoEmprDiviAsync(int aps, int anno, int mes, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGerencialRepository.GetInfoApsRellenoAsync(int aps, int anno, int mes, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGerencialRepository.GetDashBoardGerencialAsync(int anno, int mes, long usuario, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGerencialRepository.GetCostoPodaAsync(int aps, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGerencialRepository.GetDescuentosAsync(int aps, int anno, int mes, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task<IReadOnlyList<object>> IInfoGerencialRepository.GetCatalogoDescuentoAsync(int id, int aps, int anno, int mes, bool isNew, CancellationToken cancellationToken) => Fail<IReadOnlyList<object>>();
        Task IInfoGerencialRepository.InsertDescuentoAsync(int aps, int anno, int mes, int paraId, decimal valor, long usuario, CancellationToken cancellationToken) => Fail();
        Task IInfoGerencialRepository.UpdateDescuentoAsync(int aps, int anno, int mes, int paraId, decimal valor, CancellationToken cancellationToken) => Fail();
    }

    private sealed class T2CapturingLoggerProvider : ILoggerProvider
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
