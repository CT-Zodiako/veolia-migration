using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Reliquidaciones.Contracts;
using Veolia.Api.Modules.Reliquidaciones.Tarificador;

namespace Veolia.Api.Tests;

public sealed class ReliqTarificadorContractTests
{
    // R1: legacy tarificador/controller.js calls reliq.pkrei_aplicarreliquida.fnrei_aplicartodo.
    [Fact]
    public void AprobarSqlUsesReliqSchemaLikeLegacy()
    {
        Assert.Contains("reliq.pkrei_aplicarreliquida.fnrei_aplicartodo(", ReliqTarificadorRepository.AprobarTodoSql, StringComparison.OrdinalIgnoreCase);
    }

    // R3: legacy binds the approval output with maxSize 32767.
    [Fact]
    public void AprobarOutputBufferMatchesLegacyMaxSize()
    {
        Assert.Equal(32767, ReliqTarificadorRepository.AprobarResultadoMaxSize);
    }

    // R2: legacy returned 200 with resultado:null when the package returned no resumen.
    [Theory]
    [InlineData("resumenUsuarios")]
    [InlineData("resumenEmpresa")]
    [InlineData("resumenAdicional")]
    [InlineData("resumenRelleno")]
    [InlineData("resumenAPS")]
    public async Task EmptyResumenReturnsOkWithNullResumen(string route)
    {
        using var factory = new ReliqTarificadorApiFactory();
        factory.Repository.ResumenResult = null;
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync($"/api/v1/reliqTarificador/{route}", new { reliqId = 7 });
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("data").GetProperty("resumen").ValueKind);
        Assert.Equal(1, factory.Repository.ResumenCalls);
    }

    [Fact]
    public async Task ResumenWithDataStillReturnsIt()
    {
        using var factory = new ReliqTarificadorApiFactory();
        factory.Repository.ResumenResult = new ResumenResponseDto { Resumen = new { filas = new[] { new { id = 1 } } } };
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqTarificador/resumenUsuarios", new { reliqId = 7 });
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, body.GetProperty("data").GetProperty("resumen").GetProperty("filas")[0].GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task ResumenStillRejectsMissingReliqId()
    {
        using var factory = new ReliqTarificadorApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqTarificador/resumenUsuarios", new { reliqId = 0 });
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("reliqId es obligatorio.", body.GetProperty("message").GetString());
        Assert.Equal(0, factory.Repository.ResumenCalls);
    }

    // R4: legacy Tarificador allowed approval for any estado except "2" (Aplicada).
    [Theory]
    [InlineData("1", true)]
    [InlineData("CREADA", true)]
    [InlineData("3", true)]
    [InlineData("2", false)]
    public async Task EstadoReportsPuedeAprobarForAnythingButAplicada(string estado, bool puedeAprobar)
    {
        using var factory = new ReliqTarificadorApiFactory();
        factory.Repository.Estado = estado;
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqTarificador/estadoReliquidacion", new { reliqId = 7 });
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(estado, body.GetProperty("data").GetProperty("estado").GetString());
        Assert.Equal(puedeAprobar, body.GetProperty("data").GetProperty("puedeAprobar").GetBoolean());
    }

    [Fact]
    public async Task AprobarRunsForNonAplicadaEstado()
    {
        using var factory = new ReliqTarificadorApiFactory();
        factory.Repository.Estado = "3";
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqTarificador/aprobarReliquidacion", new { reliqId = 7 });
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body.GetProperty("status").GetString());
        Assert.Equal(1, factory.Repository.AprobarCalls);
        Assert.Equal(101, factory.Repository.LastUsuarioId);
    }

    [Fact]
    public async Task AprobarRejectsAplicadaWithoutCallingPackage()
    {
        using var factory = new ReliqTarificadorApiFactory();
        factory.Repository.Estado = "2";
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqTarificador/aprobarReliquidacion", new { reliqId = 7 });
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("RELIQ_ALREADY_APPLIED", body.GetProperty("message").GetString());
        Assert.False(body.GetProperty("data").GetProperty("puedeAprobar").GetBoolean());
        Assert.Equal(0, factory.Repository.AprobarCalls);
    }

    private static HttpClient CreateClient(ReliqTarificadorApiFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build());
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
}

internal sealed class ReliqTarificadorApiFactory : WebApplicationFactory<Program>
{
    internal StubReliqTarificadorRepository Repository { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IReliqTarificadorRepository>();
            services.AddSingleton<IReliqTarificadorRepository>(Repository);
        });
    }
}

internal sealed class StubReliqTarificadorRepository : IReliqTarificadorRepository
{
    public ResumenResponseDto? ResumenResult { get; set; }
    public string? Estado { get; set; } = "1";
    public int ResumenCalls { get; private set; }
    public int AprobarCalls { get; private set; }
    public long LastUsuarioId { get; private set; }

    public Task<ResumenResponseDto?> ResumenUsuariosAsync(long reliqId, CancellationToken cancellationToken) => Resumen();
    public Task<ResumenResponseDto?> ResumenEmpresaAsync(long reliqId, CancellationToken cancellationToken) => Resumen();
    public Task<ResumenResponseDto?> ResumenAdicionalAsync(long reliqId, CancellationToken cancellationToken) => Resumen();
    public Task<ResumenResponseDto?> ResumenRellenoAsync(long reliqId, CancellationToken cancellationToken) => Resumen();
    public Task<ResumenResponseDto?> ResumenApsAsync(long reliqId, CancellationToken cancellationToken) => Resumen();

    public Task<AprobarReliquidacionResultadoDto> AprobarReliquidacionAsync(long reliqId, long usuarioId, CancellationToken cancellationToken)
    {
        AprobarCalls++;
        LastUsuarioId = usuarioId;
        return Task.FromResult(new AprobarReliquidacionResultadoDto { Mensaje = "Aplicado" });
    }

    public Task<string?> EstadoReliquidacionAsync(long reliqId, CancellationToken cancellationToken)
        => Task.FromResult(Estado);

    private Task<ResumenResponseDto?> Resumen()
    {
        ResumenCalls++;
        return Task.FromResult(ResumenResult);
    }
}
