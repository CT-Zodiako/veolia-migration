using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Veolia.Api.Tests;

public sealed class Sui853ReadmodelsContractTests(AuthApiSmokeFactory factory) : IClassFixture<AuthApiSmokeFactory>
{
    // SUI853 routes were anonymous in the legacy backend; they now require a verified token
    // (see ApiRouteProtectionContractTests for the 403/401 contract).
    private readonly HttpClient client = CreateAuthenticatedClient(factory);

    private static HttpClient CreateAuthenticatedClient(AuthApiSmokeFactory factory)
    {
        var authenticatedClient = factory.CreateClient();
        authenticatedClient.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build());
        return authenticatedClient;
    }

    [Fact]
    public async Task RQ_APS_SUI_01_VcfgApsEmpresa_WithToken_Returns200Envelope()
    {
        var response = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/vcfgapsempresa", new { });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, payload.GetProperty("status").GetInt32());
        Assert.Equal(JsonValueKind.Array, payload.GetProperty("data").ValueKind);
        Assert.True(payload.GetProperty("data")[0].TryGetProperty("TCFG_APS_ID", out _));
    }

    [Fact]
    public async Task RQ_APS_SUI_01_VcfgApsEmpresa_WhenRepositoryFails_ReturnsGlobalHandlerEnvelope()
    {
        factory.Sui853Repository.FailNextEmpresa();

        var response = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/vcfgapsempresa", new { });
        var payload = await ReadJsonAsync(response);

        // odd/tasks/oracle-error-context.md S6: the global handler answers instead of the legacy { status: 500, data: "Error" }.
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("error", payload.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Object, payload.GetProperty("data").ValueKind);
        Assert.Equal("Ocurrió un error procesando la solicitud.", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RQ_APS_SUI_02_VcfgApsDocumento_Returns200Envelope()
    {
        var response = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/vcfgapsdocumento", new { });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, payload.GetProperty("status").GetInt32());
        Assert.Equal(JsonValueKind.Array, payload.GetProperty("data").ValueKind);
        Assert.True(payload.GetProperty("data")[0].TryGetProperty("NOMFORMATO", out _));
    }

    [Fact]
    public async Task RQ_APS_SUI_02_VcfgApsDocumento_WhenRepositoryFails_ReturnsGlobalHandlerEnvelope()
    {
        factory.Sui853Repository.FailNextDocumento();

        var response = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/vcfgapsdocumento", new { });
        var payload = await ReadJsonAsync(response);

        // odd/tasks/oracle-error-context.md S6: the global handler answers instead of the legacy { status: 500, data: "Error" }.
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("error", payload.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Object, payload.GetProperty("data").ValueKind);
        Assert.Equal("Ocurrió un error procesando la solicitud.", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RQ_APS_SUI_03_TcfgAps_Returns200EnvelopeAndOrderedData()
    {
        var response = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/tcfgAps", new { });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, payload.GetProperty("status").GetInt32());
        Assert.Equal(JsonValueKind.Array, payload.GetProperty("data").ValueKind);
        Assert.Equal("APS Centro", payload.GetProperty("data")[0].GetProperty("NOMBRE_APS").GetString());
        Assert.Equal("APS Norte", payload.GetProperty("data")[1].GetProperty("NOMBRE_APS").GetString());
    }

    [Fact]
    public async Task RQ_APS_SUI_03_TcfgAps_WhenRepositoryFails_ReturnsGlobalHandlerEnvelope()
    {
        factory.Sui853Repository.FailNextTcfg();

        var response = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/tcfgAps", new { });
        var payload = await ReadJsonAsync(response);

        // odd/tasks/oracle-error-context.md S6: the global handler answers instead of the legacy { status: 500, data: "Error" }.
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("error", payload.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Object, payload.GetProperty("data").ValueKind);
        Assert.Equal("Ocurrió un error procesando la solicitud.", payload.GetProperty("message").GetString());
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }
}
