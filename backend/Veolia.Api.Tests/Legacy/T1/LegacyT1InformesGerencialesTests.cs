using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Facturacion;
using Veolia.Api.Modules.Regulator.InfoGenerales;
using Veolia.Api.Modules.Regulator.InfoGerencial;

namespace Veolia.Api.Tests.Legacy.T1;

// Legacy-derived contract tests (odd/tasks/legacy-characterization-tests.md S1-S6) for the Regulator route groups
// facturacion, infogenerales and infogerencial. Their repositories require a real OracleConnection, so the SQL is not
// observable without Oracle: these tests pin the HTTP contract (route, legacy request field names, what reaches the
// repository, response payload and casing) through stub repositories.
// Recorded deviations asserted as the new behavior: token required on every /api/v1 route (parity-review-all.md S10,
// Program.cs anonymousApiRoutes), {status,data,message} envelope (T9/T10), user taken from the token (S11 "T1+S2"),
// APS scoping of Informe Proyecciones by the token user (T21-T23 "1001 Generales OK (APS scoping intentional)"),
// descuento-costos routes moved from suministros to infogerencial (T18-T20 "605 → infogerencial").
// Legacy root: /Users/zodiako/DEV/oracle/back-tarificador/src.

public sealed class LegacyT1FacturacionContractTests
{
    // Legacy facturacion/routes.js:5-33 (POST /facturacion, /detafacturacion, /facturacionclus, /facturaciondinc,
    // /facturacionelectronica, body {aps, anno, mes}, bare row array) and facturacion/controller.js:6-32 (SELECT * of
    // VACUO_FACTURACION, VACUO_DETAFACTURACION, VACUO_FACTURACIONCLUS, VACUO_FACTURACIONDINC, vauco_fatelectronica).
    // The legacy screen queried the month before the selected one (front-tarificador views/informes/Detallefacturacion.vue:1316,
    // 1331, 1346, 1361-1367, 1380: date.setMonth(date.getMonth() - 1)); the new API receives the selected month and applies
    // the same shift server-side (annoConsultado/mesConsultado), so the rows queried are the legacy ones.
    [Theory]
    [InlineData("facturacion", "Consulta de facturación ejecutada correctamente.")]
    [InlineData("detafacturacion", "Consulta de detalle de facturación ejecutada correctamente.")]
    [InlineData("facturacionclus", "Consulta de facturación clúster ejecutada correctamente.")]
    [InlineData("facturaciondinc", "Consulta de facturación DINC ejecutada correctamente.")]
    [InlineData("facturacionelectronica", "Consulta de factura electrónica ejecutada correctamente.")]
    public async Task EachLegacyViewEndpointReceivesApsAnnoMesAndReturnsTheViewRowsUntouched(string endpoint, string message)
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory);

        var response = await client.PostAsJsonAsync($"/api/v1/facturacion/{endpoint}", new { aps = Api.Aps, anno = Api.Anno, mes = Api.Mes });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal(message, body.GetProperty("message").GetString());
        var call = Assert.Single(factory.Facturacion.Calls);
        Assert.Equal((endpoint, Api.Aps, Api.Anno, Api.Mes), call);
        var periodo = body.GetProperty("data").GetProperty("periodo");
        Assert.Equal(Api.Aps, periodo.GetProperty("aps").GetInt32());
        Assert.Equal(Api.Anno, periodo.GetProperty("anno").GetInt32());
        Assert.Equal(Api.Mes, periodo.GetProperty("mes").GetInt32());
        Assert.Equal(2025, periodo.GetProperty("annoConsultado").GetInt32());
        Assert.Equal(2, periodo.GetProperty("mesConsultado").GetInt32());
        var fila = Assert.Single(body.GetProperty("data").GetProperty("filas").EnumerateArray());
        Assert.Equal(7, fila.GetProperty("APSA_ID").GetInt32());
        Assert.Equal("RESIDENCIAL", fila.GetProperty("CLUS_NOMBRE").GetString());
        Assert.Equal(2, fila.GetProperty("TARI_MES").GetInt32());
    }

    // Legacy Detallefacturacion.vue:1361-1367: January rolls back to December of the previous year (Date.setMonth(-1)).
    [Theory]
    [InlineData(2025, 3, 2025, 2)]
    [InlineData(2025, 1, 2024, 12)]
    [InlineData(2025, 12, 2025, 11)]
    public void PeriodShiftMatchesTheLegacyDateSetMonthMinusOne(int anno, int mes, int expectedAnno, int expectedMes)
        => Assert.Equal((expectedAnno, expectedMes), FacturacionRepository.ResolvePeriodoAnterior(anno, mes));
}

