using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Veolia.Api.Tests;

public sealed class EmpresasContractSmokeTests(AuthApiSmokeFactory factory) : IClassFixture<AuthApiSmokeFactory>
{
    private readonly HttpClient client = factory.CreateClient();

    [Fact]
    public async Task RQ_EMPRESAS_01_GetAll_WithoutToken_Returns403()
    {
        var response = await client.GetAsync("/api/v1/empresas");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RQ_EMPRESAS_01_GetAll_WithInvalidToken_Returns401()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/empresas");
        request.Headers.Add("x-access-token", "invalid-token");

        var response = await client.SendAsync(request);
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RQ_EMPRESAS_01_GetAll_WithToken_ReturnsArrayShape()
    {
        var response = await GetWithTokenAsync("/api/v1/empresas");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload.GetArrayLength() >= 1);
        Assert.True(payload[0].TryGetProperty("EMPR_EMPR", out _));
        Assert.True(payload[0].TryGetProperty("EMPR_NOMBRE", out _));
        Assert.True(payload[0].TryGetProperty("EMPR_ESTADO", out _));
        Assert.True(payload[0].TryGetProperty("EMPR_PROPIA", out _));
    }

    [Fact]
    public async Task RQ_EMPRESAS_02_Crear_WithToken_ReturnsRowsAffected()
    {
        var response = await PostWithTokenAsync("/api/v1/empresas/crear", new
        {
            nombre = "Empresa Nueva",
            estado = 1,
            propia = 1,
            nuap = "NUAP-900"
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, payload.GetProperty("rowsAffected").GetInt32());
    }

    [Fact]
    public async Task RQ_EMPRESAS_03_ConsultarPropias_WithToken_ReturnsArray()
    {
        var response = await PostWithTokenAsync("/api/v1/empresas/consultarpropias", new { aps = 1, propia = 1 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload.GetArrayLength() >= 1);
        Assert.Equal(1, payload[0].GetProperty("EMPR_PROPIA").GetInt32());
    }

    [Fact]
    public async Task RQ_EMPRESAS_03_ConsultarPropias_WithoutMatches_ReturnsEmptyArray()
    {
        var response = await PostWithTokenAsync("/api/v1/empresas/consultarpropias", new { aps = 9999, propia = 1 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Equal(0, payload.GetArrayLength());
    }

    [Fact]
    public async Task RQ_EMPRESAS_04_ConsultaEmpr_WithToken_ReturnsArray()
    {
        var response = await PostWithTokenAsync("/api/v1/empresas/consultaempr", new { empr = 1 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Equal(1, payload.GetArrayLength());
        Assert.Equal(1, payload[0].GetProperty("EMPR_EMPR").GetInt32());
    }

    [Fact]
    public async Task RQ_EMPRESAS_04_ConsultaEmpr_NotFound_ReturnsEmptyArray()
    {
        var response = await PostWithTokenAsync("/api/v1/empresas/consultaempr", new { empr = 4040 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Equal(0, payload.GetArrayLength());
    }

    [Fact]
    public async Task RQ_EMPRESAS_05_Editar_WithToken_ReturnsRowsAffected()
    {
        var response = await PutWithTokenAsync("/api/v1/empresas/editar/1", new
        {
            nombre = "Empresa Editada",
            estado = 1,
            propia = 0,
            nuap = "NUAP-901"
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, payload.GetProperty("rowsAffected").GetInt32());
    }

    [Fact]
    public async Task RQ_EMPRESAS_05_Editar_NotFound_ReturnsRowsAffectedZero()
    {
        var response = await PutWithTokenAsync("/api/v1/empresas/editar/4040", new
        {
            nombre = "Empresa Inexistente",
            estado = 1,
            propia = 0,
            nuap = "NUAP-901"
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, payload.GetProperty("rowsAffected").GetInt32());
    }

    private async Task<HttpResponseMessage> PostWithTokenAsync(string url, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("x-access-token", BuildJwtToken());
        return await client.SendAsync(request);
    }

    private async Task<HttpResponseMessage> PutWithTokenAsync(string url, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("x-access-token", BuildJwtToken());
        return await client.SendAsync(request);
    }

    private async Task<HttpResponseMessage> GetWithTokenAsync(string url)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("x-access-token", BuildJwtToken());
        return await client.SendAsync(request);
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    private static string BuildJwtToken(long sisuId = 101, int idSistema = 10)
    {
        var header = Base64UrlEncode("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        var payload = Base64UrlEncode($"{{\"SISU_ID\":{sisuId},\"idSistema\":{idSistema},\"jti\":\"{Guid.NewGuid():N}\"}}");
        return $"{header}.{payload}.signature";
    }

    private static string Base64UrlEncode(string plain)
        => Convert.ToBase64String(Encoding.UTF8.GetBytes(plain))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
}
