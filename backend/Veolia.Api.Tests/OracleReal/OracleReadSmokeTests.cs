using System.Collections.Concurrent;
using System.Data;
using System.Data.Common;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Veolia.Api.Infrastructure.Data;
using Xunit.Abstractions;

namespace Veolia.Api.Tests.OracleReal;

/// <summary>
/// Opt-in smoke tests of every read-only route (OracleReal/read-only-routes.txt) against the real
/// Oracle database, through the real ASP.NET pipeline, repositories and Dapper/DTO mapping.
/// Skipped unless VEOLIA_ORACLE_TESTS=1. Only the routes in the allow-list are ever called: every
/// other route can write to a shared database.
/// </summary>
public sealed class OracleReadSmokeTests(OracleReadSmokeFixture fixture, ITestOutputHelper output)
    : IClassFixture<OracleReadSmokeFixture>
{
    [Fact]
    public void Read_route_cases_match_the_allow_list_exactly()
    {
        var cases = typeof(OracleReadSmokeTests)
            .GetMethod(nameof(Read_route_answers_without_server_error))!
            .GetCustomAttributes<InlineDataAttribute>()
            .Select(attribute => (string)attribute.GetData(null!).Single()[0])
            .ToList();

        Assert.Equal(cases.Count, cases.Distinct(StringComparer.Ordinal).Count());
        Assert.Equal(AllowList.Routes.OrderBy(r => r, StringComparer.Ordinal), cases.OrderBy(r => r, StringComparer.Ordinal));
        Assert.Equal(172, cases.Count);
    }

    [OracleTheory]
    [InlineData("POST /api/v1/aprovechamiento/consulta")]
    [InlineData("GET /api/v1/aps")]
    [InlineData("POST /api/v1/aps/consultaaps")]
    [InlineData("POST /api/v1/aps/consultageneral")]
    [InlineData("POST /api/v1/aps/usuarioPorAPS")]
    [InlineData("GET /api/v1/auth/allSistemas")]
    [InlineData("GET /api/v1/auth/getAllUsers")]
    [InlineData("POST /api/v1/auth/getApsAsignadas")]
    [InlineData("POST /api/v1/auth/getGeneralMenuTree")]
    [InlineData("POST /api/v1/auth/getMenuByUser")]
    [InlineData("POST /api/v1/auth/getMenuCatalog")]
    [InlineData("POST /api/v1/auth/getMenuUserOptions")]
    [InlineData("GET /api/v1/auth/getSistemasByCorreo")]
    [InlineData("POST /api/v1/auth/getSistemasPorUsuario")]
    [InlineData("POST /api/v1/auth/getUserbyId")]
    [InlineData("POST /api/v1/auth/getUserMenu")]
    [InlineData("POST /api/v1/costos/comportaclus")]
    [InlineData("POST /api/v1/costos/consultar")]
    [InlineData("POST /api/v1/costos/cosclus")]
    [InlineData("GET /api/v1/empresas")]
    [InlineData("POST /api/v1/empresas/consultaempr")]
    [InlineData("POST /api/v1/empresas/consultarpropias")]
    [InlineData("POST /api/v1/facturacion/detafacturacion")]
    [InlineData("POST /api/v1/facturacion/facturacion")]
    [InlineData("POST /api/v1/facturacion/facturacionclus")]
    [InlineData("POST /api/v1/facturacion/facturaciondinc")]
    [InlineData("POST /api/v1/facturacion/facturacionelectronica")]
    [InlineData("GET /api/v1/general/consultauso")]
    [InlineData("GET /api/v1/general/paracostos")]
    [InlineData("GET /api/v1/general/paraindices")]
    [InlineData("GET /api/v1/indices")]
    [InlineData("GET /api/v1/indices/{id:long}")]
    [InlineData("GET /api/v1/indices/catalogo")]
    [InlineData("POST /api/v1/indices/consulta")]
    [InlineData("POST /api/v1/infogenerales/consultaacueducto")]
    [InlineData("POST /api/v1/infogenerales/consultacostos")]
    [InlineData("POST /api/v1/infogenerales/consultaenergia")]
    [InlineData("POST /api/v1/infogenerales/consultaHistorialCertificaciones")]
    [InlineData("POST /api/v1/infogenerales/consultaHistorialProductividad")]
    [InlineData("POST /api/v1/infogenerales/consultatarifas")]
    [InlineData("POST /api/v1/infogerencial/costoPoda")]
    [InlineData("POST /api/v1/infogerencial/detcostos")]
    [InlineData("POST /api/v1/infogerencial/detsubaporte")]
    [InlineData("POST /api/v1/infogerencial/getapsDesCost")]
    [InlineData("POST /api/v1/infogerencial/getapsDesCostUnico")]
    [InlineData("POST /api/v1/infogerencial/getDashBoardGerencial")]
    [InlineData("POST /api/v1/infogerencial/infoapsemprdivi")]
    [InlineData("POST /api/v1/infogerencial/infoapsrelleno")]
    [InlineData("POST /api/v1/infogerencial/infoemprdivi")]
    [InlineData("GET /api/v1/informes/clus")]
    [InlineData("GET /api/v1/informes/costos")]
    [InlineData("POST /api/v1/kilometros/lbl")]
    [InlineData("POST /api/v1/pgirs/barrido")]
    [InlineData("POST /api/v1/pgirs/infoPgirs")]
    [InlineData("POST /api/v1/pgirs/informe-variables")]
    [InlineData("POST /api/v1/pgirs/informePgirs")]
    [InlineData("POST /api/v1/pgirs/resumen")]
    [InlineData("POST /api/v1/pgirs/variables")]
    [InlineData("POST /api/v1/productividad/consulta")]
    [InlineData("POST /api/v1/proyecciones/consulta")]
    [InlineData("POST /api/v1/proyecciones/consultabyid")]
    [InlineData("POST /api/v1/proyecciones/consultageneral")]
    [InlineData("POST /api/v1/proyecciones/consultaproy")]
    [InlineData("POST /api/v1/proyecciones/consultarclasesuso")]
    [InlineData("POST /api/v1/proyecciones/consultarcrecimiento")]
    [InlineData("POST /api/v1/proyecciones/consultasubcont")]
    [InlineData("POST /api/v1/proyecciones/ultimastarifas")]
    [InlineData("POST /api/v1/reliqCargue/compararCostos")]
    [InlineData("POST /api/v1/reliqCargue/compararTarifas")]
    [InlineData("POST /api/v1/reliqCargue/getReliInfoAdicional")]
    [InlineData("POST /api/v1/reliqCargue/getReliInfoUsuarios")]
    [InlineData("POST /api/v1/reliqCargue/getResumenAPS")]
    [InlineData("POST /api/v1/reliqCargue/getResumenEmpresa")]
    [InlineData("POST /api/v1/reliqCargue/getResumenRelleno")]
    [InlineData("POST /api/v1/reliqCargue/resumenCompararTarifas")]
    [InlineData("POST /api/v1/reliqCrear/getReliquidacionByAps")]
    [InlineData("POST /api/v1/reliqCrear/getReliquidaciones")]
    [InlineData("POST /api/v1/reliqTarificador/estadoReliquidacion")]
    [InlineData("POST /api/v1/reliqTarificador/resumenAdicional")]
    [InlineData("POST /api/v1/reliqTarificador/resumenAPS")]
    [InlineData("POST /api/v1/reliqTarificador/resumenEmpresa")]
    [InlineData("POST /api/v1/reliqTarificador/resumenRelleno")]
    [InlineData("POST /api/v1/reliqTarificador/resumenUsuarios")]
    [InlineData("GET /api/v1/rellenos")]
    [InlineData("POST /api/v1/rellenos/consultarrelleno")]
    [InlineData("GET /api/v1/reversiones/detalladoAutorizacion")]
    [InlineData("GET /api/v1/subcon")]
    [InlineData("POST /api/v1/subcon/consulta")]
    [InlineData("POST /api/v1/sui/consuforma24")]
    [InlineData("POST /api/v1/sui/consuforma35")]
    [InlineData("POST /api/v1/sui/consuforma36")]
    [InlineData("POST /api/v1/sui/consuformu19")]
    [InlineData("POST /api/v1/sui/consuformu23")]
    [InlineData("POST /api/v1/sui/dashboard")]
    [InlineData("POST /api/v1/sui/existenArchivosGenerados")]
    [InlineData("POST /api/v1/sui/getcanCertificate")]
    [InlineData("POST /api/v1/sui/resumenF19")]
    [InlineData("POST /api/v1/sui/resumenF23")]
    [InlineData("POST /api/v1/sui/resumenF24")]
    [InlineData("POST /api/v1/sui/resumenF35")]
    [InlineData("POST /api/v1/sui/resumenF36")]
    [InlineData("POST /api/v1/sui/reversionesF19")]
    [InlineData("POST /api/v1/sui/reversionesF23")]
    [InlineData("POST /api/v1/sui/reversionesF24")]
    [InlineData("POST /api/v1/sui/reversionesF35")]
    [InlineData("POST /api/v1/sui/reversionesF36")]
    [InlineData("POST /api/v1/sui853/cdft/cdft")]
    [InlineData("POST /api/v1/sui853/cft/cbics-maxmin")]
    [InlineData("POST /api/v1/sui853/cft/cbls")]
    [InlineData("POST /api/v1/sui853/cft/cblus")]
    [InlineData("POST /api/v1/sui853/cft/cblus-maximo")]
    [InlineData("POST /api/v1/sui853/cft/cblus-minimo")]
    [InlineData("POST /api/v1/sui853/cft/cft")]
    [InlineData("POST /api/v1/sui853/cft/cft-seg2")]
    [InlineData("POST /api/v1/sui853/cft/cft-seg3")]
    [InlineData("POST /api/v1/sui853/cft/crlus")]
    [InlineData("POST /api/v1/sui853/cft/crt")]
    [InlineData("POST /api/v1/sui853/cft/crt-seg2")]
    [InlineData("POST /api/v1/sui853/cft/crt-seg3")]
    [InlineData("POST /api/v1/sui853/cft/crts-maximo")]
    [InlineData("POST /api/v1/sui853/cft/crts-maximo-seg2")]
    [InlineData("POST /api/v1/sui853/cft/crts-maximo-seg3")]
    [InlineData("POST /api/v1/sui853/cft/crts-minimo")]
    [InlineData("POST /api/v1/sui853/cft/crts-minimo-seg2")]
    [InlineData("POST /api/v1/sui853/cft/crts-minimo-seg3")]
    [InlineData("POST /api/v1/sui853/cft/css-aprovechamiento")]
    [InlineData("POST /api/v1/sui853/cft/css-aprovechamiento-seg2")]
    [InlineData("POST /api/v1/sui853/cft/css-aprovechamiento-seg3")]
    [InlineData("POST /api/v1/sui853/cft/cva")]
    [InlineData("POST /api/v1/sui853/cft/cva-seg2")]
    [InlineData("POST /api/v1/sui853/cft/cva-seg3")]
    [InlineData("POST /api/v1/sui853/cft/cvna")]
    [InlineData("POST /api/v1/sui853/cft/cvna-seg2")]
    [InlineData("POST /api/v1/sui853/cft/cvna-seg3")]
    [InlineData("POST /api/v1/sui853/comercial/residuosGeneradosInforme")]
    [InlineData("POST /api/v1/sui853/comercial/resumenResiduosGenerados")]
    [InlineData("POST /api/v1/sui853/general/fac")]
    [InlineData("POST /api/v1/sui853/operaciones/residuosGenerados")]
    [InlineData("POST /api/v1/sui853/operaciones/resumenResiduosGenerados")]
    [InlineData("POST /api/v1/sui853Configuracion/getFormularios")]
    [InlineData("POST /api/v1/sui853Configuracion/tablasSui")]
    [InlineData("POST /api/v1/sui853Configuracion/tcfgAps")]
    [InlineData("POST /api/v1/sui853Configuracion/vcfgapsdocumento")]
    [InlineData("POST /api/v1/sui853Configuracion/vcfgapsempresa")]
    [InlineData("POST /api/v1/suministros/cenrtificarEditar")]
    [InlineData("POST /api/v1/suministros/certificarMensual")]
    [InlineData("POST /api/v1/suministros/consultaCostoPoda")]
    [InlineData("POST /api/v1/suministros/existeRelleno")]
    [InlineData("POST /api/v1/suministros/getcanCertificate")]
    [InlineData("POST /api/v1/suministros/getcanCertificateSemestral")]
    [InlineData("POST /api/v1/suministros/getPoda")]
    [InlineData("GET /api/v1/suministros/getReversion")]
    [InlineData("POST /api/v1/suministros/plcertificarSemestral")]
    [InlineData("POST /api/v1/tafna/tafna")]
    [InlineData("POST /api/v1/tarifas")]
    [InlineData("POST /api/v1/tarifas/consultageneral")]
    [InlineData("POST /api/v1/tarifas/resumen")]
    [InlineData("POST /api/v1/tarifas/tarxcom")]
    [InlineData("POST /api/v1/tarifas/tarxcomgeneral")]
    [InlineData("POST /api/v1/toneladas/detalle")]
    [InlineData("POST /api/v1/toneladas/qa")]
    [InlineData("POST /api/v1/toneladas/qrt")]
    [InlineData("POST /api/v1/trna/trna")]
    [InlineData("POST /api/v1/usuarios/usuadeta")]
    [InlineData("POST /api/v1/usuarios/usuagraf")]
    [InlineData("POST /api/v1/validaciones/certificarFauco_cpenero")]
    [InlineData("POST /api/v1/validaciones/certificarFauco_cpproductividad")]
    [InlineData("POST /api/v1/validaciones/certificarFauco_cpsuivsfact")]
    [InlineData("POST /api/v1/validaciones/certificarfauco_existarifa")]
    [InlineData("POST /api/v1/validaciones/certificarfauco_existarifacert")]
    [InlineData("POST /api/v1/validaciones/certificarfauco_existerelleno")]
    [InlineData("POST /api/v1/validaciones/certificarFauco_integracion")]
    public async Task Read_route_answers_without_server_error(string route)
    {
        // Defense in depth: never send a request for a route outside the read-only allow-list.
        Assert.Contains(route, AllowList.Routes);

        var parameters = await fixture.GetParametersAsync();
        var request = RouteRequests.Build(route, parameters);
        var client = fixture.Client;

        fixture.Logs.Clear();
        using var message = new HttpRequestMessage(request.Method, request.Path);
        message.Headers.Add("x-access-token", TestJwt.Build(parameters.AdminSisuId, request.IdSistema));
        if (request.Method != HttpMethod.Get)
        {
            message.Content = JsonContent.Create(request.Body ?? new { });
        }

        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(message);
        }
        catch (Exception ex)
        {
            Assert.Fail($"{route}: unhandled server exception {ex.GetType().Name}: {ex.Message} {fixture.Logs.Describe()}");
            return;
        }

        using (response)
        {
            var text = await response.Content.ReadAsStringAsync();
            var status = (int)response.StatusCode;

            Assert.True(status < 500, $"{route}: HTTP {status} body={Truncate(text)} {fixture.Logs.Describe()}");

            using var document = JsonDocument.Parse(text);

            // Discovery picks parameters that have data, so the legacy "not found" 404s
            // (indices/{id}, consultaproy, RELIQ_NOT_FOUND) are findings here, not empty results.
            Assert.True(status == 200, $"{route}: HTTP {status} body={Truncate(text)} {fixture.Logs.Describe()}");
            output.WriteLine($"{route}: HTTP 200 rows={RowCount.Describe(document.RootElement)}");
        }
    }

    private static string Truncate(string text) => text.Length <= 600 ? text : text[..600] + "...";
}

