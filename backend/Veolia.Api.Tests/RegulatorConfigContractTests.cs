using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Empresas;
using Veolia.Api.Modules.Regulator.Rellenos;

namespace Veolia.Api.Tests;

public sealed class RegulatorConfigContractTests
{
    // L2: exception internals (message, stack trace) must never reach the client.
    [Fact]
    public async Task ListarRellenosFailureDoesNotLeakExceptionDetails()
    {
        using var factory = new RegulatorConfigApiFactory();
        factory.Rellenos.ListarException = new InvalidOperationException("ORA-00942 secret-table-name");
        using var client = CreateClient(factory);

        var response = await client.GetAsync("/api/v1/rellenos");
        var raw = await response.Content.ReadAsStringAsync();
        var body = JsonSerializer.Deserialize<JsonElement>(raw);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("Error", body.GetProperty("data").GetString());
        Assert.DoesNotContain("secret-table-name", raw);
        Assert.DoesNotContain(" at ", raw);
        Assert.DoesNotContain(nameof(StubRellenosRepository), raw);
        Assert.Contains(factory.Logs.Entries, e => e.Level == LogLevel.Error && e.Exception?.Message.Contains("secret-table-name") == true);
    }

    [Fact]
    public async Task ListarRellenosStillReturnsRows()
    {
        using var factory = new RegulatorConfigApiFactory();
        using var client = CreateClient(factory);

        var response = await client.GetAsync("/api/v1/rellenos");
        var body = JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Relleno 1", body[0].GetProperty("RELL_NOMRELLENO").GetString());
    }

    // E3: AUGE_EMPRESAS.EMPR_NUAP is VARCHAR2(30) DEFAULT '0' NOT NULL; an explicit NULL bind violates it.
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CrearEmpresaWithoutNuapStoresZero(string? nuap)
    {
        using var factory = new RegulatorConfigApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/empresas/crear", new { nombre = "Empresa", estado = 1, propia = 1, nuap });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("0", factory.Empresas.LastNuap);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task EditarEmpresaWithoutNuapStoresZero(string? nuap)
    {
        using var factory = new RegulatorConfigApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PutAsJsonAsync("/api/v1/empresas/editar/7", new { nombre = "Empresa", estado = 1, propia = 1, nuap });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("0", factory.Empresas.LastNuap);
    }

    [Fact]
    public async Task CrearEmpresaKeepsTypedNuap()
    {
        using var factory = new RegulatorConfigApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/empresas/crear", new { nombre = "Empresa", estado = 1, propia = 1, nuap = "12345" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("12345", factory.Empresas.LastNuap);
        Assert.Equal("Empresa", factory.Empresas.LastNombre);
    }

    private static HttpClient CreateClient(RegulatorConfigApiFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build());
        return client;
    }
}

internal sealed class RegulatorConfigApiFactory : WebApplicationFactory<Program>
{
    internal StubRellenosRepository Rellenos { get; } = new();
    internal StubRegulatorEmpresasRepository Empresas { get; } = new();
    internal CapturingLoggerProvider Logs { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureLogging(logging => logging.AddProvider(Logs));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IRellenosRepository>();
            services.AddSingleton<IRellenosRepository>(Rellenos);
            services.RemoveAll<IEmpresasRepository>();
            services.AddSingleton<IEmpresasRepository>(Empresas);
        });
    }
}

internal sealed class StubRellenosRepository : IRellenosRepository
{
    public Exception? ListarException { get; set; }

    public Task<IReadOnlyList<RellenoResponse>> ListarAsync(CancellationToken cancellationToken)
    {
        if (ListarException is not null)
            throw ListarException;
        return Task.FromResult<IReadOnlyList<RellenoResponse>>([new RellenoResponse { RELL_ID = 1, RELL_NOMRELLENO = "Relleno 1", RELL_ESTADO = 1 }]);
    }

    public Task<IReadOnlyList<RellenoResponse>> ConsultarAsync(RellenoRequest request, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<RellenoResponse>>([]);

    public Task<object?> CrearAsync(CrearRellenoRequest request, long sisuId, CancellationToken cancellationToken)
        => Task.FromResult<object?>(new { rowsAffected = 1 });

    public Task<object?> EditarAsync(long id, EditarRellenoRequest request, CancellationToken cancellationToken)
        => Task.FromResult<object?>(new { rowsAffected = 1 });

    public Task<object?> EliminarAsync(long id, CancellationToken cancellationToken)
        => Task.FromResult<object?>(new { rowsAffected = 1 });
}

internal sealed class StubRegulatorEmpresasRepository : IEmpresasRepository
{
    public string? LastNombre { get; private set; }
    public string? LastNuap { get; private set; }

    public Task<IReadOnlyList<object>> GetAllAsync(CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<object>>([]);

    public Task<object?> CreateAsync(string nombre, int estado, int propia, string? nuap, long sisuId, CancellationToken cancellationToken)
    {
        LastNombre = nombre;
        LastNuap = nuap;
        return Task.FromResult<object?>(new { rowsAffected = 1 });
    }

    public Task<IReadOnlyList<object>> ConsultarPropiasAsync(long aps, int propia, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<object>>([]);

    public Task<IReadOnlyList<object>> ConsultaEmprAsync(long empr, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<object>>([]);

    public Task<object?> UpdateAsync(long id, string nombre, int estado, int propia, string? nuap, CancellationToken cancellationToken)
    {
        LastNombre = nombre;
        LastNuap = nuap;
        return Task.FromResult<object?>(new { rowsAffected = 1 });
    }

    public Task<object?> EliminarAsync(long id, CancellationToken cancellationToken)
        => Task.FromResult<object?>(new { rowsAffected = 1 });

    public Task<object?> ToggleEstadoAsync(long id, CancellationToken cancellationToken)
        => Task.FromResult<object?>(new { rowsAffected = 1 });
}

internal sealed class CapturingLoggerProvider : ILoggerProvider
{
    internal ConcurrentQueue<(LogLevel Level, Exception? Exception)> Entries { get; } = new();

    public ILogger CreateLogger(string categoryName) => new CapturingLogger(this);

    public void Dispose()
    {
    }

    private sealed class CapturingLogger(CapturingLoggerProvider provider) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => provider.Entries.Enqueue((logLevel, exception));
    }
}