public sealed class LegacyT1InfoGeneralesContractTests
{
    // Legacy infogenerales/routes.js:7-33 (POST /consultaenergia, /consultaacueducto, /consultacostos, /consultatarifas,
    // body {apsaid, proyid}) and infogenerales/controller.js:53-130 (vpro_resfactene, vpro_resfactacu, vpro_rescostos,
    // vpro_restarifas; binds [apsa_id, proy_id]); 200 with the row array. The rows reach the client with the Oracle column
    // names. New: token required and rows scoped to the token user's APS (recorded deviations, see file header).
    [Theory]
    [InlineData("consultaenergia", "energia", "FAEN_TOTAL")]
    [InlineData("consultaacueducto", "acueducto", "FACU_TOTAL")]
    [InlineData("consultacostos", "costos", "COST_CCS")]
    [InlineData("consultatarifas", "tarifas", "TARI_TOTAL")]
    public async Task ProyeccionQueriesReceiveApsaidProyidAndReturnTheOracleColumns(string endpoint, string consulta, string column)
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory, sisuId: 404);

        var response = await client.PostAsJsonAsync($"/api/v1/infogenerales/{endpoint}", new { apsaid = 7, proyid = 31 });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal("OK", body.GetProperty("message").GetString());
        Assert.Equal((consulta, 7L, 31L, 404L), Assert.Single(factory.InfoGenerales.ProyeccionCalls));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(1250.5m, row.GetProperty(column).GetDecimal());
        Assert.Equal("RESIDENCIAL", row.GetProperty("CLAS_NOMBRE").GetString());
    }

    // Legacy infogenerales/routes.js:36-48 (POST /consultaHistorialCertificaciones and /consultaHistorialProductividad,
    // body {anno, mes}, usuario = req.SISU_ID from the token) and controller.js:6-50 (vauco_certintarifas /
    // vauco_productividad; binds [anno, mes, usuario]).
    [Theory]
    [InlineData("consultaHistorialCertificaciones", "certificaciones", "TACE_ANNO")]
    [InlineData("consultaHistorialProductividad", "productividad", "PR22_ANNO")]
    public async Task HistorialQueriesReceiveAnnoMesAndTheTokenUser(string endpoint, string consulta, string column)
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory, sisuId: 404);

        var response = await client.PostAsJsonAsync($"/api/v1/infogenerales/{endpoint}", new { anno = Api.Anno, mes = Api.Mes });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal((consulta, Api.Anno, Api.Mes, 404L), Assert.Single(factory.InfoGenerales.HistorialCalls));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(2025, row.GetProperty(column).GetInt32());
        Assert.Equal(7, row.GetProperty("CODAPS").GetInt32());
    }

    // Legacy infogenerales/controller.js:15-19: an empty result is 200 with [] (not an error).
    [Fact]
    public async Task EmptyResultIsStill200WithAnEmptyArray()
    {
        using var factory = new LegacyT1StubApiFactory();
        factory.InfoGenerales.Empty = true;
        using var client = Api.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/infogenerales/consultaHistorialProductividad", new { anno = Api.Anno, mes = Api.Mes });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Empty(body.GetProperty("data").EnumerateArray());
    }
}

