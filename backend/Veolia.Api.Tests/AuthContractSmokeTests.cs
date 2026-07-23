using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Veolia.Api.Tests;

public sealed class AuthContractSmokeTests(AuthApiSmokeFactory factory) : IClassFixture<AuthApiSmokeFactory>
{
    private readonly HttpClient client = factory.CreateClient();

    [Fact]
    public async Task R_AUTH_09_ProtectedRoute_WithoutToken_Returns403MissingTokenMessage()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/getUserMenu", new { });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_09_ProtectedRoute_InvalidToken_Returns401UnauthorizedMessage()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/getUserMenu")
        {
            Content = JsonContent.Create(new { })
        };
        request.Headers.Add("x-access-token", "invalid-token");

        var response = await client.SendAsync(request);
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_01_Login_ReturnsLegacyContractShape()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { correo = "ada@veolia.com", pass = "secret", idSistema = 10 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, payload.GetProperty("status").GetInt32());
        Assert.Equal("OK", payload.GetProperty("message").GetString());
        Assert.True(payload.TryGetProperty("usuario", out _));
        Assert.Equal("header.payload.signature", payload.GetProperty("auth_token").GetString());
        Assert.True(payload.TryGetProperty("sistema", out _));
    }

    [Fact]
    public async Task R_AUTH_01b_SwitchSistema_WithToken_ReturnsNewTokenAndSistema()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/switchSistema", new { idSistema = 20 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, payload.GetProperty("status").GetInt32());
        Assert.Equal("header.payload.signature", payload.GetProperty("auth_token").GetString());
        Assert.True(payload.TryGetProperty("sistema", out var sistema));
        Assert.Equal(20, sistema.GetProperty("SIST_ID").GetInt32());
    }

    [Fact]
    public async Task R_AUTH_01b_SwitchSistema_WithoutToken_Returns403MissingTokenMessage()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/switchSistema", new { idSistema = 20 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_01b_SwitchSistema_WhenUserHasNoAccessToTargetSistema_Returns404()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/switchSistema", new { idSistema = 999 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(404, payload.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task R_AUTH_01_GetSistemasByCorreo_ReturnsArrayShape()
    {
        var response = await client.GetAsync("/api/v1/auth/getSistemasByCorreo?correo=ada@veolia.com");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload.GetArrayLength() > 0);
        Assert.True(payload[0].TryGetProperty("SIST_ID", out _));
        Assert.True(payload[0].TryGetProperty("SIST_NOMBRE", out _));
    }

    [Fact]
    public async Task R_AUTH_03_GetUserMenu_WithToken_ReturnsMenuIdArray()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/getUserMenu", new { });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload[0].TryGetProperty("MENU_ID", out _));
    }

    [Fact]
    public async Task R_AUTH_05_GetAllUsers_WithToken_ReturnsUserArray()
    {
        var response = await GetWithTokenAsync("/api/v1/auth/getAllUsers");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload[0].TryGetProperty("SISU_CORREO", out _));
    }

    [Fact]
    public async Task R_AUTH_06_GetApsAsignadas_WithToken_ReturnsAsignadasAndSinAsignar()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/getApsAsignadas", new { id = 101 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.TryGetProperty("asignadas", out var asignadas));
        Assert.True(payload.TryGetProperty("sinAsignar", out var sinAsignar));
        Assert.Equal(JsonValueKind.Array, asignadas.ValueKind);
        Assert.Equal(JsonValueKind.Array, sinAsignar.ValueKind);
    }

    [Fact]
    public async Task R_AUTH_06_GetApsAsignadas_WithoutToken_Returns403MissingTokenMessage()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/getApsAsignadas", new { id = 101 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_06_GetApsAsignadas_WhenRepositoryFails_Returns500ParityErrorShape()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/getApsAsignadas", new { id = 500 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(500, payload.GetProperty("status").GetInt32());
        Assert.Equal("Simulated getApsAsignadas failure", payload.GetProperty("response").GetString());
    }

    [Fact]
    public async Task R_AUTH_08_GetMenuUserOptions_WithToken_ReturnsArray()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/getMenuUserOptions", new { id = 101 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
    }

    [Fact]
    public async Task R_AUTH_07_GetSistemasPorUsuario_WithoutToken_IsUnprotectedAndReturnsShape()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/getSistemasPorUsuario", new { correo = "ada@veolia.com" });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.TryGetProperty("asignados", out _));
        Assert.True(payload.TryGetProperty("sinAsignar", out _));
    }

    [Fact]
    public async Task R_AUTH_08_GetMenuByUser_WithoutToken_IsUnprotectedAndReturnsArray()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/getMenuByUser", new { idSistema = 10, sisuId = 101 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
    }

    [Fact]
    public async Task R_AUTH_02_Logout_ThenSameTokenOnProtectedRoute_Returns401DeadToken()
    {
        var token = BuildJwtToken();

        var preLogoutResponse = await PostWithTokenAsync("/api/v1/auth/getUserMenu", new { }, token);
        Assert.Equal(HttpStatusCode.OK, preLogoutResponse.StatusCode);

        var logoutResponse = await PostWithTokenAsync("/api/v1/auth/logout", new { }, token);
        var logoutPayload = await ReadJsonAsync(logoutResponse);
        Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);
        Assert.True(logoutPayload.TryGetProperty("rowsAffected", out _));

        var postLogoutResponse = await PostWithTokenAsync("/api/v1/auth/getUserMenu", new { }, token);
        var postLogoutPayload = await ReadJsonAsync(postLogoutResponse);
        Assert.Equal(HttpStatusCode.Unauthorized, postLogoutResponse.StatusCode);
        Assert.Equal("No Autorizado!", postLogoutPayload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_04_SetChangePass_WithToken_ReturnsLegacyContractAnd200()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/setChangePass", new
        {
            oldPass = "old-pass",
            newPass = "new-pass",
            confirmPass = "new-pass"
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, payload.GetProperty("status").GetInt32());
        Assert.Equal("OK", payload.GetProperty("response").GetString());
        Assert.Equal("Contraseña actualizada", payload.GetProperty("msg").GetString());
    }

    [Fact]
    public async Task R_AUTH_05_RegistroAndUpdateUsuario_DuplicateEmail_Returns400()
    {
        var registroResponse = await PostWithTokenAsync("/api/v1/auth/registro", new
        {
            nombre = "Ada",
            apellido = "Lovelace",
            correo = "duplicate@veolia.com",
            password = "secret",
            estado = 1
        });
        var registroPayload = await ReadJsonAsync(registroResponse);

        Assert.Equal(HttpStatusCode.BadRequest, registroResponse.StatusCode);
        Assert.Equal("El correo ya se encuentra registrado", registroPayload.GetProperty("message").GetString());

        var updateResponse = await PostWithTokenAsync("/api/v1/auth/updateUsuario", new
        {
            id = 101,
            nombre = "Ada",
            apellido = "Lovelace",
            correo = "duplicate@veolia.com",
            estado = 1
        });
        var updatePayload = await ReadJsonAsync(updateResponse);

        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        Assert.Equal("El correo ya se encuentra registrado", updatePayload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_06_SetApsxUsuario_WithToken_Returns200_AndAcceptsEmptySuccessBodyParity()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/setApsxUsuario", new
        {
            id = 101,
            outAps = new[] { 1L },
            inAps = new[] { 2L }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var rawBody = await response.Content.ReadAsStringAsync();
        if (!string.IsNullOrWhiteSpace(rawBody))
        {
            using var doc = JsonDocument.Parse(rawBody);
            Assert.True(
                doc.RootElement.ValueKind is JsonValueKind.Object or JsonValueKind.Array,
                "When body is present, it should still be valid JSON parity payload.");
        }
    }

    [Fact]
    public async Task R_AUTH_06_SetApsxUsuario_WithoutToken_Returns403MissingTokenMessage()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/setApsxUsuario", new
        {
            id = 101,
            outAps = Array.Empty<long>(),
            inAps = Array.Empty<long>()
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_06_SetApsxUsuario_WhenRepositoryFails_Returns500ParityErrorShape()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/setApsxUsuario", new
        {
            id = 500,
            outAps = new[] { 1L },
            inAps = new[] { 2L }
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(500, payload.GetProperty("status").GetInt32());
        Assert.Equal("Simulated setApsxUsuario failure", payload.GetProperty("response").GetString());
    }

    [Fact]
    public async Task R_AUTH_08_UptUserMenu_WithToken_Returns200AndDmlLikePayload()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/uptUserMenu", new
        {
            id = 101,
            options = new[] { 11L, 22L },
            sistema = 10
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.TryGetProperty("rowsAffected", out var rowsAffected));
        Assert.True(rowsAffected.GetInt32() >= 1);
    }

    private async Task<HttpResponseMessage> PostWithTokenAsync(string url, object body)
        => await PostWithTokenAsync(url, body, BuildJwtToken());

    private async Task<HttpResponseMessage> PostWithTokenAsync(string url, object body, string token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("x-access-token", token);
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

    private static string BuildJwtToken()
    {
        var header = Base64UrlEncode("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        var payload = Base64UrlEncode($"{{\"SISU_ID\":101,\"idSistema\":10,\"jti\":\"{Guid.NewGuid():N}\"}}");
        return $"{header}.{payload}.signature";
    }

    private static string Base64UrlEncode(string plain)
        => Convert.ToBase64String(Encoding.UTF8.GetBytes(plain))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
}
