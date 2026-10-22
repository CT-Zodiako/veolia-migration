using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Reliquidaciones.Cargue;
using Veolia.Api.Modules.Reliquidaciones.Contracts;

namespace Veolia.Api.Tests.Legacy.T5;

/// <summary>
/// /api/v1/reliqCargue (14 routes) against legacy back-tarificador/src/modules/reliq/cargue/{routes.js,controller.js}
/// and front-tarificador/src/reliq/{services/cargueReliqService.js,services/ReleqService.js,components/cargue/*.vue}.
/// SQL text/bind order is not asserted: ReliqCargueRepository requires a concrete OracleConnection (no public seam).
/// Recorded deviations asserted as new behavior: envelope + typed camelCase DTOs, token required, 404 RELIQ_NOT_FOUND
/// (parity-review-all T5), USUA_USUA from the token instead of the hard-coded 9 (parity-review-all T4 K5/K6, S11 T1+S2),
/// negative-value rejection kept (parity-review-all S8 "K3 negatives: Dejarlo como está").
/// </summary>
public sealed class LegacyT5ReliqCargueContractTests
{
    // Legacy routes.js:33-63 read { idReliq } and pass it as the only bind (:1 RELI_ID) of each SELECT
    // (controller.js:262,282,302,322,350); legacy ResumUsuario.vue:255 etc. send { idReliq: stReliq }.
    [Theory]
    [InlineData("getReliInfoUsuarios", "GetReliInfoUsuarios")]
    [InlineData("getResumenEmpresa", "GetResumenEmpresa")]
    [InlineData("getResumenAPS", "GetResumenAps")]
    [InlineData("getResumenRelleno", "GetResumenRelleno")]
    [InlineData("getReliInfoAdicional", "GetReliInfoAdicional")]
    public async Task ReadTabs_BindIdReliqAndReturnRows(string route, string repositoryCall)
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync($"/api/v1/reliqCargue/{route}", new { idReliq = 42 });
        var body = await T5CargueFactory.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Array, body.GetProperty("data").ValueKind);
        Assert.Equal(1, body.GetProperty("data").GetArrayLength());
        Assert.Equal([$"{repositoryCall}:42"], factory.Repository.Calls);
    }

    // Legacy controller.js:250-254 returns, for the Usuarios tab, IUAE_ID, RELI_ID, IUAE_ANNO, IUAE_MES, DIVI_DIVI,
    // CLAS_CLASEUSO, CLAS_NOMBRE, PARA_TIPTAR20012, NOMTIIPOTARIFA, FAPR_CODIGO, FACTORNOMBRE, IUAE_CANTIDAD,
    // IUAE_TONELADAS, PARA_UBICACION20016, PARA_TIPFAC20014 (shown/filtered by ResumUsuario.vue:240-249).
    // Typed camelCase DTO is the recorded envelope/casing deviation.
    [Fact]
    public async Task ReliInfoUsuarios_ExposesTheLegacyColumnsAsCamelCase()
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCargue/getReliInfoUsuarios", new { idReliq = 42 });
        var row = (await T5CargueFactory.Json(response)).GetProperty("data")[0];

        Assert.Equal(7, row.GetProperty("iuaeId").GetInt64());
        Assert.Equal(42, row.GetProperty("reliId").GetInt64());
        Assert.Equal(2024, row.GetProperty("anno").GetInt32());
        Assert.Equal(3, row.GetProperty("mes").GetInt32());
        Assert.Equal("Residencial", row.GetProperty("clasNombre").GetString());
        Assert.Equal("Plena", row.GetProperty("tipoTarifaNombre").GetString());
        Assert.Equal("FP Estrato 1", row.GetProperty("factorProduccionNombre").GetString());
        Assert.Equal(12.5m, row.GetProperty("cantidad").GetDecimal());
        Assert.Equal(3.25m, row.GetProperty("toneladas").GetDecimal());
        foreach (var key in new[] { "diviDivi", "clasClaseUso", "paraTipTar20012", "faprCodigo", "paraUbicacion20016", "paraTipFac20014" })
            Assert.True(row.TryGetProperty(key, out _), key);
    }

    // Legacy routes.js:26-31 + controller.js:169-224: { reliq } → SELECT of 37 columns (CODRELIQ, APSNOM, COSTANNO,
    // COSTMES + RELQ_/TARI_/DIFE_ for CCSENER, CCSENERAPV, CCSACUE, CCSACUEAPV, CBLS, CLUS, CRT, CDF, CTL, VBA, IAT)
    // from RELIQ.VREL_COMPARACOSTOS WHERE CODRELIQ = :1, in that order.
    [Fact]
    public async Task CompararCostos_BindsReliqAndReturnsTheLegacy37ColumnsInOrder()
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCargue/compararCostos", new { reliq = 9 });
        var row = (await T5CargueFactory.Json(response)).GetProperty("data")[0];

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["CompararCostos:9"], factory.Repository.Calls);
        string[] legacy = ["CODRELIQ", "APSNOM", "COSTANNO", "COSTMES"];
        legacy = [.. legacy, .. new[] { "CCSENER", "CCSENERAPV", "CCSACUE", "CCSACUEAPV", "CBLS", "CLUS", "CRT", "CDF", "CTL", "VBA", "IAT" }
            .SelectMany(c => new[] { $"RELQ_{c}", $"TARI_{c}", $"DIFE_{c}" })];
        var keys = row.EnumerateObject().Select(p => p.Name.ToUpperInvariant()).ToArray();
        Assert.Equal(legacy.Select(c => c.Replace("_", "")).ToArray(), keys);
    }

    // Legacy controller.js:150-155 / 227-232: empty view → 404. Envelope message RELIQ_NOT_FOUND is recorded (parity-review-all T5).
    [Theory]
    [InlineData("compararCostos")]
    [InlineData("compararTarifas")]
    public async Task Comparar_EmptyViewReturns404(string route)
    {
        using var factory = new T5CargueFactory();
        factory.Repository.Empty = true;
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync($"/api/v1/reliqCargue/{route}", new { reliq = 9 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("RELIQ_NOT_FOUND", (await T5CargueFactory.Json(response)).GetProperty("message").GetString());
    }

    // Legacy routes.js:20-25 + controller.js:145-147: { reliq } → SELECT * FROM reliq.vrel_comparatarifacobro WHERE reli = :1;
    // CompararTarifas.vue filters on MES, ANNO, CLAS_NOMBRE, PARA_NOMBRE, FAPR_NOMBRE (parity-review-all T6 T1).
    [Fact]
    public async Task CompararTarifas_BindsReliqAndReturnsTheFilteredColumns()
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCargue/compararTarifas", new { reliq = 9 });
        var row = (await T5CargueFactory.Json(response)).GetProperty("data")[0];

        Assert.Equal(["CompararTarifas:9"], factory.Repository.Calls);
        Assert.Equal(4, row.GetProperty("mes").GetInt32());
        Assert.Equal(2023, row.GetProperty("anno").GetInt32());
        Assert.Equal("Residencial", row.GetProperty("clasNombre").GetString());
        Assert.Equal("Plena", row.GetProperty("paraNombre").GetString());
        Assert.Equal("FP 1", row.GetProperty("faprNombre").GetString());
    }

    // Legacy routes.js:6-11 + controller.js:10-17: freli_jsongral(:1 reliq, :2 aps, :3 anno, :4 mes); the JSON keeps
    // "periodo"/"dataset" (CompararTarifas.vue:755-777). Request key aps → apsaId is recorded (parity-review-all T6).
    [Fact]
    public async Task ResumenCompararTarifas_BindsReliqApsAnnoMesInLegacyOrder()
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCargue/resumenCompararTarifas", new { reliq = 9, apsaId = 3, anno = 2024, mes = 5 });
        var data = (await T5CargueFactory.Json(response)).GetProperty("data");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["ResumenCompararTarifas:9:3:2024:5"], factory.Repository.Calls);
        Assert.Equal("2024-05", data.GetProperty("periodo").GetString());
        Assert.Equal("Usuarios", data.GetProperty("dataset")[0].GetProperty("nombre").GetString());
    }

    // Legacy controller.js:17-24: a NULL freli_jsongral result is JSON.parse(null) = null → 200 { ok: true, result: null }
    // and the screen shows an empty resumen.
    [Fact(Skip = "PARITY-FINDING: resumenCompararTarifas with no JSON returns 404 RELIQ_NOT_FOUND and the screen shows an error explaining Reliquidar must run first; legacy returned 200 with result null (empty resumen, no message). Not recorded in parity-review-all.")]
    public async Task ResumenCompararTarifas_NullJsonReturns200LikeLegacy()
    {
        using var factory = new T5CargueFactory();
        factory.Repository.Empty = true;
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCargue/resumenCompararTarifas", new { reliq = 9, apsaId = 3, anno = 2024, mes = 5 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // Legacy routes.js:13-18 + controller.js:54-56: RELIQ.PK_RELIQUIDAR.freli_reliquidar(:p_reliq, :p_aps) and the raw
    // package text is returned (Cargue.vue:117-123 parses ERR|code|msg). Key aps → apsaId used consistently by the new client.
    [Fact]
    public async Task CompararCostosCargue_PassesReliqThenApsAndReturnsThePackageText()
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCargue/compararCostosCargue", new { reliq = 9, apsaId = 3 });
        var body = await T5CargueFactory.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["CompararCostosCargue:9:3"], factory.Repository.Calls);
        Assert.Equal("ERR|20001|Sin datos", body.GetProperty("data").GetProperty("resultado").GetString());
    }

    // Legacy routes.js:66-100 read req.body.data (an array) and update every row; USUA_USUA was the literal 9
    // (routes.js:70,77,84,91,98) — now the token user (recorded deviation).
    [Theory]
    [InlineData("updateReliInfoUsuarios", """{"data":[{"iuaeId":7,"reliId":42,"cantidad":1.5,"toneladas":2}]}""", "UpdateReliInfoUsuarios:1:7:42")]
    [InlineData("updateResumenEmpresa", """{"data":[{"inedId":8,"reliId":42,"cblj":1}]}""", "UpdateResumenEmpresa:1:8:42")]
    [InlineData("updateResumenAPS", """{"data":[{"iaedId":9,"reliId":42,"qrtz":1}]}""", "UpdateResumenAps:1:9:42")]
    [InlineData("updateResumenRellno", """{"data":[{"iareId":10,"reliId":42,"qrs":1}]}""", "UpdateResumenRelleno:1:10:42")]
    [InlineData("updateResumenAdicional", """{"data":[{"ceadId":11,"reliId":42,"cdf":1,"ctl":2}]}""", "UpdateResumenAdicional:1:11:42")]
    public async Task Updates_ReadTheDataArrayAndStampTheTokenUser(string route, string json, string expectedCall)
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsync($"/api/v1/reliqCargue/{route}", new StringContent(json, System.Text.Encoding.UTF8, "application/json"));
        var body = await T5CargueFactory.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body.GetProperty("status").GetString());
        Assert.Equal([expectedCall.Replace(":1:", $":{TestJwt.AdminSisuId}:")], factory.Repository.Calls);
    }

    // Legacy ResumUsuario.vue:302-315 sends iuaeCantidad/iuaeToneladas; controller.js:390-405 binds them to
    // IUAE_CANTIDAD/IUAE_TONELADAS. The typed DTO names (cantidad/toneladas) are what the new client sends.
    [Fact]
    public async Task UpdateReliInfoUsuarios_ForwardsEveryEditableValue()
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        await client.PostAsJsonAsync("/api/v1/reliqCargue/updateReliInfoUsuarios", new
        {
            data = new[] { new { iuaeId = 7, reliId = 42, diviDivi = 2, faprCodigo = 5, clasClaseUso = 1, paraTipTar20012 = 3, paraUbicacion20016 = 4, paraTipFac20014 = 6, cantidad = 1.5m, toneladas = 2.25m } }
        });

        var row = Assert.Single(factory.Repository.UsuariosRows);
        Assert.Equal((2L, 5L, 1L, 3L, 4L, 6L, 1.5m, 2.25m), (row.DiviDivi, row.FaprCodigo, row.ClasClaseUso, row.ParaTipTar20012, row.ParaUbicacion20016, row.ParaTipFac20014, row.Cantidad, row.Toneladas));
    }

    // Negative values rejected without touching Oracle: kept as is by the user (parity-review-all S8/L9 "K3 negatives").
    [Fact]
    public async Task UpdateReliInfoUsuarios_NegativeCantidadIsRejected()
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCargue/updateReliInfoUsuarios", new { data = new[] { new { iuaeId = 7, reliId = 42, cantidad = -1m } } });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Empty(factory.Repository.Calls);
    }

    // Legacy controller.js:388-414: an empty data array loops zero times and returns 200 [] (the tab shows "Guardado").
    [Fact(Skip = "PARITY-FINDING: saving a Cargue tab with no rows returns 422 PAYLOAD_EMPTY (error toast); legacy updated nothing and returned 200 [] (success toast). Low severity, not recorded in parity-review-all.")]
    public async Task Updates_EmptyDataReturns200LikeLegacy()
    {
        using var factory = new T5CargueFactory();
        using var client = T5CargueFactory.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/reliqCargue/updateResumenAdicional", new { data = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

file sealed class T5CargueFactory : WebApplicationFactory<Program>
{
    internal T5CargueRepository Repository { get; } = new();

    internal static HttpClient Client(T5CargueFactory factory)
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
            services.RemoveAll<IReliqCargueRepository>();
            services.AddSingleton<IReliqCargueRepository>(Repository);
        });
    }
}