public sealed class LegacyT1InfoGerencialContractTests
{
    // Legacy infogerenciales/routes.js:6-16 (POST /detcostos, /detsubaporte, body {anno, mes}) and controller.js:5-22
    // (vauco_costos + apsa_nomaps, vauco_subsaport + PARA_NOMBRE; binds [anno, mes]); rows with Oracle column names.
    [Theory]
    [InlineData("detcostos", "APSA_NOMAPS")]
    [InlineData("detsubaporte", "PARA_NOMBRE")]
    public async Task PeriodReportsReceiveAnnoMesAndReturnTheOracleColumns(string endpoint, string column)
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory);

        var response = await client.PostAsJsonAsync($"/api/v1/infogerencial/{endpoint}", new { anno = Api.Anno, mes = Api.Mes });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal((endpoint, 0, Api.Anno, Api.Mes), Assert.Single(factory.InfoGerencial.Calls));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal("VALOR", row.GetProperty(column).GetString());
    }

    // Legacy infogerenciales/routes.js:18-34 (POST /infoapsemprdivi, /infoemprdivi, /infoapsrelleno, body {aps, anno, mes})
    // and controller.js:24-40 (binds [aps, anno, mes]; EMPR_NOMBRE/DIVI_NOMBRE, EMPR_NOMBRE, RELL_NOMRELLENO + ai.*).
    [Theory]
    [InlineData("infoapsemprdivi", "DIVI_NOMBRE")]
    [InlineData("infoemprdivi", "EMPR_NOMBRE")]
    [InlineData("infoapsrelleno", "RELL_NOMRELLENO")]
    public async Task ApsPeriodReportsReceiveApsAnnoMesAndReturnTheOracleColumns(string endpoint, string column)
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory);

        var response = await client.PostAsJsonAsync($"/api/v1/infogerencial/{endpoint}", new { aps = Api.Aps, anno = Api.Anno, mes = Api.Mes });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal((endpoint, Api.Aps, Api.Anno, Api.Mes), Assert.Single(factory.InfoGerencial.Calls));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal("VALOR", row.GetProperty(column).GetString());
    }

    // Legacy infogerenciales/routes.js:36-42 (POST /getDashBoardGerencial, body {anno, mes}, usuario = req.SISU_ID) and
    // controller.js:44-45 (binds [anno, mes, usuario]; columns apsa_id, apsa_nomaps, tari_fechacreacion, sisu_correo).
    [Fact]
    public async Task DashboardGerencialUsesTheTokenUserAndIgnoresAnyBodyUser()
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory, sisuId: 404);

        var response = await client.PostAsJsonAsync("/api/v1/infogerencial/getDashBoardGerencial", new { anno = Api.Anno, mes = Api.Mes, usuario = 999 });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal((Api.Anno, Api.Mes, 404L), Assert.Single(factory.InfoGerencial.DashboardCalls));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(7, row.GetProperty("APSA_ID").GetInt32());
        Assert.Equal("APS NORTE", row.GetProperty("APSA_NOMAPS").GetString());
        Assert.Equal("2025-02-28T00:00:00", row.GetProperty("TARI_FECHACREACION").GetString());
        Assert.Equal("user@veolia.test", row.GetProperty("SISU_CORREO").GetString());
    }

    // Legacy infogerenciales/routes.js:51-56 (POST /costoPoda, body {aps}) and controller.js:62 (vpoda_reporte WHERE
    // apsa_id = :aps ORDER BY periodo DESC).
    [Fact]
    public async Task CostoPodaReceivesApsAndReturnsTheOracleColumns()
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/infogerencial/costoPoda", new { aps = Api.Aps });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal(("costoPoda", Api.Aps, 0, 0), Assert.Single(factory.InfoGerencial.Calls));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal("VALOR", row.GetProperty("PERIODO").GetString());
    }

    // Legacy suministros/routes.js:151 (POST /getapsDesCost, body {aps, anno, mes}) and suministros/controller.js:748-752
    // (AUCO_INFOAPSDESCOST + PARA_NOMBRE, DESC_ESTADO = 1; binds [aps, anno, mes]); grid columns PARA_NOMBRE/DESC_VALOR
    // (front-tarificador views/suministros/Descuentos.vue:15-37).
    [Fact]
    public async Task GetApsDesCostReceivesApsAnnoMesAndReturnsTheOracleColumns()
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/infogerencial/getapsDesCost", new { aps = Api.Aps, anno = Api.Anno, mes = Api.Mes });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(("getapsDesCost", Api.Aps, Api.Anno, Api.Mes), Assert.Single(factory.InfoGerencial.Calls));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal("VALOR", row.GetProperty("PARA_NOMBRE").GetString());
    }

    // Legacy suministros/routes.js:118-124 (POST /getapsDesCostUnico, body {id, aps, anno, mes, isnew}) and
    // suministros/controller.js:755-781 (isnew -> available costs only; otherwise UNION with the row DESC_ID = :4).
    // Edit mode as legacy sent it: Descuentos.vue:48 openBasic(false, DESC_ID) -> getapsDesCostUnico(id, aps, anno, mes, false).
    [Fact]
    public async Task GetApsDesCostUnicoBindsTheLegacyLowercaseIsnewField()
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/infogerencial/getapsDesCostUnico", new { id = 55, aps = Api.Aps, anno = Api.Anno, mes = Api.Mes, isnew = false });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal((55, Api.Aps, Api.Anno, Api.Mes, false), Assert.Single(factory.InfoGerencial.CatalogoCalls));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal("VALOR", row.GetProperty("PARA_NOMBRE").GetString());

        var nuevo = await client.PostAsJsonAsync("/api/v1/infogerencial/getapsDesCostUnico", new { id = 0, aps = Api.Aps, anno = Api.Anno, mes = Api.Mes, isnew = true });
        Assert.Equal(HttpStatusCode.OK, nuevo.StatusCode);
        Assert.True(factory.InfoGerencial.CatalogoCalls[1].IsNew);
    }

    // Legacy Descuentos.vue:291-297 loads the dropdown with getapsDesCostUnico(null, aps, anno, mes, false), i.e. body
    // {id: null, ...}; legacy suministros/controller.js:775-777 bound DESC_ID = null and answered 200 with the available costs.
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, "getapsDesCostUnico null id"): the new API rejects
    // id null with 400 before reaching the repository; the new frontend never sends it (it sends a numeric id).
    [Fact]
    public async Task GetApsDesCostUnicoRejectsTheLegacyNullIdWithoutQuerying()
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/infogerencial/getapsDesCostUnico", new { id = (int?)null, aps = Api.Aps, anno = Api.Anno, mes = Api.Mes, isnew = false });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.InfoGerencial.CatalogoCalls);
    }

    // Legacy suministros/routes.js:112-116 (POST /setapsDesCost, body {aps, anno, mes, id, valor}, usuario = req.SISU_ID) and
    // suministros/controller.js:711-724: INSERT INTO AUCO_INFOAPSDESCOST VALUES(seq, :1 aps, :2 anno, :3 mes, :4 id
    // (PARA_COSTO20010, Descuentos.vue:230 selectedDesc.PARA_PARA), :5 valor, 1, SYSDATE, :6 usuario).
    [Fact]
    public async Task SetApsDesCostInsertsWithTheTokenUser()
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory, sisuId: 404);

        var response = await client.PostAsJsonAsync("/api/v1/infogerencial/setapsDesCost", new { aps = Api.Aps, anno = Api.Anno, mes = 2, id = 20, valor = 12.5m });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal("Descuento registrado correctamente.", body.GetProperty("message").GetString());
        Assert.Equal((Api.Aps, Api.Anno, 2, 20, 12.5m, 404L), Assert.Single(factory.InfoGerencial.Inserts));
    }

    // Legacy suministros/routes.js:141-148 (POST /uptapsDesCost, body {aps, anno, mes, id, valor}) and
    // suministros/controller.js:784-793: UPDATE ... SET DESC_VALOR = Number(valor) WHERE APSA_ID, DESC_ANNO, DESC_MES,
    // PARA_COSTO20010 = id. Legacy sent valor as the InputText string (Descuentos.vue:92-98 v-model without .number).
    [Fact]
    public async Task UptApsDesCostUpdatesByParaCostoAndAcceptsTheLegacyStringValor()
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = Api.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/infogerencial/uptapsDesCost", new { aps = Api.Aps, anno = Api.Anno, mes = 2, id = 20, valor = "7.25" });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal("Descuento actualizado correctamente.", body.GetProperty("message").GetString());
        Assert.Equal((Api.Aps, Api.Anno, 2, 20, 7.25m), Assert.Single(factory.InfoGerencial.Updates));
    }
}