public sealed class OracleReadSmokeFixture : IDisposable
{
    private readonly Lazy<RealOracleApiFactory> factory = new(() => new RealOracleApiFactory());
    private readonly Lazy<HttpClient> client;
    private readonly SemaphoreSlim gate = new(1, 1);
    private OracleReadParameters? parameters;

    public OracleReadSmokeFixture()
    {
        client = new Lazy<HttpClient>(() =>
        {
            var created = factory.Value.CreateClient();
            created.Timeout = TimeSpan.FromMinutes(5);
            return created;
        });
    }

    internal HttpClient Client => client.Value;

    internal CapturedLogs Logs => factory.Value.Logs;

    internal async Task<OracleReadParameters> GetParametersAsync()
    {
        await gate.WaitAsync();
        try
        {
            return parameters ??= await DiscoverAsync();
        }
        finally
        {
            gate.Release();
        }
    }

    // Read-only discovery of real parameters, through the app's own connection factory
    // (CURRENT_SCHEMA = TARIFICADOR).
    private async Task<OracleReadParameters> DiscoverAsync()
    {
        using var scope = factory.Value.Services.CreateScope();
        using var connection = scope.ServiceProvider.GetRequiredService<IOracleConnectionFactory>().CreateConnection();
        await ((DbConnection)connection).OpenAsync();

        var adminSisuId = await Single<long>(connection, @"
SELECT um.sisu_id FROM auge_usuamenu um
  JOIN auge_menu m ON m.menu_id = um.menu_id
  JOIN auge_sisusuario s ON s.sisu_id = um.sisu_id
 WHERE um.menu_id = 204 AND m.menu_sistema = 1 AND um.usme_estado = 1 AND m.menu_estado = 1
   AND s.sisu_estado = 1 AND ROWNUM = 1");
        var adminCorreo = await Single<string>(connection,
            "SELECT sisu_correo FROM auge_sisusuario WHERE sisu_id = :id", new { id = adminSisuId });

        var tarifa = await Row(connection, @"
SELECT * FROM (SELECT apsa_id, tari_anno, tari_mes FROM auco_tarifas
                ORDER BY tari_anno DESC, tari_mes DESC, apsa_id) WHERE ROWNUM = 1");
        int aps = Int(tarifa, 0), anno = Int(tarifa, 1), mes = Int(tarifa, 2);
        var (semesterAnno, semester) = mes >= 12 ? (anno, 2) : mes >= 6 ? (anno, 1) : (anno - 1, 2);

        var empr = await Single<long>(connection, @"
SELECT * FROM (SELECT e.empr_empr FROM auge_empresas e
                 JOIN auco_apsemprdivi d ON d.empr_empr = e.empr_empr
                WHERE d.apsa_id = :aps ORDER BY 1) WHERE ROWNUM = 1", new { aps });

        var indice = await Row(connection, @"
SELECT * FROM (SELECT indi_id, indi_anno, indi_mes FROM auco_indicescra WHERE indi_estado = 1
                ORDER BY indi_anno DESC, indi_mes DESC, indi_id DESC) WHERE ROWNUM = 1");

        var rellId = await Single<long>(connection, "SELECT MAX(rell_id) FROM auco_rellenos WHERE rell_id > 0");

        // Prefer an active projection that has subsidy/contribution rows; fall back to any active one.
        var proy = await Row(connection, @"
SELECT * FROM (SELECT p.proyid, p.aps, s.suco_anno, s.suco_mes FROM proy_proyeccion p
                 JOIN proy_apssubscont s ON s.proy_id = p.proyid AND s.apsa_id = p.aps
                WHERE p.proyestado = 1
                ORDER BY p.proyid DESC, s.suco_anno DESC, s.suco_mes DESC) WHERE ROWNUM = 1")
            ?? await Row(connection, @"
SELECT * FROM (SELECT proyid, aps, proyannodes, proymesdes FROM proy_proyeccion
                WHERE proyestado = 1 ORDER BY proyid DESC) WHERE ROWNUM = 1");

        // Prefer an open reliquidation with comparison rows; fall back to the latest open one.
        var reliq = await Row(connection, @"
SELECT * FROM (SELECT r.relqid, r.apsaid, r.relqdesde FROM reliq.relqreliquida r
                WHERE r.relqestado = '1'
                  AND EXISTS (SELECT 1 FROM reliq.vrel_comparacostos c WHERE c.codreliq = r.relqid)
                  AND EXISTS (SELECT 1 FROM reliq.vrel_comparatarifacobro t WHERE t.reli = r.relqid)
                ORDER BY r.relqid DESC) WHERE ROWNUM = 1")
            ?? await Row(connection, @"
SELECT * FROM (SELECT relqid, apsaid, relqdesde FROM reliq.relqreliquida
                WHERE relqestado = '1' ORDER BY relqid DESC) WHERE ROWNUM = 1");
        var reliqDesde = Int(reliq, 2);

        var cdftAnno = await Single<int>(connection, "SELECT MAX(anno_fiscal) FROM sui.tcdft_qrt_anual");
        var comercial = await Row(connection, @"
SELECT * FROM (SELECT aps, anno, mes FROM sui.tgen_comercial
                GROUP BY aps, anno, mes ORDER BY anno DESC, mes DESC, aps) WHERE ROWNUM = 1");
        var residuos = await Row(connection, @"
SELECT * FROM (SELECT aps, anno, mes FROM sui.tgen_resgenerados
                GROUP BY aps, anno, mes ORDER BY anno DESC, mes DESC, aps) WHERE ROWNUM = 1");

        return new OracleReadParameters(
            adminSisuId, adminCorreo,
            aps, anno, mes, semesterAnno, semester, empr,
            Long(indice, 0), Int(indice, 1), Int(indice, 2),
            rellId,
            Long(proy, 0), Long(proy, 1), Int(proy, 2), Int(proy, 3),
            Long(reliq, 0), Long(reliq, 1), reliqDesde / 100, reliqDesde % 100,
            cdftAnno,
            Convert.ToString(comercial![0])!, Int(comercial, 1), Int(comercial, 2),
            Convert.ToString(residuos![0])!, Int(residuos, 1), Int(residuos, 2));
    }

    private static Task<T> Single<T>(IDbConnection connection, string sql, object? args = null)
        => connection.ExecuteScalarAsync<T>(sql, args)!;

    private static async Task<object[]?> Row(IDbConnection connection, string sql)
    {
        using var command = ((DbConnection)connection).CreateCommand();
        command.CommandText = sql;
        using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        var values = new object[reader.FieldCount];
        reader.GetValues(values);
        return values;
    }

    private static int Int(object[]? row, int index) => Convert.ToInt32(row![index]);

    private static long Long(object[]? row, int index) => Convert.ToInt64(row![index]);

    public void Dispose()
    {
        if (client.IsValueCreated)
        {
            client.Value.Dispose();
        }

        if (factory.IsValueCreated)
        {
            factory.Value.Dispose();
        }

        gate.Dispose();
    }

    // Real API: no service replaced. The Oracle connection string comes from the API project's
    // local appsettings.json (its content root); only the JWT secret is injected.
    private sealed class RealOracleApiFactory : WebApplicationFactory<Program>
    {
        internal CapturedLogs Logs { get; } = new();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
            builder.ConfigureLogging(logging => logging.AddProvider(new CapturedLogsProvider(Logs)));
        }
    }
}

internal sealed record OracleReadParameters(
    long AdminSisuId,
    string AdminCorreo,
    int Aps,
    int Anno,
    int Mes,
    int SemesterAnno,
    int Semester,
    long EmprId,
    long IndiceId,
    int IndiceAnno,
    int IndiceMes,
    long RellId,
    long ProyId,
    long ProyAps,
    int ProyAnno,
    int ProyMes,
    long ReliqId,
    long ReliqAps,
    int ReliqAnno,
    int ReliqMes,
    int CdftAnno,
    string ComercialAps,
    int ComercialAnno,
    int ComercialMes,
    string ResiduosAps,
    int ResiduosAnno,
    int ResiduosMes);

internal sealed record RouteRequest(HttpMethod Method, string Path, object? Body, int IdSistema);

internal static class RouteRequests
{
    internal static RouteRequest Build(string route, OracleReadParameters p)
    {
        var period = new { aps = p.Aps, anno = p.Anno, mes = p.Mes };
        var semester = new { aps = p.Aps, anno = p.SemesterAnno, semestre = p.Semester };
        var onlyAps = new { aps = p.Aps };
        var pgirsAps = new { apsId = p.Aps };
        var annoMes = new { anno = p.Anno, mes = p.Mes };
        var proyeccion = new { apsaid = p.ProyAps, proyid = p.ProyId };
        var reliqBlock = new { idReliq = p.ReliqId };
        var reliqId = new { reliqId = p.ReliqId };
        var periodQuery = $"?aps={p.Aps}&anno={p.Anno}&mes={p.Mes}";

        var (path, body) = route switch
        {
            "POST /api/v1/aprovechamiento/consulta" => (Path(route), (object?)period),
            "GET /api/v1/aps" => (Path(route), null),
            "POST /api/v1/aps/consultaaps" => (Path(route), onlyAps),
            "POST /api/v1/aps/consultageneral" => (Path(route), null),
            "POST /api/v1/aps/usuarioPorAPS" => (Path(route), onlyAps),
            "GET /api/v1/auth/allSistemas" => (Path(route), null),
            "GET /api/v1/auth/getAllUsers" => (Path(route), null),
            "POST /api/v1/auth/getApsAsignadas" => (Path(route), new { id = p.AdminSisuId }),
            "POST /api/v1/auth/getGeneralMenuTree" => (Path(route), new { idSistema = 1 }),
            "POST /api/v1/auth/getMenuByUser" => (Path(route), new { idSistema = 1, sisuId = p.AdminSisuId }),
            "POST /api/v1/auth/getMenuCatalog" => (Path(route), null),
            "POST /api/v1/auth/getMenuUserOptions" => (Path(route), new { id = p.AdminSisuId }),
            "GET /api/v1/auth/getSistemasByCorreo" => (Path(route) + "?correo=" + Uri.EscapeDataString(p.AdminCorreo), null),
            "POST /api/v1/auth/getSistemasPorUsuario" => (Path(route), new { correo = p.AdminCorreo }),
            "POST /api/v1/auth/getUserbyId" => (Path(route), new { id = p.AdminSisuId }),
            "POST /api/v1/auth/getUserMenu" => (Path(route), null),
            "POST /api/v1/costos/comportaclus" => (Path(route), period),
            "POST /api/v1/costos/consultar" => (Path(route), period),
            "POST /api/v1/costos/cosclus" => (Path(route), period),
            "GET /api/v1/empresas" => (Path(route), null),
            "POST /api/v1/empresas/consultaempr" => (Path(route), new { empr = p.EmprId }),
            "POST /api/v1/empresas/consultarpropias" => (Path(route), new { aps = p.Aps, propia = 1 }),
            "POST /api/v1/facturacion/detafacturacion" => (Path(route), period),
            "POST /api/v1/facturacion/facturacion" => (Path(route), period),
            "POST /api/v1/facturacion/facturacionclus" => (Path(route), period),
            "POST /api/v1/facturacion/facturaciondinc" => (Path(route), period),
            "POST /api/v1/facturacion/facturacionelectronica" => (Path(route), period),
            "GET /api/v1/general/consultauso" => (Path(route), null),
            "GET /api/v1/general/paracostos" => (Path(route), null),
            "GET /api/v1/general/paraindices" => (Path(route), null),
            "GET /api/v1/indices" => (Path(route), null),
            "GET /api/v1/indices/{id:long}" => ($"/api/v1/indices/{p.IndiceId}", null),
            "GET /api/v1/indices/catalogo" => (Path(route), null),
            "POST /api/v1/indices/consulta" => (Path(route), new { anno = p.IndiceAnno, mes = p.IndiceMes }),
            "POST /api/v1/infogenerales/consultaacueducto" => (Path(route), proyeccion),
            "POST /api/v1/infogenerales/consultacostos" => (Path(route), proyeccion),
            "POST /api/v1/infogenerales/consultaenergia" => (Path(route), proyeccion),
            "POST /api/v1/infogenerales/consultaHistorialCertificaciones" => (Path(route), annoMes),
            "POST /api/v1/infogenerales/consultaHistorialProductividad" => (Path(route), annoMes),
            "POST /api/v1/infogenerales/consultatarifas" => (Path(route), proyeccion),
            "POST /api/v1/infogerencial/costoPoda" => (Path(route), onlyAps),
            "POST /api/v1/infogerencial/detcostos" => (Path(route), annoMes),
            "POST /api/v1/infogerencial/detsubaporte" => (Path(route), annoMes),
            "POST /api/v1/infogerencial/getapsDesCost" => (Path(route), period),
            "POST /api/v1/infogerencial/getapsDesCostUnico" => (Path(route), new { id = 0, aps = p.Aps, anno = p.Anno, mes = p.Mes, isNew = true }),
            "POST /api/v1/infogerencial/getDashBoardGerencial" => (Path(route), annoMes),
            "POST /api/v1/infogerencial/infoapsemprdivi" => (Path(route), period),
            "POST /api/v1/infogerencial/infoapsrelleno" => (Path(route), period),
            "POST /api/v1/infogerencial/infoemprdivi" => (Path(route), period),
            "GET /api/v1/informes/clus" => (Path(route) + periodQuery, null),
            "GET /api/v1/informes/costos" => (Path(route) + periodQuery, null),
            "POST /api/v1/kilometros/lbl" => (Path(route), period),
            "POST /api/v1/pgirs/barrido" => (Path(route), pgirsAps),
            "POST /api/v1/pgirs/infoPgirs" => (Path(route), pgirsAps),
            "POST /api/v1/pgirs/informe-variables" => (Path(route), pgirsAps),
            "POST /api/v1/pgirs/informePgirs" => (Path(route), pgirsAps),
            "POST /api/v1/pgirs/resumen" => (Path(route), pgirsAps),
            "POST /api/v1/pgirs/variables" => (Path(route), new { apsId = p.Aps, anno = p.Anno, mes = p.Mes }),
            "POST /api/v1/productividad/consulta" => (Path(route), period),
            "POST /api/v1/proyecciones/consulta" => (Path(route), new { apsaId = p.ProyAps }),
            "POST /api/v1/proyecciones/consultabyid" => (Path(route), new { id = p.ProyId }),
            "POST /api/v1/proyecciones/consultageneral" => (Path(route), null),
            "POST /api/v1/proyecciones/consultaproy" => (Path(route), new { id = p.ProyId }),
            "POST /api/v1/proyecciones/consultarclasesuso" => (Path(route), null),
            "POST /api/v1/proyecciones/consultarcrecimiento" => (Path(route), new { proyId = p.ProyId }),
            "POST /api/v1/proyecciones/consultasubcont" => (Path(route), new { apsaId = p.ProyAps, proyId = p.ProyId, anno = p.ProyAnno, mes = p.ProyMes }),
            "POST /api/v1/proyecciones/ultimastarifas" => (Path(route), new { apsaId = p.ProyAps }),
            "POST /api/v1/reliqCargue/compararCostos" => (Path(route), new { reliq = p.ReliqId }),
            "POST /api/v1/reliqCargue/compararTarifas" => (Path(route), new { reliq = p.ReliqId }),
            "POST /api/v1/reliqCargue/getReliInfoAdicional" => (Path(route), reliqBlock),
            "POST /api/v1/reliqCargue/getReliInfoUsuarios" => (Path(route), reliqBlock),
            "POST /api/v1/reliqCargue/getResumenAPS" => (Path(route), reliqBlock),
            "POST /api/v1/reliqCargue/getResumenEmpresa" => (Path(route), reliqBlock),
            "POST /api/v1/reliqCargue/getResumenRelleno" => (Path(route), reliqBlock),
            "POST /api/v1/reliqCargue/resumenCompararTarifas" => (Path(route), new { reliq = p.ReliqId, apsaId = p.ReliqAps, anno = p.ReliqAnno, mes = p.ReliqMes }),
            "POST /api/v1/reliqCrear/getReliquidacionByAps" => (Path(route), new { apsaId = p.ReliqAps }),
            "POST /api/v1/reliqCrear/getReliquidaciones" => (Path(route), new { apsaId = p.ReliqAps }),
            "POST /api/v1/reliqTarificador/estadoReliquidacion" => (Path(route), reliqId),
            "POST /api/v1/reliqTarificador/resumenAdicional" => (Path(route), reliqId),
            "POST /api/v1/reliqTarificador/resumenAPS" => (Path(route), reliqId),
            "POST /api/v1/reliqTarificador/resumenEmpresa" => (Path(route), reliqId),
            "POST /api/v1/reliqTarificador/resumenRelleno" => (Path(route), reliqId),
            "POST /api/v1/reliqTarificador/resumenUsuarios" => (Path(route), reliqId),
            "GET /api/v1/rellenos" => (Path(route), null),
            "POST /api/v1/rellenos/consultarrelleno" => (Path(route), new { rell_id = p.RellId }),
            "GET /api/v1/reversiones/detalladoAutorizacion" => (Path(route), null),
            "GET /api/v1/subcon" => (Path(route), null),
            "POST /api/v1/subcon/consulta" => (Path(route), period),
            "POST /api/v1/sui/consuforma24" => (Path(route), period),
            "POST /api/v1/sui/consuforma35" => (Path(route), period),
            "POST /api/v1/sui/consuforma36" => (Path(route), period),
            "POST /api/v1/sui/consuformu19" => (Path(route), period),
            "POST /api/v1/sui/consuformu23" => (Path(route), period),
            "POST /api/v1/sui/dashboard" => (Path(route), annoMes),
            "POST /api/v1/sui/existenArchivosGenerados" => (Path(route), period),
            "POST /api/v1/sui/getcanCertificate" => (Path(route), period),
            "POST /api/v1/sui/resumenF19" => (Path(route), onlyAps),
            "POST /api/v1/sui/resumenF23" => (Path(route), onlyAps),
            "POST /api/v1/sui/resumenF24" => (Path(route), onlyAps),
            "POST /api/v1/sui/resumenF35" => (Path(route), onlyAps),
            "POST /api/v1/sui/resumenF36" => (Path(route), onlyAps),
            "POST /api/v1/sui/reversionesF19" => (Path(route), onlyAps),
            "POST /api/v1/sui/reversionesF23" => (Path(route), onlyAps),
            "POST /api/v1/sui/reversionesF24" => (Path(route), onlyAps),
            "POST /api/v1/sui/reversionesF35" => (Path(route), onlyAps),
            "POST /api/v1/sui/reversionesF36" => (Path(route), onlyAps),
            "POST /api/v1/sui853/cdft/cdft" => (Path(route), new { anno = p.CdftAnno }),
            "POST /api/v1/sui853/comercial/residuosGeneradosInforme" => (Path(route), new { apsId = p.ComercialAps, year = p.ComercialAnno, month = p.ComercialMes }),
            "POST /api/v1/sui853/operaciones/residuosGenerados" => (Path(route), new { apsId = p.ResiduosAps, year = p.ResiduosAnno, month = p.ResiduosMes }),
            "POST /api/v1/suministros/cenrtificarEditar" => (Path(route), period),
            "POST /api/v1/suministros/certificarMensual" => (Path(route), period),
            "POST /api/v1/suministros/consultaCostoPoda" => (Path(route), onlyAps),
            "POST /api/v1/suministros/existeRelleno" => (Path(route), semester),
            "POST /api/v1/suministros/getcanCertificate" => (Path(route), period),
            "POST /api/v1/suministros/getcanCertificateSemestral" => (Path(route), semester),
            "POST /api/v1/suministros/getPoda" => (Path(route), period),
            "GET /api/v1/suministros/getReversion" => (Path(route), null),
            "POST /api/v1/suministros/plcertificarSemestral" => (Path(route), semester),
            "POST /api/v1/tafna/tafna" => (Path(route), period),
            "POST /api/v1/tarifas" => (Path(route), period),
            "POST /api/v1/tarifas/consultageneral" => (Path(route), period),
            "POST /api/v1/tarifas/resumen" => (Path(route), period),
            "POST /api/v1/tarifas/tarxcom" => (Path(route), period),
            "POST /api/v1/tarifas/tarxcomgeneral" => (Path(route), annoMes),
            "POST /api/v1/toneladas/detalle" => (Path(route), period),
            "POST /api/v1/toneladas/qa" => (Path(route), period),
            "POST /api/v1/toneladas/qrt" => (Path(route), period),
            "POST /api/v1/trna/trna" => (Path(route), period),
            "POST /api/v1/usuarios/usuadeta" => (Path(route), period),
            "POST /api/v1/usuarios/usuagraf" => (Path(route), period),
            "POST /api/v1/validaciones/certificarFauco_cpenero" => (Path(route), period),
            "POST /api/v1/validaciones/certificarFauco_cpproductividad" => (Path(route), period),
            "POST /api/v1/validaciones/certificarFauco_cpsuivsfact" => (Path(route), period),
            "POST /api/v1/validaciones/certificarfauco_existarifa" => (Path(route), period),
            "POST /api/v1/validaciones/certificarfauco_existarifacert" => (Path(route), period),
            "POST /api/v1/validaciones/certificarfauco_existerelleno" => (Path(route), period),
            "POST /api/v1/validaciones/certificarFauco_integracion" => (Path(route), period),
            // Body-less SUI853 readers (CFT formats, summaries, FAC, configuration read models).
            _ when route.StartsWith("POST /api/v1/sui853", StringComparison.Ordinal) => (Path(route), null),
            _ => throw new InvalidOperationException($"No request builder for {route}")
        };

        var method = route.StartsWith("GET ", StringComparison.Ordinal) ? HttpMethod.Get : HttpMethod.Post;
        return new RouteRequest(method, path, body, SystemFor(path));
    }

    private static string Path(string route) => route.Split(' ')[1];

    // Regulator routes run in system 1, Reliquidaciones in 2 and SUI853 in 3.
    private static int SystemFor(string path)
        => path.StartsWith("/api/v1/reliq", StringComparison.Ordinal) ? 2
            : path.StartsWith("/api/v1/sui853", StringComparison.Ordinal) ? 3
            : 1;
}

internal static class AllowList
{
    internal static readonly IReadOnlySet<string> Routes = Load();

    private static HashSet<string> Load()
    {
        var file = System.IO.Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "OracleReal", "read-only-routes.txt");
        return File.ReadAllLines(file)
            .Select(line => line.Trim())
            .Where(line => line.Length > 0 && !line.StartsWith('#'))
            .Select(line => string.Join(' ', line.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(2)))
            .ToHashSet(StringComparer.Ordinal);
    }
}

internal static class RowCount
{
    internal static string Describe(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            return root.GetArrayLength().ToString();
        }

        if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("data", out var data))
        {
            if (data.ValueKind == JsonValueKind.Array)
            {
                return data.GetArrayLength().ToString();
            }

            if (data.ValueKind == JsonValueKind.Object)
            {
                var arrays = data.EnumerateObject()
                    .Where(property => property.Value.ValueKind == JsonValueKind.Array)
                    .Select(property => $"{property.Name}:{property.Value.GetArrayLength()}")
                    .ToList();
                return arrays.Count > 0 ? "{" + string.Join(",", arrays) + "}" : "object";
            }

            return data.ValueKind.ToString().ToLowerInvariant();
        }

        return root.ValueKind.ToString().ToLowerInvariant();
    }
}

internal sealed class CapturedLogs
{
    private readonly ConcurrentQueue<string> entries = new();

    internal void Add(string entry) => entries.Enqueue(entry);

    internal void Clear() => entries.Clear();

    internal string Describe()
        => entries.IsEmpty ? string.Empty : "logs=[" + string.Join(" || ", entries) + "]";
}

internal sealed class CapturedLogsProvider(CapturedLogs logs) : ILoggerProvider
{
    public ILogger CreateLogger(string categoryName) => new CapturedLogger(logs, categoryName);

    public void Dispose()
    {
    }

    private sealed class CapturedLogger(CapturedLogs logs, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Warning;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel))
            {
                return;
            }

            var text = $"{logLevel} {category}: {formatter(state, exception)}";
            if (exception is not null)
            {
                text += $" | {exception.GetType().Name}: {exception.Message}";
            }

            logs.Add(text);
        }
    }
}

/// <summary>Theory variant of <see cref="OracleFactAttribute"/>: skipped unless VEOLIA_ORACLE_TESTS=1.</summary>
file sealed class OracleTheoryAttribute : TheoryAttribute
{
    public OracleTheoryAttribute()
    {
        if (Environment.GetEnvironmentVariable(OracleFactAttribute.EnableVariable) != "1")
        {
            Skip = $"Requires a reachable Oracle database; set {OracleFactAttribute.EnableVariable}=1 to run.";
        }
    }
}
