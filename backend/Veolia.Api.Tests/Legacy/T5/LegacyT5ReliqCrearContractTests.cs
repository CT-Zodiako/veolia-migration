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
using Veolia.Api.Modules.Reliquidaciones.Crear;

namespace Veolia.Api.Tests.Legacy.T5;

/// <summary>
/// /api/v1/reliqCrear getReliquidaciones, getReliquidacionByAps, update, delete against legacy
/// back-tarificador/src/modules/reliq/{routes.js,controller.js:187-320} (crear is covered by ReliqCrearContractTests).
/// SQL text is not asserted: ReliqCrearRepository requires a concrete OracleConnection (no public seam).
/// Recorded deviations asserted as new behavior: envelope + typed camelCase DTOs, token required, estado text→1/2 (parity-review-all T3 C5).
/// </summary>
public sealed class LegacyT5ReliqCrearContractTests
{
    // Legacy routes.js:32-35 ignores the body and controller.js:189-206 lists every RELQESTADO IN ('1','2') of all APS.
    [Fact]
    public async Task GetReliquidaciones_WithoutApsListsEveryAps()
    {
        using var factory = new T5CrearFactory();
        using var client = T5CrearFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCrear/getReliquidaciones", new { });
        var body = await T5CrearFactory.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body.GetProperty("status").GetString());
        Assert.Equal(["GetReliquidaciones:all"], factory.Repository.Calls);
    }

    // Legacy controller.js:189-196 columns: RELQID, APSAID, APSA_NOMAPS, RELQNOMBRE, RELQDESCRIP, RELQDESDE, RELQHASTA,
    // RELQUSUSOLICITA, MAILSOLICITA, RELQESTADO ('1'→'Creada', '2'→'Aplicada', else 'ANULADO'), RELQFECHA, RELQIDATT,
    // RELQUSUAPRUEBA, MAILAPRUEBA.
    [Fact]
    public async Task GetReliquidaciones_ExposesEveryLegacyColumn()
    {
        using var factory = new T5CrearFactory();
        using var client = T5CrearFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCrear/getReliquidaciones", new { });
        var row = (await T5CrearFactory.Json(response)).GetProperty("data")[0];

        Assert.Equal(15, row.GetProperty("relqId").GetInt64());
        Assert.Equal(3, row.GetProperty("apsaId").GetInt64());
        Assert.Equal("APS Norte", row.GetProperty("apsaNomaps").GetString());
        Assert.Equal("Reliq 2024", row.GetProperty("relqNombre").GetString());
        Assert.Equal("Ajuste", row.GetProperty("relqDescripcion").GetString());
        Assert.Equal("202401", row.GetProperty("relqDesde").GetString());
        Assert.Equal("202406", row.GetProperty("relqHasta").GetString());
        Assert.Equal(5, row.GetProperty("relqSolicita").GetInt64());
        Assert.Equal("sol@veolia.com", row.GetProperty("mailSolicita").GetString());
        Assert.Equal("Creada", row.GetProperty("relqEstado").GetString());
        Assert.True(row.TryGetProperty("relqFecha", out _));
        Assert.Equal(77, row.GetProperty("relqIdAtt").GetInt64());
        Assert.Equal(6, row.GetProperty("relqAprueba").GetInt64());
        Assert.Equal("apr@veolia.com", row.GetProperty("mailAprueba").GetString());
    }

    // Legacy routes.js:36-40 reads { apsaid }; controller.js:224-231 binds it as :1 (WHERE APSAID = :1 AND RELQESTADO IN ('1','2')).
    // Legacy ProyService.js:616-626 posts { apsaid }; JSON binding is case-insensitive so the legacy key still works.
    [Theory]
    [InlineData("apsaid")]
    [InlineData("apsaId")]
    public async Task GetReliquidacionByAps_BindsTheApsKey(string key)
    {
        using var factory = new T5CrearFactory();
        using var client = T5CrearFactory.Client(factory);

        var response = await client.PostAsync("/api/v1/reliqCrear/getReliquidacionByAps",
            new StringContent($$"""{"{{key}}":3}""", System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["GetReliquidacionByAps:3"], factory.Repository.Calls);
        Assert.Equal(1, (await T5CrearFactory.Json(response)).GetProperty("data").GetArrayLength());
    }

    // Legacy routes.js:42-46 + controller.js:262-287: UPDATE ... SET RELQNOMBRE :1, RELQDESCRIP :2, RELQDESDE :3,
    // RELQHASTA :4, RELQUSUSOLICITA :5, RELQESTADO :6, RELQFECHA = SYSDATE, RELQIDATT :7, RELQUSUAPRUEBA :8
    // WHERE RELQID :9 AND APSAID :10 — every value taken from the body. Body keys are the typed DTO the new client sends.
    [Fact]
    public async Task Update_ForwardsEveryLegacyFieldFromTheBody()
    {
        using var factory = new T5CrearFactory();
        using var client = T5CrearFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCrear/update", new
        {
            relqId = 15, apsaId = 3, nombre = "Reliq 2024", descripcion = "Ajuste", desde = "202401", hasta = "202406",
            usuSolicita = 5, estado = "Creada", usuAprueba = 6, idAtt = 77
        });
        var body = await T5CrearFactory.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body.GetProperty("status").GetString());
        var r = Assert.Single(factory.Repository.Updates);
        Assert.Equal(("Reliq 2024", "Ajuste", "202401", "202406", 5L, "Creada", 77L, 6L, 15L, 3L),
            (r.RelqNombre, r.RelqDescripcion, r.RelqDesde, r.RelqHasta, r.UsuSolicita, r.RelqEstado, r.IdAtt, r.UsuAprueba, r.RelqId, r.ApsaId));
    }

    // Legacy routes.js:48-52 reads { relqid }; controller.js:304-307: DELETE FROM RELIQ.RELQRELIQUIDA WHERE RELQID = :1.
    // Legacy components/crear/ReliqCrear.vue:196-198 posts { relqid }; the new client also sends relqid.
    [Fact]
    public async Task Delete_BindsRelqid()
    {
        using var factory = new T5CrearFactory();
        using var client = T5CrearFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCrear/delete", new { relqid = 15 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", (await T5CrearFactory.Json(response)).GetProperty("status").GetString());
        Assert.Equal(["Eliminar:15"], factory.Repository.Calls);
    }
}

