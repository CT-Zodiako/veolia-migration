using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

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

    // Intentional TO-BE deviation (odd/tasks/login-systems-validation.md): the legacy route was
    // anonymous and allowed e-mail enumeration; pre-login lookup now goes through validate-credentials.
    [Fact]
    public async Task R_AUTH_01_GetSistemasByCorreo_WithoutToken_Returns403()
    {
        var response = await client.GetAsync("/api/v1/auth/getSistemasByCorreo?correo=ada@veolia.com");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_02_DeadTokenLookupFails_Returns401FailClosed()
    {
        // Isolated host: dropping the table must not affect the shared class fixture.
        using var isolatedFactory = new AuthApiSmokeFactory();
        using var isolatedClient = isolatedFactory.CreateClient();
        var connectionFactory = isolatedFactory.Services
            .GetRequiredService<Veolia.Api.Infrastructure.Data.IOracleConnectionFactory>();
        using (var connection = connectionFactory.CreateConnection())
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "DROP TABLE AUGE_DEADTOKEN;";
            command.ExecuteNonQuery();
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/getSistemasByCorreo?correo=ada@veolia.com");
        request.Headers.Add("x-access-token", TestJwt.Build());

        var response = await isolatedClient.SendAsync(request);
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_02_DeadTokenConnectionFails_Returns401FailClosed()
    {
        using var isolatedFactory = new AuthApiSmokeFactory().WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<Veolia.Api.Infrastructure.Data.IOracleConnectionFactory>();
                services.AddSingleton<Veolia.Api.Infrastructure.Data.IOracleConnectionFactory>(
                    new ThrowingOracleConnectionFactory());
            }));
        using var isolatedClient = isolatedFactory.CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/tarifas/resumen")
        {
            Content = JsonContent.Create(new { aps = 1, anno = 2026, mes = 4 })
        };
        request.Headers.Add("x-access-token", TestJwt.Build());

        var response = await isolatedClient.SendAsync(request);
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
    }

    private sealed class ThrowingOracleConnectionFactory : Veolia.Api.Infrastructure.Data.IOracleConnectionFactory
    {
        public System.Data.IDbConnection CreateConnection()
            => throw new InvalidOperationException("Simulated Oracle outage");
    }

    [Fact]
    public async Task R_AUTH_02_UnsignedToken_Returns401LikeLegacyJwtVerify()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/getSistemasByCorreo?correo=ada@veolia.com");
        request.Headers.Add("x-access-token", TestJwt.BuildUnsigned());

        var response = await client.SendAsync(request);
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_01_GetSistemasByCorreo_WithToken_ReturnsArrayShape()
    {
        var response = await GetWithTokenAsync("/api/v1/auth/getSistemasByCorreo?correo=ada@veolia.com");
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

    // TO-BE hardening (S10 "Exigir token en las 6 anónimas"): the legacy route was anonymous and
    // leaked sisuId + systems for any e-mail.
    [Fact]
    public async Task R_AUTH_07_GetSistemasPorUsuario_WithoutToken_Returns403AndDoesNotCallRepository()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/getSistemasPorUsuario", new { correo = "anonymous-07@veolia.com" });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
        Assert.DoesNotContain("GetSistemasPorUsuario:anonymous-07@veolia.com", factory.AsignacionesRepository.Calls);
    }

    [Fact]
    public async Task R_AUTH_07_GetSistemasPorUsuario_WithToken_ReturnsShape()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/getSistemasPorUsuario", new { correo = "ada@veolia.com" });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(payload.TryGetProperty("sisuId", out _));
        Assert.True(payload.TryGetProperty("asignados", out _));
        Assert.True(payload.TryGetProperty("sinAsignar", out _));
    }

    [Fact]
    public async Task R_AUTH_08_GetMenuByUser_WithoutToken_Returns403AndDoesNotCallRepository()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/getMenuByUser", new { idSistema = 10, sisuId = 9081 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
        Assert.DoesNotContain("GetMenuByUser:9081:10", factory.MenuRepository.Calls);
    }

    [Fact]
    public async Task R_AUTH_08_GetMenuByUser_WithToken_ReturnsArray()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/getMenuByUser", new { idSistema = 10, sisuId = 101 });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
    }

    [Fact]
    public async Task R_AUTH_05_Registro_WithoutToken_Returns403AndDoesNotCallRepository()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/registro", new
        {
            nombre = "Eve",
            apellido = "Anon",
            correo = "anonymous-05@veolia.com",
            password = "secret",
            estado = 1
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
        Assert.DoesNotContain("Registro:anonymous-05@veolia.com", factory.UsuariosRepository.Calls);
    }

    [Fact]
    public async Task R_AUTH_07_AsignarSistema_WithoutToken_Returns403AndDoesNotCallRepository()
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/asignarSistema", new
        {
            sisuId = 9071,
            asignados = new[] { 1L },
            noAsignados = Array.Empty<long>()
        });
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
        Assert.DoesNotContain("AsignarSistema:9071", factory.AsignacionesRepository.Calls);
    }

    [Fact]
    public async Task R_AUTH_07_AsignarSistema_WithToken_ReturnsLegacySuccessShape()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/asignarSistema", new
        {
            sisuId = 9072,
            asignados = new[] { 1L },
            noAsignados = Array.Empty<long>()
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("AsignarSistema:9072", factory.AsignacionesRepository.Calls);
    }

    [Fact]
    public async Task R_AUTH_08_AllSistemas_WithoutToken_Returns403()
    {
        var response = await client.GetAsync("/api/v1/auth/allSistemas");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task R_AUTH_08_AllSistemas_WithToken_ReturnsArray()
    {
        var response = await GetWithTokenAsync("/api/v1/auth/allSistemas");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.True(payload[0].TryGetProperty("SIST_ID", out _));
    }

    // Legacy jwt.verify enforced expiresIn; an expired token is rejected before the controller runs.
    [Fact]
    public async Task R_AUTH_09_ExpiredToken_Returns401AndDoesNotCallRepository()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/getMenuUserOptions", new { id = 9091 }, TestJwt.BuildExpired());
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
        Assert.DoesNotContain("GetMenuUserOptions:9091", factory.MenuRepository.Calls);
    }

    // Secure default: a token without exp never expires, so it is rejected.
    [Fact]
    public async Task R_AUTH_09_TokenWithoutExp_Returns401AndDoesNotCallRepository()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/getMenuUserOptions", new { id = 9092 }, TestJwt.BuildWithoutExp());
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
        Assert.DoesNotContain("GetMenuUserOptions:9092", factory.MenuRepository.Calls);
    }

    [Fact]
    public async Task R_AUTH_09_TokenWithFutureExp_IsAccepted()
    {
        var response = await PostWithTokenAsync("/api/v1/auth/getMenuUserOptions", new { id = 9093 }, TestJwt.Build());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("GetMenuUserOptions:9093", factory.MenuRepository.Calls);
    }

    // Login keeps issuing 12 h tokens; the middleware accepts them while valid and rejects them after.
    [Fact]
    public async Task R_AUTH_01_IssuedToken_Lasts12HoursAndExpiresAfterwards()
    {
        var issuedAt = DateTimeOffset.UtcNow;
        var token = Veolia.Api.Infrastructure.Auth.AuthJwt.Issue(TestJwt.Secret, 101, 10, issuedAt);

        var payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(token.Split('.')[1]));
        using var payloadDoc = JsonDocument.Parse(payloadJson);
        var claims = payloadDoc.RootElement;
        Assert.Equal(101, claims.GetProperty("SISU_ID").GetInt64());
        Assert.Equal(10, claims.GetProperty("idSistema").GetInt32());
        Assert.Equal(12 * 60 * 60, claims.GetProperty("exp").GetInt64() - claims.GetProperty("iat").GetInt64());

        var validResponse = await PostWithTokenAsync("/api/v1/auth/getUserMenu", new { }, token);
        Assert.Equal(HttpStatusCode.OK, validResponse.StatusCode);

        var staleToken = Veolia.Api.Infrastructure.Auth.AuthJwt.Issue(TestJwt.Secret, 101, 10, issuedAt.AddHours(-12).AddSeconds(-1));
        var staleResponse = await PostWithTokenAsync("/api/v1/auth/getUserMenu", new { }, staleToken);
        var stalePayload = await ReadJsonAsync(staleResponse);
        Assert.Equal(HttpStatusCode.Unauthorized, staleResponse.StatusCode);
        Assert.Equal("No Autorizado!", stalePayload.GetProperty("message").GetString());
    }

    // R1: legacy INSERT (auth/controller.js) and the only DDL (AUGE_SISUSUARIO.sql) have no SISU_FECHA.
    [Fact]
    public void R_AUTH_05_RegistroInsert_WritesOnlyLegacyColumns()
    {
        var sql = Veolia.Api.Modules.Auth.Usuarios.UsuariosRepository.RegistroInsertSql;
        var columnList = sql[(sql.IndexOf('(') + 1)..sql.IndexOf(')')];
        var columns = columnList.Split(',').Select(column => column.Trim()).ToArray();

        Assert.Equal(
            ["SISU_ID", "SISU_NOMBRES", "SISU_APELLIDOS", "SISU_CORREO", "SISU_PASS", "SISU_ESTADO"],
            columns);
        Assert.DoesNotContain("SISU_FECHA", sql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("SYSDATE", sql, StringComparison.OrdinalIgnoreCase);
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var normalized = input.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(normalized.PadRight(normalized.Length + (4 - normalized.Length % 4) % 4, '='));
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
        => TestJwt.Build();
}
