using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Reliquidaciones.Contracts;
using Veolia.Api.Modules.Reliquidaciones.Crear;

namespace Veolia.Api.Tests;

public sealed class ReliqCrearContractTests
{
    // C2: legacy reliq/controller.js only continued when `resPlRaw.ret === "ok"`.
    [Theory]
    [InlineData("ok", true)]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("   ", false)]
    [InlineData("STUB_OK", false)]
    [InlineData("OK", false)]
    [InlineData("ERR|1|fallo", false)]
    public void ExtraccionIsSuccessfulOnlyWhenPackageReturnsOk(string? resultado, bool exitosa)
    {
        Assert.Equal(exitosa, ReliqCrearRepository.ExtraccionExitosa(resultado));
    }

    [Fact]
    public async Task FailedExtraccionReturnsErrorMessageForTheUser()
    {
        using var factory = new ReliqCrearApiFactory();
        factory.Repository.CrearException = new ReliqExtraccionFallidaException("STUB_OK");
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCrear/crear", ValidRequest());
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("data").ValueKind);
        Assert.Equal("La extracción de la reliquidación no se completó (resultado: 'STUB_OK').", body.GetProperty("message").GetString());
        Assert.Equal(1, factory.Repository.CrearCalls);
    }

    [Fact]
    public async Task CrearStillSucceedsWithValidUsers()
    {
        using var factory = new ReliqCrearApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCrear/crear", ValidRequest());
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Reliquidación creada correctamente.", body.GetProperty("message").GetString());
        Assert.Equal(1, factory.Repository.CrearCalls);
        Assert.Equal(5, factory.Repository.LastRequest!.UsuSolicita);
        Assert.Equal(6, factory.Repository.LastRequest!.UsuAprueba);
    }

    // C3: usuSolicita/usuAprueba must reference a real user (> 0).
    [Theory]
    [InlineData(0, 6)]
    [InlineData(-1, 6)]
    [InlineData(5, 0)]
    [InlineData(5, -3)]
    public async Task CrearRejectsNonPositiveUsers(long usuSolicita, long usuAprueba)
    {
        using var factory = new ReliqCrearApiFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCrear/crear", ValidRequest(usuSolicita, usuAprueba));
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("error", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("data").ValueKind);
        Assert.Equal("usuSolicita y usuAprueba son obligatorios.", body.GetProperty("message").GetString());
        Assert.Equal(0, factory.Repository.CrearCalls);
    }

    [Fact]
    public async Task CrearStillRejectsMissingApsaIdFirst()
    {
        using var factory = new ReliqCrearApiFactory();
        using var client = CreateClient(factory);

        var request = ValidRequest(0, 0);
        request["apsaId"] = 0;
        var response = await client.PostAsJsonAsync("/api/v1/reliqCrear/crear", request);
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("apsaId es obligatorio.", body.GetProperty("message").GetString());
        Assert.Equal(0, factory.Repository.CrearCalls);
    }

    private static Dictionary<string, object?> ValidRequest(long usuSolicita = 5, long usuAprueba = 6) => new()
    {
        ["apsaId"] = 3,
        ["nombre"] = "Reliq prueba",
        ["descripcion"] = "desc",
        ["desde"] = "202401",
        ["hasta"] = "202402",
        ["usuSolicita"] = usuSolicita,
        ["usuAprueba"] = usuAprueba,
        ["estado"] = "Creada",
        ["idAtt"] = 11
    };

    private static HttpClient CreateClient(ReliqCrearApiFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build());
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
}

internal sealed class ReliqCrearApiFactory : WebApplicationFactory<Program>
{
    internal StubReliqCrearRepository Repository { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IReliqCrearRepository>();
            services.AddSingleton<IReliqCrearRepository>(Repository);
        });
    }
}

internal sealed class StubReliqCrearRepository : IReliqCrearRepository
{
    public Exception? CrearException { get; set; }
    public int CrearCalls { get; private set; }
    public CrearReliquidacionRequestDto? LastRequest { get; private set; }

    public Task<ReliquidacionDto?> CrearAsync(CrearReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken)
    {
        CrearCalls++;
        LastRequest = request;
        if (CrearException is not null)
            throw CrearException;
        return Task.FromResult<ReliquidacionDto?>(new ReliquidacionDto { RelqId = 1, ApsaId = request.ApsaId });
    }

    public Task<IReadOnlyList<ReliquidacionDto>> GetReliquidacionesAsync(long? apsaId, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<ReliquidacionDto>>([]);

    public Task<IReadOnlyList<ReliquidacionDto>> GetReliquidacionByApsAsync(long apsaId, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<ReliquidacionDto>>([]);

    public Task<bool> ActualizarAsync(ActualizarReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken)
        => Task.FromResult(true);

    public Task<bool> EliminarAsync(long relqId, CancellationToken cancellationToken)
        => Task.FromResult(true);
}
