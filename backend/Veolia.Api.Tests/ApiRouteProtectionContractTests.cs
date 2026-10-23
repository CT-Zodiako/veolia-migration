using System.Net;
using System.Text;
using System.Text.Json;

namespace Veolia.Api.Tests;

/// <summary>
/// Every /api/v1 route requires a verified token, including controllers that the
/// per-prefix middleware list used to miss. general/usuarios/trna/tafna were protected
/// by legacy authJwt.verificarToken; Reliquidaciones and SUI853 are TO-BE hardening.
/// </summary>
public sealed class ApiRouteProtectionContractTests(AuthApiSmokeFactory factory) : IClassFixture<AuthApiSmokeFactory>
{
    private readonly HttpClient client = factory.CreateClient();

    public static TheoryData<string, string> PreviouslyUnverifiedRoutes => new()
    {
        { "GET", "/api/v1/general/consultauso" },
        { "POST", "/api/v1/usuarios/usuagraf" },
        { "POST", "/api/v1/trna/trna" },
        { "POST", "/api/v1/tafna/tafna" },
        { "POST", "/api/v1/reliqCrear/crear" },
        { "POST", "/api/v1/reliqCargue/compararCostos" },
        { "POST", "/api/v1/reliqTarificador/resumenUsuarios" },
        { "POST", "/api/v1/sui853/general/fac" },
        { "POST", "/api/v1/sui853/cft/cft" },
        { "POST", "/api/v1/sui853/cdft/cdft" },
        { "POST", "/api/v1/sui853/comercial/residuosGeneradosInforme" },
        { "POST", "/api/v1/sui853/operaciones/residuosGenerados" },
        { "POST", "/api/v1/sui853Configuracion/vcfgapsempresa" },
        { "POST", "/api/v1/sui853Configuracion/tablasSui" },
        // Anonymous in the legacy backend; token required since S10 "Exigir token en las 6 anónimas".
        { "POST", "/api/v1/auth/registro" },
        { "POST", "/api/v1/auth/getSistemasPorUsuario" },
        { "POST", "/api/v1/auth/asignarSistema" },
        { "POST", "/api/v1/auth/getMenuByUser" },
        { "GET", "/api/v1/auth/allSistemas" },
        { "POST", "/api/v1/aps/usuarioPorAPS" }
    };

    [Theory]
    [MemberData(nameof(PreviouslyUnverifiedRoutes))]
    public async Task Route_WithExpiredToken_Returns401(string method, string url)
    {
        var response = await client.SendAsync(BuildRequest(method, url, TestJwt.BuildExpired()));
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
    }

    // Only the pre-login routes stay anonymous: they reach the controller without a token
    // (the stub login repository answers), never the 403 of the token middleware.
    [Theory]
    [InlineData("/api/v1/auth/login")]
    [InlineData("/api/v1/auth/validate-credentials")]
    public async Task PreLoginRoute_WithoutToken_StaysAnonymous(string url)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent("{\"correo\":\"ada@veolia.com\",\"pass\":\"secret\",\"idSistema\":10}", Encoding.UTF8, "application/json")
        };

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(PreviouslyUnverifiedRoutes))]
    public async Task Route_WithoutToken_Returns403(string method, string url)
    {
        var response = await client.SendAsync(BuildRequest(method, url, token: null));
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Theory]
    [MemberData(nameof(PreviouslyUnverifiedRoutes))]
    public async Task Route_WithUnsignedToken_Returns401(string method, string url)
    {
        var response = await client.SendAsync(BuildRequest(method, url, TestJwt.BuildUnsigned()));
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
    }

    // Deny by default: unknown/future routes, case variants and near-misses of an anonymous
    // route (trailing slash) must never bypass the middleware.
    [Theory]
    [InlineData("GET", "/api/v1/nonexistent")]
    [InlineData("GET", "/API/V1/general/consultauso")]
    [InlineData("GET", "/api/v1/auth/allSistemas/")]
    public async Task EdgePath_WithoutToken_Returns403(string method, string url)
    {
        var response = await client.SendAsync(BuildRequest(method, url, token: null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Health_OutsideApiV1_StaysAnonymousForDeploySmokeCheck()
    {
        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CorsPreflight_OnProtectedRoute_SucceedsBeforeTokenCheck()
    {
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/general/consultauso");
        request.Headers.Add("Origin", "http://localhost:4200");
        request.Headers.Add("Access-Control-Request-Method", "POST");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("http://localhost:4200", response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    private static HttpRequestMessage BuildRequest(string method, string url, string? token)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), url);
        if (method != "GET")
        {
            request.Content = new StringContent("{}", Encoding.UTF8, "application/json");
        }

        if (token is not null)
        {
            request.Headers.Add("x-access-token", token);
        }

        return request;
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }
}
