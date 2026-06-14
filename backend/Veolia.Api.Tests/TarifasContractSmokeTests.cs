using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Veolia.Api.Tests;

public sealed class TarifasContractSmokeTests(AuthApiSmokeFactory factory) : IClassFixture<AuthApiSmokeFactory>
{
    private readonly HttpClient client = factory.CreateClient();

    [Fact]
    public async Task RQ_TARIFAS_01_Base_WithoutToken_Returns403()
    {
        var response = await client.PostAsJsonAsync("/api/v1/tarifas", new { aps = 1, anno = 2026, mes = 4 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RQ_TARIFAS_01_Base_WithInvalidToken_Returns401()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/tarifas")
        {
            Content = JsonContent.Create(new { aps = 1, anno = 2026, mes = 4 })
        };
        request.Headers.Add("x-access-token", "invalid-token");

        var response = await client.SendAsync(request);
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RQ_TARIFAS_01_Base_WithToken_ReturnsArrayShape()
    {
        var response = await PostWithTokenAsync("/api/v1/tarifas", new { aps = 1, anno = 2026, mes = 4 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload.GetArrayLength() >= 1);
        Assert.True(payload[0].TryGetProperty("APSA_ID", out _));
        Assert.True(payload[0].TryGetProperty("TARI_ANNO", out _));
        Assert.True(payload[0].TryGetProperty("TARI_MES", out _));
    }

    [Fact]
    public async Task RQ_TARIFAS_02_ConsultaGeneral_IgnoresApsAndKeepsPeriodBehavior()
    {
        var token = BuildJwtToken();

        var responseA = await PostWithTokenAsync("/api/v1/tarifas/consultageneral", new { aps = 1, anno = 2026, mes = 4 }, token);
        var responseB = await PostWithTokenAsync("/api/v1/tarifas/consultageneral", new { aps = 99999, anno = 2026, mes = 4 }, token);

        var payloadA = await ReadJsonAsync(responseA);
        var payloadB = await ReadJsonAsync(responseB);

        Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        Assert.Equal(JsonValueKind.Array, payloadA.ValueKind);
        Assert.Equal(JsonValueKind.Array, payloadB.ValueKind);
        Assert.Equal(payloadA.GetArrayLength(), payloadB.GetArrayLength());
    }

    [Fact]
    public async Task RQ_TARIFAS_03_Tarxcom_WithToken_ReturnsArrayShape()
    {
        var response = await PostWithTokenAsync("/api/v1/tarifas/tarxcom", new { aps = 1, anno = 2026, mes = 4 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload.GetArrayLength() >= 1);
        Assert.True(payload[0].TryGetProperty("TACO_CONCEPTO", out _));
        Assert.True(payload[0].TryGetProperty("TACO_VALOR", out _));
    }

    [Fact]
    public async Task RQ_TARIFAS_03_Tarxcom_EmptyDataset_Returns200WithEmptyArray()
    {
        var response = await PostWithTokenAsync("/api/v1/tarifas/tarxcom", new { aps = 7777, anno = 2026, mes = 4 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Equal(0, payload.GetArrayLength());
    }

    [Fact]
    public async Task RQ_TARIFAS_04_TarxcomGeneral_WithToken_ReturnsArrayShape()
    {
        var response = await PostWithTokenAsync("/api/v1/tarifas/tarxcomgeneral", new { anno = 2026, mes = 4 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload.GetArrayLength() >= 1);
        Assert.True(payload[0].TryGetProperty("apsa_nomaps", out _));
        Assert.True(payload[0].TryGetProperty("TACO_VALOR", out _));
    }

    [Fact]
    public async Task RQ_TARIFAS_05_BlacklistedToken_Returns401()
    {
        var token = BuildJwtToken();

        var preLogoutResponse = await PostWithTokenAsync("/api/v1/tarifas", new { aps = 1, anno = 2026, mes = 4 }, token);
        Assert.Equal(HttpStatusCode.OK, preLogoutResponse.StatusCode);

        var logoutResponse = await PostWithTokenAsync("/api/v1/auth/logout", new { }, token);
        Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);

        var postLogoutResponse = await PostWithTokenAsync("/api/v1/tarifas", new { aps = 1, anno = 2026, mes = 4 }, token);
        var postLogoutPayload = await ReadJsonAsync(postLogoutResponse);
        Assert.Equal(HttpStatusCode.Unauthorized, postLogoutResponse.StatusCode);
        Assert.Equal("No Autorizado!", postLogoutPayload.GetProperty("message").GetString());
    }

    private async Task<HttpResponseMessage> PostWithTokenAsync(string url, object body)
    {
        return await PostWithTokenAsync(url, body, BuildJwtToken());
    }

    private async Task<HttpResponseMessage> PostWithTokenAsync(string url, object body, string token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("x-access-token", token);
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