public sealed class LegacyT1InformesGerencialesTokenTests
{
    // Legacy middlewares/authJwt.js:12-15: no x-access-token -> 403 {"message":"No existe token de verificacion"}.
    // facturacion/routes.js:5-33, infogenerales/routes.js:7-33 and infogerenciales/routes.js:51 had no token check in legacy;
    // the new API requires it on every /api/v1 route (recorded deviation parity-review-all.md S10, Program.cs).
    [Theory]
    [InlineData("/api/v1/facturacion/facturacion")]
    [InlineData("/api/v1/facturacion/detafacturacion")]
    [InlineData("/api/v1/facturacion/facturacionclus")]
    [InlineData("/api/v1/facturacion/facturaciondinc")]
    [InlineData("/api/v1/facturacion/facturacionelectronica")]
    [InlineData("/api/v1/infogenerales/consultaenergia")]
    [InlineData("/api/v1/infogenerales/consultaacueducto")]
    [InlineData("/api/v1/infogenerales/consultacostos")]
    [InlineData("/api/v1/infogenerales/consultatarifas")]
    [InlineData("/api/v1/infogenerales/consultaHistorialCertificaciones")]
    [InlineData("/api/v1/infogenerales/consultaHistorialProductividad")]
    [InlineData("/api/v1/infogerencial/detcostos")]
    [InlineData("/api/v1/infogerencial/detsubaporte")]
    [InlineData("/api/v1/infogerencial/infoapsemprdivi")]
    [InlineData("/api/v1/infogerencial/infoemprdivi")]
    [InlineData("/api/v1/infogerencial/infoapsrelleno")]
    [InlineData("/api/v1/infogerencial/getDashBoardGerencial")]
    [InlineData("/api/v1/infogerencial/costoPoda")]
    [InlineData("/api/v1/infogerencial/getapsDesCost")]
    [InlineData("/api/v1/infogerencial/getapsDesCostUnico")]
    [InlineData("/api/v1/infogerencial/setapsDesCost")]
    [InlineData("/api/v1/infogerencial/uptapsDesCost")]
    public async Task WithoutTokenTheLegacy403IsReturnedAndNoRepositoryRuns(string url)
    {
        using var factory = new LegacyT1StubApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(url, new { aps = Api.Aps, anno = Api.Anno, mes = Api.Mes, apsaid = 7, proyid = 31, id = 20, valor = 1 });
        var body = await Api.Json(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", body.GetProperty("message").GetString());
        Assert.Equal(0, factory.Facturacion.Calls.Count + factory.InfoGenerales.CallCount + factory.InfoGerencial.CallCount);
    }
}

file static class Api
{
    internal const int Aps = 7;
    internal const int Anno = 2025;
    internal const int Mes = 3;

    internal static HttpClient Client(WebApplicationFactory<Program> factory, long sisuId = TestJwt.AdminSisuId)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(sisuId, 1));
        return client;
    }

    internal static async Task<JsonElement> Json(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

    internal static IReadOnlyList<object> Row(params (string Column, object Value)[] columns)
        => [columns.ToDictionary(c => c.Column, c => c.Value, StringComparer.OrdinalIgnoreCase)];
}

