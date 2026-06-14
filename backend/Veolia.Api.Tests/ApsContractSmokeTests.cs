using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Veolia.Api.Tests;

public sealed class ApsContractSmokeTests(AuthApiSmokeFactory factory) : IClassFixture<AuthApiSmokeFactory>
{
    private readonly HttpClient client = factory.CreateClient();

    [Fact]
    public async Task RQ_APS_CONF_01_Consultageneral_WithoutToken_Returns403()
    {
        var response = await client.PostAsJsonAsync("/api/v1/aps/consultageneral", new { });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RQ_APS_CONF_01_Consultageneral_WithToken_ReturnsArrayShape()
    {
        var response = await PostWithTokenAsync("/api/v1/aps/consultageneral", new { });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload.GetArrayLength() >= 2);
        Assert.True(payload[0].TryGetProperty("APSA_ID", out _));
        Assert.True(payload[0].TryGetProperty("APSA_NOMAPS", out _));
        Assert.True(payload[0].TryGetProperty("APSA_RESOLUCION", out _));
        Assert.True(payload[0].TryGetProperty("APSA_PROPIO", out _));
        Assert.True(payload[0].TryGetProperty("APSA_SOLORELL", out _));
        Assert.True(payload[0].TryGetProperty("APSA_ESTADO", out _));
        Assert.True(payload[0].TryGetProperty("APSA_VIAT", out _));
        Assert.True(payload[0].TryGetProperty("APSA_IDSUI", out _));
        Assert.True(string.CompareOrdinal(
            payload[0].GetProperty("APSA_NOMAPS").GetString(),
            payload[1].GetProperty("APSA_NOMAPS").GetString()) <= 0);
    }

