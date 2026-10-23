using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Veolia.Api.Tests;

/// <summary>
/// Only user administrators manage users (S10 "Solo admins gestionan usuarios"). An
/// administrator is a caller whose token SISU_ID holds menu 204 "Usuarios" of system 1
/// (VEO-Regulator) in AUGE_USUAMENU, the same data getUserMenu reads. Rejected requests
/// return 403 and never reach the repository.
/// </summary>
public sealed class AuthAuthorizationContractTests(AuthApiSmokeFactory factory) : IClassFixture<AuthApiSmokeFactory>
{
    private const string NotAdminMessage = "No tiene permisos para administrar usuarios";
    private const long OtherUserId = 777;

    private readonly HttpClient client = factory.CreateClient();

    // Endpoints that act on another user's data or permissions. The expected call is the
    // repository call the request would make if it were allowed.
    public static TheoryData<string, string, object, string> AdminOnlyEndpoints => new()
    {
        { "POST", "/api/v1/auth/registro", new { nombre = "Eve", apellido = "Intruder", correo = "eve-403@veolia.com", password = "x", estado = 1 }, "Usuarios:Registro:eve-403@veolia.com" },
        { "POST", "/api/v1/auth/updateUsuario", new { id = OtherUserId, nombre = "Eve", apellido = "Intruder", correo = "eve@veolia.com", estado = 1 }, $"Usuarios:UpdateUsuario:{OtherUserId}" },
        { "GET", "/api/v1/auth/getAllUsers", new { }, "Usuarios:GetAllUsers" },
        { "POST", "/api/v1/auth/getUserbyId", new { id = OtherUserId }, $"Usuarios:GetUserById:{OtherUserId}" },
        { "POST", "/api/v1/auth/resetPass", new { id = OtherUserId }, $"Usuarios:ResetPass:{OtherUserId}" },
        { "POST", "/api/v1/auth/getApsAsignadas", new { id = OtherUserId }, $"Asignaciones:GetApsAsignadas:{OtherUserId}" },
        { "POST", "/api/v1/auth/setApsxUsuario", new { id = OtherUserId, outAps = new[] { 1L }, inAps = new[] { 2L } }, $"Asignaciones:SetApsxUsuario:{OtherUserId}" },
        { "POST", "/api/v1/auth/getSistemasPorUsuario", new { correo = "victim-403@veolia.com" }, "Asignaciones:GetSistemasPorUsuario:victim-403@veolia.com" },
        { "POST", "/api/v1/auth/asignarSistema", new { sisuId = OtherUserId, asignados = new[] { 1L }, noAsignados = Array.Empty<long>() }, $"Asignaciones:AsignarSistema:{OtherUserId}" },
        { "POST", "/api/v1/auth/getMenuByUser", new { idSistema = 1, sisuId = OtherUserId }, $"Menu:GetMenuByUser:{OtherUserId}:1" },
        { "POST", "/api/v1/auth/getMenuUserOptions", new { id = OtherUserId }, $"Menu:GetMenuUserOptions:{OtherUserId}" },
        { "POST", "/api/v1/auth/uptUserMenu", new { id = OtherUserId, options = new[] { 204L }, sistema = 1 }, $"Menu:UptUserMenu:{OtherUserId}" }
    };

    [Theory]
    [MemberData(nameof(AdminOnlyEndpoints))]
    public async Task AdminOnlyEndpoint_NonAdmin_Returns403AndDoesNotCallRepository(string method, string url, object body, string expectedCall)
    {
        // Tests in a class run sequentially; the admin case may already have recorded the call.
        var callsBefore = CountCalls(expectedCall);

        var response = await SendAsync(method, url, body, TestJwt.Build(TestJwt.NonAdminSisuId));
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(NotAdminMessage, payload.GetProperty("message").GetString());
        Assert.Equal(callsBefore, CountCalls(expectedCall));
    }