file sealed class LegacyT1StubApiFactory : WebApplicationFactory<Program>
{
    internal StubFacturacionRepository Facturacion { get; } = new();
    internal StubInfoGeneralesRepository InfoGenerales { get; } = new();
    internal StubInfoGerencialRepository InfoGerencial { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IFacturacionRepository>();
            services.AddSingleton<IFacturacionRepository>(Facturacion);
            services.RemoveAll<IInfoGeneralesRepository>();
            services.AddSingleton<IInfoGeneralesRepository>(InfoGenerales);
            services.RemoveAll<IInfoGerencialRepository>();
            services.AddSingleton<IInfoGerencialRepository>(InfoGerencial);
        });
    }
}

file sealed class StubFacturacionRepository : IFacturacionRepository
{
    public List<(string Vista, int Aps, int Anno, int Mes)> Calls { get; } = [];

    public Task<IReadOnlyList<IDictionary<string, object?>>> ConsultarAsync(string vista, int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        Calls.Add((vista, aps, anno, mes));
        IReadOnlyList<IDictionary<string, object?>> rows =
            [new Dictionary<string, object?> { ["APSA_ID"] = 7m, ["CLUS_NOMBRE"] = "RESIDENCIAL", ["TARI_MES"] = 2m }];
        return Task.FromResult(rows);
    }
}

