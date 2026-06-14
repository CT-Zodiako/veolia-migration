using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Veolia.Api.Tests;

public sealed class ProyeccionesContractSmokeTests(AuthApiSmokeFactory factory) : IClassFixture<AuthApiSmokeFactory>
{
    private readonly HttpClient client = factory.CreateClient();

    [Fact]
    public async Task RQ_PROY_01_Consulta_WithoutToken_Returns403()
    {
        var response = await client.PostAsJsonAsync("/api/v1/proyecciones/consulta", new { apsaId = 1, anno = 2025, mes = 4 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RQ_PROY_01_Consulta_WithToken_ReturnsArrayShape()
    {
        var response = await PostWithTokenAsync("/api/v1/proyecciones/consulta", new { apsaId = 1, anno = 2025, mes = 4 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.GetProperty("status").GetBoolean());
        Assert.Equal(JsonValueKind.Array, payload.GetProperty("data").ValueKind);
    }

    [Fact]
    public async Task RQ_PROY_02_Crear_WithToken_ReturnsSuccess()
    {
        var response = await PostWithTokenAsync("/api/v1/proyecciones/crear", new
        {
            apsaId = 1,
            proyNombre = "Proyección Test",
            proyAnnoDes = 2025,
            proyMesDes = 1,
            proyAnnoHas = 2026,
            proyMesHas = 12
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.GetProperty("status").GetBoolean());
        Assert.True(payload.GetProperty("data").GetProperty("success").GetBoolean());
    }

    [Fact]
    public async Task RQ_PROY_03_ConsultaProy_WithToken_ReturnsDetail()
    {
        var response = await PostWithTokenAsync("/api/v1/proyecciones/consultaproy", new { id = 1 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.GetProperty("status").GetBoolean());
        Assert.True(payload.GetProperty("data").TryGetProperty("proyId", out _));
    }

    [Fact]
    public async Task RQ_PROY_04_Editar_WithToken_ReturnsSuccess()
    {
        var response = await PutWithTokenAsync("/api/v1/proyecciones/editar/1", new
        {
            proyNombre = "Proyección Editada",
            proyAnnoDes = 2025,
            proyMesDes = 1,
            proyAnnoHas = 2026,
            proyMesHas = 12
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.GetProperty("status").GetBoolean());
    }

    [Fact]
    public async Task RQ_PROY_05_Eliminar_WithToken_ReturnsSuccess()
    {
        var response = await DeleteWithTokenAsync("/api/v1/proyecciones/eliminar/1");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.GetProperty("status").GetBoolean());
    }

    [Fact]
    public async Task RQ_PROY_06_LineaTiempo_WithToken_ReturnsArray()
    {
        var response = await PostWithTokenAsync("/api/v1/proyecciones/consultabyid", new { id = 1 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.GetProperty("status").GetBoolean());
        Assert.Equal(JsonValueKind.Array, payload.GetProperty("data").ValueKind);
    }

    [Fact]
    public async Task RQ_PROY_07_EjecutarProyectar_WithToken_ReturnsResult()
    {
        var response = await PostWithTokenAsync("/api/v1/proyecciones/ejecutarproyectar", new { proyId = 1, apsaId = 1 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.GetProperty("status").GetBoolean());
        Assert.True(payload.GetProperty("data").GetProperty("success").GetBoolean());
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

    private async Task<HttpResponseMessage> DeleteWithTokenAsync(string url)
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
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