    [Fact]
    public async Task RQ_APS_CONF_02_ConsultaAps_WithToken_ReturnsArrayShape()
    {
        var response = await PostWithTokenAsync("/api/v1/aps/consultaaps", new { aps = 1 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Equal(1, payload.GetArrayLength());
        Assert.Equal(1, payload[0].GetProperty("APSA_ID").GetInt32());
        Assert.True(payload[0].TryGetProperty("APSA_NOMAPS", out _));
    }

    [Fact]
    public async Task RQ_APS_CONF_02_ConsultaAps_InvalidId_Returns500LegacyError()
    {
        var response = await PostWithTokenAsync("/api/v1/aps/consultaaps", new { aps = 0 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("Error", payload.GetProperty("data").GetString());
    }

    [Fact]
    public async Task RQ_APS_CONF_02_ConsultaAps_NotFound_ReturnsEmptyArray()
    {
        var response = await PostWithTokenAsync("/api/v1/aps/consultaaps", new { aps = 9999 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Equal(0, payload.GetArrayLength());
    }

    [Fact]
    public async Task RQ_APS_CONF_03_Crear_WithToken_Returns200AndObject()
    {
        var response = await PostWithTokenAsync("/api/v1/aps/crear", new
        {
            nombre = "APS Centro",
            idsui = 101,
            resolucion = 2024,
            propio = 1,
            relleno = 0,
            estado = 1,
            iat = 0
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Object, payload.ValueKind);
        Assert.True(payload.TryGetProperty("rowsAffected", out _));
        Assert.Equal(1, payload.GetProperty("rowsAffected").GetInt32());
    }

    [Fact]
    public async Task RQ_APS_CONF_03_Crear_InvalidPayload_Returns400()
    {
        var response = await PostWithTokenAsync("/api/v1/aps/crear", new
        {
            idsui = 101,
            resolucion = 2024,
            propio = 1,
            relleno = 0,
            estado = 1,
            iat = 0
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(400, payload.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task RQ_APS_CONF_03_Crear_WhenRepositoryFails_Returns500LegacyError()
    {
        var response = await PostWithTokenAsync("/api/v1/aps/crear", new
        {
            nombre = "__SQL_ERROR__",
            idsui = 101,
            resolucion = 2024,
            propio = 1,
            relleno = 0,
            estado = 1,
            iat = 0
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("Error", payload.GetProperty("data").GetString());
    }

    [Fact]
    public async Task RQ_APS_CONF_03_Editar_WithToken_Returns200AndObject()
    {
        var response = await PutWithTokenAsync("/api/v1/aps/editar/1", new
        {
            nombre = "APS Centro Editada",
            idsui = 101,
            resolucion = 2025,
            propio = 1,
            relleno = 1,
            estado = 1,
            iat = 1
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Object, payload.ValueKind);
        Assert.True(payload.TryGetProperty("rowsAffected", out _));
        Assert.Equal(1, payload.GetProperty("rowsAffected").GetInt32());
    }

    [Fact]
    public async Task RQ_APS_CONF_03_Editar_IdInexistente_ReturnsRowsAffectedZero()
    {
        var response = await PutWithTokenAsync("/api/v1/aps/editar/4040", new
        {
            nombre = "APS Inexistente",
            idsui = 101,
            resolucion = 2025,
            propio = 1,
            relleno = 1,
            estado = 1,
            iat = 1
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, payload.GetProperty("rowsAffected").GetInt32());
    }

    [Fact]
    public async Task RQ_APS_CONF_03_Editar_WhenRepositoryFails_Returns500LegacyError()
    {
        var response = await PutWithTokenAsync("/api/v1/aps/editar/5000", new
        {
            nombre = "APS Error",
            idsui = 101,
            resolucion = 2025,
            propio = 1,
            relleno = 1,
            estado = 1,
            iat = 1
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("Error", payload.GetProperty("data").GetString());
    }

    [Fact]
    public async Task RQ_APS_CONF_04_GetAps_WithToken_ReturnsArrayShape()
    {
        var response = await GetWithTokenAsync("/api/v1/aps");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload.GetArrayLength() >= 1);
        Assert.True(payload[0].TryGetProperty("APSA_ID", out _));
        Assert.True(payload[0].TryGetProperty("APSA_NOMAPS", out _));
    }

    [Fact]
    public async Task RQ_APS_CONF_04_GetAps_WithInvalidToken_Returns401()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/aps");
        request.Headers.Add("x-access-token", "invalid-token");

        var response = await client.SendAsync(request);
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RQ_APS_CONF_04_GetAps_UserWithoutAssignments_ReturnsEmptyArray()
    {
        var response = await GetWithTokenAsync("/api/v1/aps", BuildJwtToken(sisuId: 404));
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Equal(0, payload.GetArrayLength());
    }

    [Fact]
    public async Task RQ_APS_CONF_04_GetAps_WhenRepositoryFails_Returns500LegacyError()
    {
        var response = await GetWithTokenAsync("/api/v1/aps", BuildJwtToken(sisuId: 500));
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("Error", payload.GetProperty("data").GetString());
    }

    [Fact]
    public async Task RQ_APS_CONF_05_UsuarioPorAps_WithoutToken_RemainsUnprotected()
    {
        var response = await client.PostAsJsonAsync("/api/v1/aps/usuarioPorAPS", new { aps = 1 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Equal(1, payload.GetArrayLength());
        Assert.True(payload[0].TryGetProperty("SISU_ID", out _));
        Assert.True(payload[0].TryGetProperty("SISU_CORREO", out _));
    }

    [Fact]
    public async Task RQ_APS_CONF_05_UsuarioPorAps_InvalidAps_Returns500LegacyError()
    {
        var response = await client.PostAsJsonAsync("/api/v1/aps/usuarioPorAPS", new { aps = 0 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("Error", payload.GetProperty("data").GetString());
    }

    [Fact]
    public async Task RQ_APS_CONF_05_UsuarioPorAps_NoUsers_ReturnsEmptyArray()
    {
        var response = await client.PostAsJsonAsync("/api/v1/aps/usuarioPorAPS", new { aps = 404 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Equal(0, payload.GetArrayLength());
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
        return await GetWithTokenAsync(url, BuildJwtToken());
    }

    private async Task<HttpResponseMessage> GetWithTokenAsync(string url, string token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
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