file sealed class T5CrearFactory : WebApplicationFactory<Program>
{
    internal T5CrearRepository Repository { get; } = new();

    internal static HttpClient Client(T5CrearFactory factory)
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
            services.RemoveAll<IReliqCrearRepository>();
            services.AddSingleton<IReliqCrearRepository>(Repository);
        });
    }
}

file sealed class T5CrearRepository : IReliqCrearRepository
{
    internal ConcurrentQueue<string> Calls { get; } = new();
    internal List<ActualizarReliquidacionRequestDto> Updates { get; } = [];

    private static ReliquidacionDto Row() => new()
    {
        RelqId = 15, ApsaId = 3, ApsaNomaps = "APS Norte", RelqNombre = "Reliq 2024", RelqDescripcion = "Ajuste",
        RelqDesde = "202401", RelqHasta = "202406", RelqSolicita = 5, MailSolicita = "sol@veolia.com", RelqEstado = "Creada",
        RelqFecha = new DateTime(2024, 7, 1), RelqIdAtt = 77, RelqAprueba = 6, MailAprueba = "apr@veolia.com"
    };

    public Task<ReliquidacionDto?> CrearAsync(CrearReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken)
        => throw new NotSupportedException();

    public Task<IReadOnlyList<ReliquidacionDto>> GetReliquidacionesAsync(long? apsaId, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"GetReliquidaciones:{apsaId?.ToString() ?? "all"}");
        return Task.FromResult<IReadOnlyList<ReliquidacionDto>>([Row()]);
    }

    public Task<IReadOnlyList<ReliquidacionDto>> GetReliquidacionByApsAsync(long apsaId, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"GetReliquidacionByAps:{apsaId}");
        return Task.FromResult<IReadOnlyList<ReliquidacionDto>>([Row()]);
    }

    public Task<bool> ActualizarAsync(ActualizarReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken)
    {
        Updates.Add(request);
        return Task.FromResult(true);
    }

    public Task<bool> EliminarAsync(long relqId, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"Eliminar:{relqId}");
        return Task.FromResult(true);
    }
}