file sealed class T5CargueRepository : IReliqCargueRepository
{
    internal ConcurrentQueue<string> Calls { get; } = new();
    internal List<UpdateReliInfoUsuariosRequestDto> UsuariosRows { get; } = [];
    internal bool Empty { get; set; }

    private IReadOnlyList<T> Rows<T>(string call, T row)
    {
        Calls.Enqueue(call);
        return Empty ? [] : [row];
    }

    public Task<string?> CompararCostosCargueAsync(long reliq, long apsaId, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"CompararCostosCargue:{reliq}:{apsaId}");
        return Task.FromResult<string?>("ERR|20001|Sin datos");
    }

    public Task<IReadOnlyList<CompararCostosResponseDto>> CompararCostosAsync(long reliq, CancellationToken cancellationToken)
        => Task.FromResult(Rows($"CompararCostos:{reliq}", new CompararCostosResponseDto { CodReliq = reliq, ApsNom = "APS Norte" }));

    public Task<IReadOnlyList<CompararTarifasResponseDto>> CompararTarifasAsync(long reliq, CancellationToken cancellationToken)
        => Task.FromResult(Rows($"CompararTarifas:{reliq}", new CompararTarifasResponseDto { Mes = 4, Anno = 2023, ClasNombre = "Residencial", ParaNombre = "Plena", FaprNombre = "FP 1" }));

    public Task<ResumenCompararTarifasResponseDto?> ResumenCompararTarifasAsync(long reliq, long apsaId, int anno, int mes, CancellationToken cancellationToken)
    {
        Calls.Enqueue($"ResumenCompararTarifas:{reliq}:{apsaId}:{anno}:{mes}");
        return Task.FromResult(Empty ? null : new ResumenCompararTarifasResponseDto
        {
            Periodo = "2024-05",
            Dataset = [new ResumenCompararTarifasDatasetItemDto { Nombre = "Usuarios", Columns = ["A"], Data = [[1m]] }]
        });
    }

    public Task<IReadOnlyList<ReliInfoUsuariosDto>> GetReliInfoUsuariosAsync(long idReliq, CancellationToken cancellationToken)
        => Task.FromResult(Rows($"GetReliInfoUsuarios:{idReliq}", new ReliInfoUsuariosDto
        {
            IuaeId = 7, ReliId = idReliq, Anno = 2024, Mes = 3, ClasNombre = "Residencial", TipoTarifaNombre = "Plena",
            FactorProduccionNombre = "FP Estrato 1", Cantidad = 12.5m, Toneladas = 3.25m
        }));

    public Task<IReadOnlyList<ReliInfoEmpresaDto>> GetResumenEmpresaAsync(long idReliq, CancellationToken cancellationToken)
        => Task.FromResult(Rows($"GetResumenEmpresa:{idReliq}", new ReliInfoEmpresaDto()));

    public Task<IReadOnlyList<ReliInfoApsDto>> GetResumenApsAsync(long idReliq, CancellationToken cancellationToken)
        => Task.FromResult(Rows($"GetResumenAps:{idReliq}", new ReliInfoApsDto()));

    public Task<IReadOnlyList<ReliInfoRellenoDto>> GetResumenRellenoAsync(long idReliq, CancellationToken cancellationToken)
        => Task.FromResult(Rows($"GetResumenRelleno:{idReliq}", new ReliInfoRellenoDto()));

    public Task<IReadOnlyList<ReliInfoAdicionalDto>> GetReliInfoAdicionalAsync(long idReliq, CancellationToken cancellationToken)
        => Task.FromResult(Rows($"GetReliInfoAdicional:{idReliq}", new ReliInfoAdicionalDto()));

    public Task<int> UpdateReliInfoUsuariosAsync(IReadOnlyList<UpdateReliInfoUsuariosRequestDto> items, long userId, CancellationToken cancellationToken)
    {
        UsuariosRows.AddRange(items);
        return Update("UpdateReliInfoUsuarios", userId, items.Select(i => (i.IuaeId, i.ReliId)));
    }

    public Task<int> UpdateResumenEmpresaAsync(IReadOnlyList<UpdateResumenEmpresaRequestDto> items, long userId, CancellationToken cancellationToken)
        => Update("UpdateResumenEmpresa", userId, items.Select(i => (i.InedId, i.ReliId)));

    public Task<int> UpdateResumenApsAsync(IReadOnlyList<UpdateResumenApsRequestDto> items, long userId, CancellationToken cancellationToken)
        => Update("UpdateResumenAps", userId, items.Select(i => (i.IaedId, i.ReliId)));

    public Task<int> UpdateResumenRellenoAsync(IReadOnlyList<UpdateResumenRellenoRequestDto> items, long userId, CancellationToken cancellationToken)
        => Update("UpdateResumenRelleno", userId, items.Select(i => (i.IareId, i.ReliId)));

    public Task<int> UpdateResumenAdicionalAsync(IReadOnlyList<UpdateResumenAdicionalRequestDto> items, long userId, CancellationToken cancellationToken)
        => Update("UpdateResumenAdicional", userId, items.Select(i => (i.CeadId, i.ReliId)));

    private Task<int> Update(string name, long userId, IEnumerable<(long Id, long ReliId)> rows)
    {
        var count = 0;
        foreach (var (id, reliId) in rows)
        {
            Calls.Enqueue($"{name}:{userId}:{id}:{reliId}");
            count++;
        }

        return Task.FromResult(count);
    }
}
