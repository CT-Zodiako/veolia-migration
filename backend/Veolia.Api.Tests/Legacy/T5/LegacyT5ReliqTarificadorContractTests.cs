using System.Collections.Concurrent;
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

namespace Veolia.Api.Tests.Legacy.T5;

/// <summary>
/// /api/v1/reliqTarificador against legacy back-tarificador/src/modules/reliq/tarificador/{routes.js,controller.js},
/// complementing ReliqTarificadorContractTests (R1-R4). Request key reliq → reliqId is the typed DTO the new client sends
/// (reliq-tarificador.service.ts); envelope { resumen } instead of { ok, resultado } is the recorded envelope deviation.
/// SQL text of the resúmenes is not asserted: the repository requires a concrete OracleConnection (no public seam).
/// </summary>
public sealed class LegacyT5ReliqTarificadorContractTests
{
    // Legacy routes.js:8-32 forward the request id to fnrei_previsualizar_iuae/_ined/_cead/_iare/fnrei_previsualizar
    // (controller.js:21,49,77,105,133), one per tab, and return the parsed JSON (controller.js:28-33).
    [Theory]
    [InlineData("resumenUsuarios", "Usuarios")]
    [InlineData("resumenEmpresa", "Empresa")]
    [InlineData("resumenAdicional", "Adicional")]
    [InlineData("resumenRelleno", "Relleno")]
    [InlineData("resumenAPS", "Aps")]
    public async Task Resumen_EachRouteCallsItsOwnPreviewWithTheReliq(string route, string preview)
    {
        using var factory = new T5TarificadorFactory();
        using var client = T5TarificadorFactory.Client(factory);

        var response = await client.PostAsJsonAsync($"/api/v1/reliqTarificador/{route}", new { reliqId = 31 });
        var body = await T5TarificadorFactory.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([$"{preview}:31"], factory.Repository.Calls);
        Assert.Equal(preview, body.GetProperty("data").GetProperty("resumen").GetProperty("tab").GetString());
    }

    // Legacy controller.js:160-170 / 241-250: unknown reliquidación → 404 and the package is never called.
    [Theory]
    [InlineData("aprobarReliquidacion")]
    [InlineData("estadoReliquidacion")]
    public async Task UnknownReliq_Returns404WithoutCallingThePackage(string route)
    {
        using var factory = new T5TarificadorFactory();
        factory.Repository.Estado = null;
        using var client = T5TarificadorFactory.Client(factory);

        var response = await client.PostAsJsonAsync($"/api/v1/reliqTarificador/{route}", new { reliqId = 31 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(["Estado:31"], factory.Repository.Calls);
    }

    // Legacy controller.js:220-227: 200 { ok: true, message: jsonResult?.mensaje || "Proceso aplicado correctamente.", resultado }
    // and routes.js:33-37 passes the token user (req.SISU_ID) as pint_usuusua.
    [Fact]
    public async Task Aprobar_WithoutPackageMessageUsesTheLegacyDefault()
    {
        using var factory = new T5TarificadorFactory();
        using var client = T5TarificadorFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqTarificador/aprobarReliquidacion", new { reliqId = 31 });
        var body = await T5TarificadorFactory.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Proceso aplicado correctamente.", body.GetProperty("message").GetString());
        Assert.True(body.GetProperty("data").GetProperty("ok").GetBoolean());
        Assert.Equal("Proceso aplicado correctamente.", body.GetProperty("data").GetProperty("mensaje").GetString());
        Assert.Equal(["Estado:31", $"Aprobar:31:{TestJwt.AdminSisuId}"], factory.Repository.Calls);
    }

    // Legacy controller.js:220-227: the package "mensaje" is shown as the message.
    [Fact]
    public async Task Aprobar_ShowsThePackageMessage()
    {
        using var factory = new T5TarificadorFactory();
        factory.Repository.Mensaje = "Reliquidación aplicada: 12 registros";
        using var client = T5TarificadorFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqTarificador/aprobarReliquidacion", new { reliqId = 31 });
        var body = await T5TarificadorFactory.Json(response);

        Assert.Equal("Reliquidación aplicada: 12 registros", body.GetProperty("message").GetString());
        Assert.Equal("Reliquidación aplicada: 12 registros", body.GetProperty("data").GetProperty("resultado").GetProperty("mensaje").GetString());
    }

    // Legacy controller.js:252-258: 200 { ok: true, estado, puedeAprobar: estado !== "2" }.
    [Fact]
    public async Task Estado_ReturnsOkEstadoAndPuedeAprobar()
    {
        using var factory = new T5TarificadorFactory();
        using var client = T5TarificadorFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqTarificador/estadoReliquidacion", new { reliqId = 31 });
        var data = (await T5TarificadorFactory.Json(response)).GetProperty("data");

        Assert.True(data.GetProperty("ok").GetBoolean());
        Assert.Equal("1", data.GetProperty("estado").GetString());
        Assert.True(data.GetProperty("puedeAprobar").GetBoolean());
    }
}

file sealed class T5TarificadorFactory : WebApplicationFactory<Program>
{
    internal T5TarificadorRepository Repository { get; } = new();

    internal static HttpClient Client(T5TarificadorFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TestJwt.AdminSisuId, 4));
        return client;
    }

    internal static async Task<JsonElement> Json(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

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

file sealed class T5TarificadorRepository : IReliqTarificadorRepository
{
    internal ConcurrentQueue<string> Calls { get; } = new();
    internal string? Estado { get; set; } = "1";
    internal string? Mensaje { get; set; }

    private Task<ResumenResponseDto?> Resumen(string tab, long reliqId)
    {
        Calls.Enqueue($"{tab}:{reliqId}");
        return Task.FromResult<ResumenResponseDto?>(new ResumenResponseDto { Resumen = new { tab } });
    }

    public Task<ResumenResponseDto?> ResumenUsuariosAsync(long reliqId, CancellationToken cancellationToken) => Resumen("Usuarios", reliqId);
    public Task<ResumenResponseDto?> ResumenEmpresaAsync(long reliqId, CancellationToken cancellationToken) => Resumen("Empresa", reliqId);
    public Task<ResumenResponseDto?> ResumenAdicionalAsync(long reliqId, CancellationToken cancellationToken) => Resumen("Adicional", reliqId);
    public Task<ResumenResponseDto?> ResumenRellenoAsync(long reliqId, CancellationToken cancellationToken) => Resumen("Relleno", reliqId);
    public Task<ResumenResponseDto?> ResumenApsAsync(long reliqId, CancellationToken cancellationToken) => Resumen("Aps", reliqId);

    public Task<AprobarReliquidacionResultadoDto> AprobarReliquidacionAsync(long reliqId, long usuarioId, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"Aprobar:{reliqId}:{usuarioId}");
        return Task.FromResult(new AprobarReliquidacionResultadoDto { Mensaje = Mensaje });
    }

    public Task<string?> EstadoReliquidacionAsync(long reliqId, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"Estado:{reliqId}");
        return Task.FromResult(Estado);
    }
}
