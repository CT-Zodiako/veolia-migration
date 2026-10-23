using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Sui853.Cdft;
using Veolia.Api.Modules.Sui853.Comercial;
using Veolia.Api.Modules.Sui853.General;
using Veolia.Api.Modules.Sui853.Operaciones;

namespace Veolia.Api.Tests.Legacy.T4;

/// <summary>
/// SUI853 read endpoints not covered elsewhere (CDFT 8010, Operaciones 20001, Comercial 10001, FAC 40001) through
/// the real Program pipeline, with expectations from legacy back-tarificador/src/modules/sui853/{CVNA,operaciones,General}.
/// Legacy mounted them at sui853CVNA/cdft, sui853Operaciones/*, sui853General/fac (index.js:77-84); the new routes
/// keep the same last segment and are consumed by the migrated screens. Responses use the approved
/// { status, data, message } envelope (parity-review-all T9/T10).
/// </summary>
public sealed class LegacyT4ConsultasContractTests
{
    // ---------------------------------------------------------------- CDFT (8010)

    // Legacy CVNA/routes.js:57-61 + CVNA/controller.js:468-489: POST cdft { anno } → rows of SUI.TCDFT_QRT_ANUAL
    // for that fiscal year with ANNO_FISCAL, NOMBRE_APS, VALOR_CORRIENTE, VALOR_2018, QRTZ. The typed DTO serializes
    // them camelCase (annoFiscal ... qrtz), the keys cdft-page.component.ts binds (approved casing deviation).
    [Fact]
    public async Task Cdft_PassesTheYearAndReturnsTheFiveLegacyColumns()
    {
        using var factory = new ConsultasFactory();
        using var client = factory.Client();

        var response = await client.PostAsync("/api/v1/sui853/cdft/cdft", Json("""{"anno":2024}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(["annoFiscal", "nombreAps", "valorCorriente", "valor2018", "qrtz"], row.EnumerateObject().Select(p => p.Name));
        Assert.Equal("2024", row.GetProperty("annoFiscal").GetString());
        Assert.Equal("APS Norte", row.GetProperty("nombreAps").GetString());
        Assert.Equal(1234567.891m, row.GetProperty("valorCorriente").GetDecimal());
        Assert.Equal(987.5m, row.GetProperty("valor2018").GetDecimal());
        Assert.Equal(0.123456m, row.GetProperty("qrtz").GetDecimal());
        Assert.Equal([2024], factory.Cdft.Annos);
    }

    // ---------------------------------------------------------------- Operaciones (20001)

    // Legacy operaciones/routes.js:7-11 + controller.js:6-30: POST residuosGenerados { apsId, year, month } →
    // SUI.TGEN_RESGENERADOS rows keyed by their Oracle column names. System-3 check is intentional (parity-review T11 O3).
    [Fact]
    public async Task ResiduosGenerados_PassesApsYearMonthAndKeepsOracleKeys()
    {
        using var factory = new ConsultasFactory();
        using var client = factory.Client();

        var response = await client.PostAsync("/api/v1/sui853/operaciones/residuosGenerados", Json("""{"apsId":"5","year":2024,"month":3}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(["APS", "NOMAPS", "TON_RBU", "FEC_ENTRADA"], row.EnumerateObject().Select(p => p.Name));
        Assert.Equal("12.345678901", row.GetProperty("TON_RBU").GetString());
        var request = Assert.Single(factory.Operaciones.Detail);
        Assert.Equal(("5", 2024, 3), (request.ApsId, request.Year, request.Month));
    }

    // Legacy operaciones/routes.js:18-22 + controller.js:53-99: POST resumenResiduosGenerados renders the global
    // F853GR02 format (no APS/year/month binds) and adds meta.dialogHeader.
    [Fact]
    public async Task OperacionesResumen_ReturnsTheF853GR02Payload()
    {
        using var factory = new ConsultasFactory();
        using var client = factory.Client();

        var response = await client.PostAsync("/api/v1/sui853/operaciones/resumenResiduosGenerados", Json("{}"));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("F853GR02 | Resumen | Residuos", body.GetProperty("data").GetProperty("meta").GetProperty("dialogHeader").GetString());
        Assert.Equal("NOMAPS", body.GetProperty("data").GetProperty("SIN_MOVIMIENTO").GetProperty("headers")[0].GetProperty("field").GetString());
        Assert.Equal(1, factory.Comercial.SummaryCalls);
    }

    // ---------------------------------------------------------------- Comercial (10001)

    // Legacy operaciones/routes.js:12-16 + controller.js:31-52 (used by comercial/tgenComercial.vue:614):
    // POST residuosGeneradosInforme { apsId, year, month } → SELECT * FROM SUI.TGEN_COMERCIAL rows.
    [Fact]
    public async Task ComercialDetalle_PassesApsYearMonthAndKeepsOracleKeys()
    {
        using var factory = new ConsultasFactory();
        using var client = factory.Client();

        var response = await client.PostAsync("/api/v1/sui853/comercial/residuosGeneradosInforme", Json("""{"apsId":"9","year":2023,"month":12}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(["APS", "MUNI", "DEVFEXCOE"], row.EnumerateObject().Select(p => p.Name));
        Assert.Equal("5001", row.GetProperty("MUNI").GetString());
        var request = Assert.Single(factory.Comercial.Detail);
        Assert.Equal(("9", 2023, 12), (request.ApsId, request.Year, request.Month));
    }

    // Legacy operaciones/routes.js:18-22 (tgenComercial.vue:612 loads the same F853GR02 summary).
    [Fact]
    public async Task ComercialResumen_ReturnsTheF853GR02Payload()
    {
        using var factory = new ConsultasFactory();
        using var client = factory.Client();

        var response = await client.PostAsync("/api/v1/sui853/comercial/resumenResiduosGenerados", Json("{}"));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal("F853GR02 | Resumen | Residuos", body.GetProperty("data").GetProperty("meta").GetProperty("dialogHeader").GetString());
        Assert.Equal(1, factory.Comercial.SummaryCalls);
    }

    // ---------------------------------------------------------------- FAC (40001)

    // Legacy General/routes.js:7-11 + General/controller.js:7-56: POST fac renders F853GR01 and sets
    // meta.dialogHeader = "CODIGO | NOMBRE | DESCRIPCION", keeping the other rendered keys.
    [Fact]
    public async Task Fac_ReturnsTheF853GR01PayloadWithDialogHeader()
    {
        using var factory = new ConsultasFactory();
        using var client = factory.Client();

        var response = await client.PostAsync("/api/v1/sui853/general/fac", Json("{}"));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        var data = body.GetProperty("data");
        Assert.Equal("F853GR01 | FAC | General", data.GetProperty("meta").GetProperty("dialogHeader").GetString());
        Assert.Equal("FAC", data.GetProperty("title").GetString());
        Assert.Equal("VALOR", data.GetProperty("SIN_MOVIMIENTO").GetProperty("headers")[0].GetProperty("field").GetString());
        Assert.Equal(10.5m, data.GetProperty("data")[0].GetProperty("VALOR").GetDecimal());
        Assert.Equal(1, factory.Fac.Calls);
    }

    private static StringContent Json(string json) => new(json, Encoding.UTF8, "application/json");

    private static async Task<JsonElement> Read(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        try { return JsonSerializer.Deserialize<JsonElement>(text); }
        catch (JsonException) { throw new Xunit.Sdk.XunitException($"{(int)response.StatusCode}: {text[..Math.Min(text.Length, 600)]}"); }
    }
}

file sealed class ConsultasFactory : WebApplicationFactory<Program>
{
    public StubCdft Cdft { get; } = new();
    public StubComercial Comercial { get; } = new();
    public StubOperaciones Operaciones { get; }
    public StubFac Fac { get; } = new();

    public ConsultasFactory() => Operaciones = new StubOperaciones(Comercial);

    public HttpClient Client()
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TestJwt.AdminSisuId, 3));
        return client;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<ICdftRepository>();
            services.AddSingleton<ICdftRepository>(Cdft);
            services.RemoveAll<IComercialRepository>();
            services.AddSingleton<IComercialRepository>(Comercial);
            services.RemoveAll<IResiduosGeneradosRepository>();
            services.AddSingleton<IResiduosGeneradosRepository>(Operaciones);
            services.RemoveAll<IFacRepository>();
            services.AddSingleton<IFacRepository>(Fac);
        });
    }
}

file static class Summary
{
    public static JsonObject F853GR02() => ComercialPayload.ParseSummary(
        """{"title":"Resumen","SIN_MOVIMIENTO":{"headers":[{"field":"NOMAPS"}]},"data":[{"NOMAPS":"APS Norte"}]}""",
        "F853GR02 | Resumen | Residuos");
}

file sealed class StubCdft : ICdftRepository
{
    public List<int> Annos { get; } = [];

    public Task<IReadOnlyList<CdftRowDto>> GetByAnnoAsync(int anno, CancellationToken cancellationToken)
    {
        Annos.Add(anno);
        return Task.FromResult<IReadOnlyList<CdftRowDto>>([new CdftRowDto
        {
            AnnoFiscal = "2024", NombreAps = "APS Norte", ValorCorriente = 1234567.891, Valor2018 = 987.5, Qrtz = 0.123456
        }]);
    }
}

file sealed class StubComercial : IComercialRepository
{
    public List<ComercialRequest> Detail { get; } = [];
    public int SummaryCalls { get; private set; }

    public Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(ComercialRequest request, CancellationToken cancellationToken)
    {
        Detail.Add(request);
        return Task.FromResult<IReadOnlyList<Dictionary<string, object?>>>(
            [new() { ["APS"] = "9", ["MUNI"] = "5001", ["DEVFEXCOE"] = null }]);
    }

    public Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken)
    {
        SummaryCalls++;
        return Task.FromResult<JsonObject?>(Summary.F853GR02());
    }
}

// The real ResiduosGeneradosRepository delegates the summary to IComercialRepository (same F853GR02 report).
file sealed class StubOperaciones(StubComercial summaries) : IResiduosGeneradosRepository
{
    public List<ResiduosGeneradosRequest> Detail { get; } = [];

    public Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(ResiduosGeneradosRequest request, CancellationToken cancellationToken)
    {
        Detail.Add(request);
        return Task.FromResult<IReadOnlyList<Dictionary<string, object?>>>(
            [new() { ["APS"] = "5", ["NOMAPS"] = "APS Norte", ["TON_RBU"] = "12.345678901", ["FEC_ENTRADA"] = null }]);
    }

    public Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken) => summaries.GetSummaryAsync(cancellationToken);
}

file sealed class StubFac : IFacRepository
{
    public int Calls { get; private set; }

    public Task<JsonObject> GetAsync(CancellationToken cancellationToken)
    {
        Calls++;
        var payload = FacPayload.Parse("""{"title":"FAC","SIN_MOVIMIENTO":{"headers":[{"field":"VALOR"}]},"data":[{"VALOR":10.5}]}""");
        FacPayload.ApplyTitle(payload, "F853GR01 | FAC | General");
        return Task.FromResult(payload);
    }
}