    [Theory]
    [MemberData(nameof(AdminOnlyEndpoints))]
    public async Task AdminOnlyEndpoint_Admin_ReachesRepository(string method, string url, object body, string expectedCall)
    {
        var response = await SendAsync(method, url, body, TestJwt.Build(TestJwt.AdminSisuId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(expectedCall, RecordedCalls());
    }

    // The admin check reads system 1 regardless of the system the caller is logged into.
    [Fact]
    public async Task AdminOnlyEndpoint_AdminLoggedIntoAnotherSystem_IsStillAdmin()
    {
        var response = await SendAsync("POST", "/api/v1/auth/uptUserMenu",
            new { id = 778, options = new[] { 11L }, sistema = 3 },
            TestJwt.Build(TestJwt.AdminSisuId, idSistema: 3));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Menu:UptUserMenu:778", RecordedCalls());
    }

    [Fact]
    public async Task AdminOnlyEndpoint_TokenWithoutSisuId_Returns401AndDoesNotCallRepository()
    {
        // Signed token without SISU_ID: authenticated by the middleware, unusable for authorization.
        var response = await SendAsync("POST", "/api/v1/auth/getSistemasPorUsuario",
            new { correo = "nosisu-401@veolia.com" }, TestJwtWithoutSisuId());
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("No Autorizado!", payload.GetProperty("message").GetString());
        Assert.DoesNotContain("Asignaciones:GetSistemasPorUsuario:nosisu-401@veolia.com", RecordedCalls());
    }

    // Self-service: a non-admin keeps access to the endpoints that act on their own account.
    public static TheoryData<string, string, object, string> SelfServiceEndpoints => new()
    {
        { "POST", "/api/v1/auth/getUserMenu", new { }, $"Menu:GetUserMenu:{TestJwt.NonAdminSisuId}:10" },
        { "POST", "/api/v1/auth/setChangePass", new { oldPass = "a", newPass = "b", confirmPass = "b" }, $"Usuarios:SetChangePass:{TestJwt.NonAdminSisuId}" },
        { "POST", "/api/v1/auth/getApsAsignadas", new { id = TestJwt.NonAdminSisuId }, $"Asignaciones:GetApsAsignadas:{TestJwt.NonAdminSisuId}" },
        { "POST", "/api/v1/auth/getUserbyId", new { id = TestJwt.NonAdminSisuId }, $"Usuarios:GetUserById:{TestJwt.NonAdminSisuId}" },
        { "POST", "/api/v1/auth/resetPass", new { id = TestJwt.NonAdminSisuId }, $"Usuarios:ResetPass:{TestJwt.NonAdminSisuId}" },
        { "POST", "/api/v1/auth/getMenuByUser", new { idSistema = 10, sisuId = TestJwt.NonAdminSisuId }, $"Menu:GetMenuByUser:{TestJwt.NonAdminSisuId}:10" },
        { "POST", "/api/v1/auth/getMenuUserOptions", new { id = TestJwt.NonAdminSisuId }, $"Menu:GetMenuUserOptions:{TestJwt.NonAdminSisuId}" }
    };

    [Theory]
    [MemberData(nameof(SelfServiceEndpoints))]
    public async Task SelfServiceEndpoint_NonAdminOnOwnAccount_Returns200(string method, string url, object body, string expectedCall)
    {
        var response = await SendAsync(method, url, body, TestJwt.Build(TestJwt.NonAdminSisuId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(expectedCall, RecordedCalls());
    }

    [Theory]
    [InlineData("GET", "/api/v1/auth/getSistemasByCorreo?correo=ada@veolia.com")]
    [InlineData("GET", "/api/v1/auth/allSistemas")]
    [InlineData("POST", "/api/v1/auth/getMenuCatalog")]
    [InlineData("POST", "/api/v1/aps/usuarioPorAPS")]
    public async Task AuthenticatedOnlyEndpoint_NonAdmin_Returns200(string method, string url)
    {
        var body = url.EndsWith("usuarioPorAPS", StringComparison.Ordinal) ? new { aps = 1 } : (object)new { };
        var response = await SendAsync(method, url, body, TestJwt.Build(TestJwt.NonAdminSisuId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Logout_NonAdmin_Returns200()
    {
        var response = await SendAsync("POST", "/api/v1/auth/logout", new { }, TestJwt.Build(TestJwt.NonAdminSisuId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // R3 (legacy MenuxUsuario.vue): the admin screen loads the menu tree of the selected system.
    [Fact]
    public async Task GetGeneralMenuTree_AdminRequestingAnotherSystem_ReturnsRequestedSystemTree()
    {
        var response = await SendAsync("POST", "/api/v1/auth/getGeneralMenuTree", new { idSistema = 3 },
            TestJwt.Build(TestJwt.AdminSisuId, idSistema: 1));
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(300, payload[0].GetProperty("id").GetInt32());
        Assert.Contains($"Menu:GetGeneralMenuTree:{TestJwt.AdminSisuId}:3", RecordedCalls());
    }

    // A non-admin cannot read another system's tree: the request falls back to the session system,
    // which is what the layout/dashboard always asked for.
    [Fact]
    public async Task GetGeneralMenuTree_NonAdminRequestingAnotherSystem_ReturnsSessionSystemTree()
    {
        var response = await SendAsync("POST", "/api/v1/auth/getGeneralMenuTree", new { idSistema = 4 },
            TestJwt.Build(TestJwt.NonAdminSisuId, idSistema: 2));
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, payload[0].GetProperty("id").GetInt32());
        Assert.DoesNotContain($"Menu:GetGeneralMenuTree:{TestJwt.NonAdminSisuId}:4", RecordedCalls());
    }

    [Fact]
    public async Task GetGeneralMenuTree_WithoutBody_ReturnsSessionSystemTree()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/getGeneralMenuTree");
        request.Headers.Add("x-access-token", TestJwt.Build(TestJwt.AdminSisuId, idSistema: 5));

        var response = await client.SendAsync(request);
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(500, payload[0].GetProperty("id").GetInt32());
    }

    private int CountCalls(string call)
        => RecordedCalls().Count(recorded => recorded == call);

    private IReadOnlyList<string> RecordedCalls()
        => factory.UsuariosRepository.Calls.Select(call => $"Usuarios:{call}")
            .Concat(factory.AsignacionesRepository.Calls.Select(call => $"Asignaciones:{call}"))
            .Concat(factory.MenuRepository.Calls.Select(call => $"Menu:{call}"))
            .ToList();

    private async Task<HttpResponseMessage> SendAsync(string method, string url, object body, string token)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), url);
        if (method != "GET")
        {
            request.Content = JsonContent.Create(body, body.GetType());
        }

        request.Headers.Add("x-access-token", token);
        return await client.SendAsync(request);
    }

    private static string TestJwtWithoutSisuId()
    {
        static string Encode(string json) => Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(json))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

        var header = Encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        var exp = DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds();
        var payload = Encode($"{{\"idSistema\":1,\"exp\":{exp}}}");
        using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(TestJwt.Secret));
        var signature = Convert.ToBase64String(hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes($"{header}.{payload}")))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
        return $"{header}.{payload}.{signature}";
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }
}