file sealed class StubInfoGeneralesRepository : IInfoGeneralesRepository
{
    public List<(string Consulta, long Apsaid, long Proyid, long Usuario)> ProyeccionCalls { get; } = [];
    public List<(string Consulta, int Anno, int Mes, long Usuario)> HistorialCalls { get; } = [];
    public bool Empty { get; set; }
    public int CallCount => ProyeccionCalls.Count + HistorialCalls.Count;

    public Task<IReadOnlyList<object>> ConsultaEnergiaAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken)
        => Proyeccion("energia", apsaid, proyid, usuario, "FAEN_TOTAL");

    public Task<IReadOnlyList<object>> ConsultaAcueductoAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken)
        => Proyeccion("acueducto", apsaid, proyid, usuario, "FACU_TOTAL");

    public Task<IReadOnlyList<object>> ConsultaCostosAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken)
        => Proyeccion("costos", apsaid, proyid, usuario, "COST_CCS");

    public Task<IReadOnlyList<object>> ConsultaTarifasAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken)
        => Proyeccion("tarifas", apsaid, proyid, usuario, "TARI_TOTAL");

    public Task<IReadOnlyList<object>> ConsultaHistorialCertificacionesAsync(int anno, int mes, long usuario, CancellationToken cancellationToken)
        => Historial("certificaciones", anno, mes, usuario, "TACE_ANNO");

    public Task<IReadOnlyList<object>> ConsultaHistorialProductividadAsync(int anno, int mes, long usuario, CancellationToken cancellationToken)
        => Historial("productividad", anno, mes, usuario, "PR22_ANNO");

    private Task<IReadOnlyList<object>> Proyeccion(string consulta, long apsaid, long proyid, long usuario, string column)
    {
        ProyeccionCalls.Add((consulta, apsaid, proyid, usuario));
        return Task.FromResult(Empty ? [] : Api.Row(("CLAS_NOMBRE", "RESIDENCIAL"), (column, 1250.5m)));
    }

    private Task<IReadOnlyList<object>> Historial(string consulta, int anno, int mes, long usuario, string column)
    {
        HistorialCalls.Add((consulta, anno, mes, usuario));
        return Task.FromResult(Empty ? [] : Api.Row(("CODAPS", 7m), (column, 2025m)));
    }
}

file sealed class StubInfoGerencialRepository : IInfoGerencialRepository
{
    public List<(string Endpoint, int Aps, int Anno, int Mes)> Calls { get; } = [];
    public List<(int Anno, int Mes, long Usuario)> DashboardCalls { get; } = [];
    public List<(int Id, int Aps, int Anno, int Mes, bool IsNew)> CatalogoCalls { get; } = [];
    public List<(int Aps, int Anno, int Mes, int ParaId, decimal Valor, long Usuario)> Inserts { get; } = [];
    public List<(int Aps, int Anno, int Mes, int ParaId, decimal Valor)> Updates { get; } = [];
    public int CallCount => Calls.Count + DashboardCalls.Count + CatalogoCalls.Count + Inserts.Count + Updates.Count;

    public Task<IReadOnlyList<object>> GetDetalleCostosAsync(int anno, int mes, CancellationToken cancellationToken)
        => Record("detcostos", 0, anno, mes, "APSA_NOMAPS");

    public Task<IReadOnlyList<object>> GetDetalleSubAporteAsync(int anno, int mes, CancellationToken cancellationToken)
        => Record("detsubaporte", 0, anno, mes, "PARA_NOMBRE");

    public Task<IReadOnlyList<object>> GetInfoApsEmprDiviAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => Record("infoapsemprdivi", aps, anno, mes, "DIVI_NOMBRE");

    public Task<IReadOnlyList<object>> GetInfoEmprDiviAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => Record("infoemprdivi", aps, anno, mes, "EMPR_NOMBRE");

    public Task<IReadOnlyList<object>> GetInfoApsRellenoAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => Record("infoapsrelleno", aps, anno, mes, "RELL_NOMRELLENO");

    public Task<IReadOnlyList<object>> GetDashBoardGerencialAsync(int anno, int mes, long usuario, CancellationToken cancellationToken)
    {
        DashboardCalls.Add((anno, mes, usuario));
        return Task.FromResult(Api.Row(
            ("APSA_ID", 7m), ("APSA_NOMAPS", "APS NORTE"), ("TARI_FECHACREACION", new DateTime(2025, 2, 28)), ("SISU_CORREO", "user@veolia.test")));
    }

    public Task<IReadOnlyList<object>> GetCostoPodaAsync(int aps, CancellationToken cancellationToken)
        => Record("costoPoda", aps, 0, 0, "PERIODO");

    public Task<IReadOnlyList<object>> GetDescuentosAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => Record("getapsDesCost", aps, anno, mes, "PARA_NOMBRE");

    public Task<IReadOnlyList<object>> GetCatalogoDescuentoAsync(int id, int aps, int anno, int mes, bool isNew, CancellationToken cancellationToken)
    {
        CatalogoCalls.Add((id, aps, anno, mes, isNew));
        return Task.FromResult(Api.Row(("PARA_PARA", 20m), ("PARA_NOMBRE", "VALOR"), ("DESC_VALOR", 0m)));
    }

    public Task InsertDescuentoAsync(int aps, int anno, int mes, int paraId, decimal valor, long usuario, CancellationToken cancellationToken)
    {
        Inserts.Add((aps, anno, mes, paraId, valor, usuario));
        return Task.CompletedTask;
    }

    public Task UpdateDescuentoAsync(int aps, int anno, int mes, int paraId, decimal valor, CancellationToken cancellationToken)
    {
        Updates.Add((aps, anno, mes, paraId, valor));
        return Task.CompletedTask;
    }

    private Task<IReadOnlyList<object>> Record(string endpoint, int aps, int anno, int mes, string column)
    {
        Calls.Add((endpoint, aps, anno, mes));
        return Task.FromResult(Api.Row((column, "VALOR")));
    }
}
