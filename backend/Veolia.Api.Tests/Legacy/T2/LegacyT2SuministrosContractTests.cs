using System.Collections;
using System.Data;
using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.GoogleDrive;
using Veolia.Api.Modules.Regulator.Suministros;
using Veolia.Api.Modules.Regulator.Validaciones;

namespace Veolia.Api.Tests.Legacy.T2;

/// <summary>
/// Legacy characterization of /api/v1/suministros (back-tarificador/src/modules/suministros/{routes.js,controller.js}).
/// Endpoints already pinned by RegulatorSuministrosContractTests (Certificar, positional INSERTs of 308/309) are not repeated.
/// Every expected value comes from the legacy source cited above each test.
/// </summary>
public sealed class LegacyT2SuministrosContractTests
{
    private const long TokenUser = 4242;

    // ---------- Routes ----------

    // Legacy suministros/routes.js:63-173 and :187-235 expose these routes under /api/v1/suministros
    // (index.js:61). The new API moved productividad/aprovechamiento/descuentos to other controllers and dropped
    // postPoda/consultarPoda/testMensual, so a legacy client calling these URLs gets 404.
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, renamed or removed legacy routes consumed
    // consistently by the new frontend).
    [Theory]
    [InlineData("POST", "setProductividad")]
    [InlineData("PUT", "setProductividad")]
    [InlineData("POST", "getProductividad")]
    [InlineData("POST", "setapsDesCost")]
    [InlineData("POST", "getapsDesCostUnico")]
    [InlineData("POST", "uptapsDesCost")]
    [InlineData("POST", "getapsDesCost")]
    [InlineData("POST", "getAprovechamiento")]
    [InlineData("POST", "postAprovechamiento")]
    [InlineData("POST", "postPoda")]
    [InlineData("POST", "consultarPoda")]
    [InlineData("POST", "testMensual")]
    public async Task LegacySuministrosRoutesMovedOrRemovedAnswerNotFound(string method, string route)
    {
        using var factory = new SuministrosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), $"/api/v1/suministros/{route}")
        {
            Content = JsonContent.Create(new { aps = 5, anno = 2026, mes = 3 })
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // Recorded deviation (parity-review-all.md S10 "Exigir token" / L19): every /api/v1 route requires the token,
    // including the routes legacy left anonymous (routes.js:6-16 guardarProductividad/cargueProductividad,
    // :175-191 getPoda/postPoda, :207-266 plcertificarSemestral/certificarMensual/consultaCostoPoda/cenrtificarEditar).
    [Theory]
    [InlineData("guardarProductividad")]
    [InlineData("cargueProductividad")]
    [InlineData("getPoda")]
    [InlineData("plcertificarSemestral")]
    [InlineData("certificarMensual")]
    [InlineData("consultaCostoPoda")]
    [InlineData("cenrtificarEditar")]
    public async Task LegacyAnonymousRoutesNowRequireTheToken(string route)
    {
        using var factory = new SuministrosApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync($"/api/v1/suministros/{route}", new { aps = 5, anno = 2026, mes = 3, semestre = 1 });
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains("No existe token de verificacion", body);
        Assert.Empty(factory.Suministros.Calls);
        Assert.Empty(factory.Productividad.Calls);
    }

    // ---------- 701 Cargue mensual: Inf. Usuarios (filecarguecomercial) ----------

    // Legacy routes.js:31-35 reads { aps, anno, mes, resume, filecontent } and uses req.SISU_ID; CargueService.js:72-78
    // sends resume as { N, NA, ND, TAFNA } (CargueComercial.vue:374-379). Field names are bound case-insensitively.
    [Fact]
    public async Task FileCargueComercialAcceptsTheLegacyBodyAndUsesTheTokenUser()
    {
        using var factory = new SuministrosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/filecarguecomercial", new
        {
            aps = 1033,
            anno = 2026,
            mes = 2,
            resume = new { N = 10m, NA = 3m, ND = 2m, TAFNA = 4.5m },
            filecontent = new[]
            {
                new { codaps = 1033, aps = "SAN PEDRO", anno = 2026, mes = 2, coduso = 1, nomuso = "ESTRATO 1", codfactor = 1, codtipo = 1, tipo = 1, tiponom = "RESIDENCIAL", cantidad = 10m, toneladas = 4.5m }
            }
        });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, body.GetProperty("data").GetInt32());
        var (request, usuario) = Assert.Single(factory.Suministros.CargueComercial);
        Assert.Equal(TokenUser, usuario);
        Assert.Equal((1033, 2026, 2), (request.aps, request.anno, request.mes));
        Assert.Equal(new CargueComercialResumen(10m, 2m, 3m, 4.5m), request.resume);
        var fila = Assert.Single(request.filecontent!);
        Assert.Equal("SAN PEDRO", fila.aps);
        Assert.Equal((1, "ESTRATO 1", 1, 1, 1, "RESIDENCIAL", 10m, 4.5m),
            (fila.coduso, fila.nomuso, fila.codfactor, fila.codtipo, fila.tipo, fila.tiponom, fila.cantidad, fila.toneladas));
    }

    // Legacy controller.js:225-305: DELETE AUCO_CARGUECOMERCIAL (aps, anno, mes), DELETE AUCO_RESCOMERCIAL (aps, anno, mes),
    // SAUCO_RESCOMERCIAL.nextval, INSERT AUCO_RESCOMERCIAL VALUES (id, aps, anno, mes, N, ND, NA, TAFNA, sysdate, usuario)
    // and one INSERT AUCO_CARGUECOMERCIAL per row (seq, rcomId, codaps, aps, anno, mes, coduso, nomuso, codfactor, codtipo,
    // tipo, tiponom, cantidad, toneladas, sysdate, usuario).
    [Fact]
    public async Task FileCargueComercialWritesTheLegacyStatementsInOrder()
    {
        var connection = new RecordingDbConnection(command =>
            command.CommandText.Contains("NEXTVAL FROM DUAL", StringComparison.OrdinalIgnoreCase) ? Table(("NEXTVAL", 77L)) : 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var request = new CargueComercialRequest(1033, 2026, 2, new CargueComercialResumen(10m, 2m, 3m, 4.5m),
            [new CargueComercialFila(1033, "SAN PEDRO", 2026, 2, 1, "ESTRATO 1", 1, 1, 1, "RESIDENCIAL", 10m, 4.5m)]);

        var inserted = await repository.SetCargueComercialAsync(request, TokenUser, CancellationToken.None);

        Assert.Equal(1, inserted);
        Assert.Equal(5, connection.Commands.Count);
        Assert.StartsWith("DELETE FROM AUCO_CARGUECOMERCIAL WHERE CCOM_CODAPS = :aps AND CCOM_ANNO = :anno AND CCOM_MES = :mes", connection.Commands[0].CommandText);
        Assert.Equal(new object?[] { 1033, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(connection.Commands[0].Value));
        Assert.StartsWith("DELETE FROM AUCO_RESCOMERCIAL WHERE APSA_ID = :aps AND RCOM_ANNO = :anno AND RCOM_MES = :mes", connection.Commands[1].CommandText);
        Assert.Contains("SAUCO_RESCOMERCIAL.NEXTVAL", connection.Commands[2].CommandText);
        var resumen = connection.Commands[3];
        Assert.Contains("INSERT INTO AUCO_RESCOMERCIAL", resumen.CommandText);
        Assert.Equal(new object?[] { 77L, 1033, 2026, 2, 10m, 2m, 3m, 4.5m, TokenUser },
            new[] { "rcomId", "aps", "anno", "mes", "n", "nd", "na", "tafna", "usuario" }.Select(resumen.Value));
        var detalle = connection.Commands[4];
        Assert.Contains("INSERT INTO AUCO_CARGUECOMERCIAL", detalle.CommandText);
        Assert.Contains("SAUCO_CARGUECOMERCIAL.NEXTVAL, :rcomId, :codaps, :apsNom, :anno, :mes, :coduso, :nomuso, :codfactor, :codtipo, :tipo, :tiponom, :cantidad, :toneladas, SYSDATE, :usuario", detalle.CommandText);
        Assert.Equal(new object?[] { 77L, 1033, "SAN PEDRO", 2026, 2, 1, "ESTRATO 1", 1, 1, 1, "RESIDENCIAL", 10m, 4.5m, TokenUser },
            new[] { "rcomId", "codaps", "apsNom", "anno", "mes", "coduso", "nomuso", "codfactor", "codtipo", "tipo", "tiponom", "cantidad", "toneladas", "usuario" }.Select(detalle.Value));
        Assert.True(connection.Committed);
    }

    // ---------- 701 Inf. Propia / Inf. Competidor ----------

    // Legacy controller.js:362-410 (setCargueInfPropia): DELETE AUCO_CARGUEPROPIO by the first row's (aps, anno, mes) and
    // INSERT (APSA_ID, EMPR_EMPR, PROP_ANNO, PROP_MES, PROP_CP, PROP_MT3AGUA, PROP_M2CC, PROP_M2LAV, PROP_TI, PROP_TM,
    // PROP_KLP, PROP_T, PROP_QA, PROP_ESCENARIO, PROP_FECCREA=sysdate, USUA_USUARIO=req.SISU_ID).
    [Fact]
    public async Task SetCargueInfPropiaDeletesThenInsertsTheLegacyColumns()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var request = new CarguePropiaRequest(1014, new CargueEmpresaRef(1023, "PROPIA"), 2026, 3,
            [new CarguePropiaFila(1014, 1023, 2026, 2, 10m, 20m, 30m, 40m, 50m, 60m, 70m, 80m, 90m, 1m)]);

        var inserted = await repository.SetCargueInfPropiaAsync(request, TokenUser, CancellationToken.None);

        Assert.Equal(1, inserted);
        var delete = connection.Commands[0];
        Assert.Equal("DELETE FROM AUCO_CARGUEPROPIO WHERE APSA_ID = :aps AND PROP_ANNO = :anno AND PROP_MES = :mes", delete.CommandText);
        Assert.Equal(new object?[] { 1014, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(delete.Value));
        var insert = connection.Commands[1];
        Assert.Contains("(APSA_ID, EMPR_EMPR, PROP_ANNO, PROP_MES, PROP_CP, PROP_MT3AGUA, PROP_M2CC, PROP_M2LAV, PROP_TI, PROP_TM, PROP_KLP, PROP_T, PROP_QA, PROP_ESCENARIO, PROP_FECCREA, USUA_USUARIO)", insert.CommandText);
        Assert.Contains("SYSDATE, :usuario", insert.CommandText);
        Assert.Equal(new object?[] { 1014, 1023, 2026, 2, 10m, 20m, 30m, 40m, 50m, 60m, 70m, 80m, 90m, 1m, TokenUser },
            new[] { "aps", "empr", "anno", "mes", "cp", "mt3agua", "m2cc", "m2lav", "ti", "tm", "klp", "t", "qa", "escenario", "usuario" }.Select(insert.Value));
        Assert.True(connection.Committed);
    }

    // Legacy controller.js:374 and :472 only persist resumemes[0] (`let resmes = resumemes[0]`); extra CSV rows were ignored.
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, every CSV row persisted).
    [Fact]
    public async Task SetCargueInfPropiaPersistsEveryCsvRow()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var request = new CarguePropiaRequest(1014, new CargueEmpresaRef(1023, "PROPIA"), 2026, 3,
        [
            new CarguePropiaFila(1014, 1023, 2026, 2, 1m, 1m, 1m, 1m, 1m, 1m, 1m, 1m, 1m, 0m),
            new CarguePropiaFila(1014, 1023, 2026, 2, 2m, 2m, 2m, 2m, 2m, 2m, 2m, 2m, 2m, 0m)
        ]);

        var inserted = await repository.SetCargueInfPropiaAsync(request, TokenUser, CancellationToken.None);

        Assert.Equal(2, inserted);
        var inserts = connection.Commands.Where(c => c.CommandText.Contains("INSERT INTO AUCO_CARGUEPROPIO")).ToList();
        Assert.Equal(new object?[] { 1m, 2m }, inserts.Select(c => c.Value("cp")));
    }

    // Legacy InfPropiaMensual.vue:380 sends no ESCENARIO when the template lacks the column (undefined dropped by JSON) and
    // controller.js:374-400 binds it as-is, so PROP_ESCENARIO stays empty instead of 0.
    [Fact]
    public async Task SetCargueInfPropiaLeavesAMissingEscenarioEmpty()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var request = new CarguePropiaRequest(1014, new CargueEmpresaRef(1023, "PROPIA"), 2026, 3,
            [new CarguePropiaFila(1014, 1023, 2026, 2, 1m, 1m, 1m, 1m, 1m, 1m, 1m, 1m, 1m, null)]);

        await repository.SetCargueInfPropiaAsync(request, TokenUser, CancellationToken.None);

        var insert = Assert.Single(connection.Commands, c => c.CommandText.Contains("INSERT INTO AUCO_CARGUEPROPIO"));
        Assert.True(insert.Value("escenario") is null or DBNull);
    }

    // Legacy controller.js:463-500 (setCargueInfCompetidor): DELETE AUCO_CARGUECOMPE by (aps, empr, anno, mes) and INSERT
    // (APSA_ID, EMPR_EMPR, COMP_ANNO, COMP_MES, COMP_CP, COMP_MT3AGUA, COMP_M2CC, COMP_M2LAV, COMP_TI, COMP_TM, COMP_KLP,
    // COMP_CBLJ, COMP_FECCREA=SYSDATE, USUA_USUARIO).
    [Fact]
    public async Task SetCargueInfCompetidorDeletesByEmpresaThenInsertsTheLegacyColumns()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var request = new CargueCompetidorRequest(1014, new CargueEmpresaRef(1024, "COMPETIDOR"), 2026, 3,
            [new CargueCompetidorFila(1014, 1024, 2026, 2, 10m, 20m, 30m, 40m, 50m, 60m, 70m, 48480.20m)]);

        await repository.SetCargueInfCompetidorAsync(request, TokenUser, CancellationToken.None);

        var delete = connection.Commands[0];
        Assert.Equal("DELETE FROM AUCO_CARGUECOMPE WHERE APSA_ID = :aps AND EMPR_EMPR = :empr AND COMP_ANNO = :anno AND COMP_MES = :mes", delete.CommandText);
        Assert.Equal(new object?[] { 1014, 1024, 2026, 2 }, new[] { "aps", "empr", "anno", "mes" }.Select(delete.Value));
        var insert = connection.Commands[1];
        Assert.Contains("(APSA_ID, EMPR_EMPR, COMP_ANNO, COMP_MES, COMP_CP, COMP_MT3AGUA, COMP_M2CC, COMP_M2LAV, COMP_TI, COMP_TM, COMP_KLP, COMP_CBLJ, COMP_FECCREA, USUA_USUARIO)", insert.CommandText);
        Assert.Equal(new object?[] { 1014, 1024, 2026, 2, 10m, 20m, 30m, 40m, 50m, 60m, 70m, 48480.20m, TokenUser },
            new[] { "aps", "empr", "anno", "mes", "cp", "mt3agua", "m2cc", "m2lav", "ti", "tm", "klp", "cblj", "usuario" }.Select(insert.Value));
    }

    // ---------- 701 Inf. Terceros ----------

    // Legacy routes.js:100-104 reads { aps, anno, mes, datos } and controller.js:579-589 inserts datos.cdfter, datos.ctlter,
    // datos.incenter (CargueService.js:558-566 / InfTerceros.vue:83-86 send them nested under `datos`).
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, legacy request field names renamed; the new
    // frontend sends the flat { aps, anno, mes, cdf, ctl, incentivo } body).
    [Fact]
    public async Task SetTercerosAcceptsTheFlatBodyOfTheNewFrontend()
    {
        using var factory = new SuministrosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/setTerceros",
            new { aps = 5, anno = 2026, mes = 2, cdf = 11.5m, ctl = 2.25m, incentivo = 0.5m });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var (request, usuario) = Assert.Single(factory.Suministros.Terceros);
        Assert.Equal(TokenUser, usuario);
        Assert.Equal((11.5m, 2.25m, 0.5m), (request.cdf, request.ctl, request.incentivo));
    }

    // Legacy controller.js:575-589: DELETE AUCO_CARGUETERCERO (aps, anno, mes) then
    // INSERT VALUES(aps, anno, mes, cdf, ctl, incentivo, sysdate, usuario) (column order of create-tables.sql:244-253).
    [Fact]
    public async Task SetTercerosDeletesThenInsertsInTheLegacyColumnOrder()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        var result = await repository.SetTercerosAsync(new TercerosRequest(5, 2026, 2, 11.5m, 2.25m, 0.5m), TokenUser, CancellationToken.None);

        Assert.Equal(1, result);
        Assert.Equal("DELETE FROM AUCO_CARGUETERCERO WHERE APSA_ID = :aps AND TERC_ANNO = :anno AND TERC_MES = :mes", connection.Commands[0].CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(connection.Commands[0].Value));
        var insert = connection.Commands[1];
        Assert.Contains("(APSA_ID, TERC_ANNO, TERC_MES, TERC_CDF, TERC_CTL, TERC_INCENTIVOCDF, TERC_FECCREA, USUA_USUARIO)", insert.CommandText);
        Assert.Contains("VALUES (:aps, :anno, :mes, :cdf, :ctl, :incentivo, SYSDATE, :usuario)", insert.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2, 11.5m, 2.25m, 0.5m, TokenUser },
            new[] { "aps", "anno", "mes", "cdf", "ctl", "incentivo", "usuario" }.Select(insert.Value));
        Assert.True(connection.Committed);
    }

    // ---------- 702 Cargue semestral ----------

    // Legacy controller.js:307-360 (setCargueInfPropiaSem): per row DELETE AUCO_CARGUEPROPIOSEM (aps, anno, mes) and INSERT
    // (APSA_ID, EMPR_EMPR, PROP_ANNO, PROP_MES, PROP_QRT, PROP_QLU, PROP_QNA, PROP_QBL, PROP_QR, PROP_QRS, PROP_LBL, PROP_VL,
    // PROP_ESCENARIO, PROP_CTLMX, PROP_CPE, PROP_NAA, PROP_TAFA, PROP_CRTPROPIO, PROP_CDFPROPIO, PROP_FECCREA, USUA_USUARIO,
    // PROP_QRSMUNRECP) with binds (..., esce, ctlmx, cpe, naa, tafa, crtpro, cdfpro, usucre, qrsmunrecp).
    [Fact]
    public async Task SetCargueInfPropiaSemDeletesAndInsertsEachRowWithTheLegacyColumns()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var request = new CarguePropiaSemRequest(
        [
            new CarguePropiaSemFila(1014, 1023, 2026, 1, 1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 9m, 10m, 11m, 12m, 13m, 14m, 15m, 16m),
            new CarguePropiaSemFila(1014, 1023, 2026, 2, 1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 9m, 10m, 11m, 12m, 13m, 14m, 15m, 16m)
        ]);

        var inserted = await repository.SetCargueInfPropiaSemAsync(request, TokenUser, CancellationToken.None);

        Assert.Equal(2, inserted);
        Assert.Equal(4, connection.Commands.Count);
        Assert.Equal(new object?[] { 1014, 2026, 1 }, new[] { "aps", "anno", "mes" }.Select(connection.Commands[0].Value));
        Assert.Equal(new object?[] { 1014, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(connection.Commands[2].Value));
        var insert = connection.Commands[1];
        Assert.Contains("(APSA_ID, EMPR_EMPR, PROP_ANNO, PROP_MES, PROP_QRT, PROP_QLU, PROP_QNA, PROP_QBL, PROP_QR, PROP_QRS, PROP_LBL, PROP_VL, PROP_ESCENARIO, PROP_CTLMX, PROP_CPE, PROP_NAA, PROP_TAFA, PROP_CRTPROPIO, PROP_CDFPROPIO, PROP_FECCREA, USUA_USUARIO, PROP_QRSMUNRECP)", insert.CommandText);
        Assert.Equal(new object?[] { 1014, 1023, 2026, 1, 1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 9m, 10m, 11m, 12m, 13m, 14m, 15m, TokenUser, 16m },
            new[] { "aps", "empr", "anno", "mes", "qrt", "qlu", "qna", "qbl", "qr", "qrs", "lbl", "vl", "esce", "ctlmx", "cpe", "naa", "tafa", "crtpro", "cdfpro", "usuario", "qrsmunrecp" }.Select(insert.Value));
    }

    // Legacy controller.js:412-461 (setCargueInfCompetidorSemestral): per row DELETE AUCO_CARGUECOMPESEM (aps, empr, anno, mes)
    // and INSERT (..., COMP_N, COMP_NAA, COMP_NDA, COMP_QLU, COMP_QNA, COMP_QBL, COMP_QR, COMP_CBLJ, COMP_LBLCOM, COMP_CRTVBA,
    // COMP_CDFVBA, COMP_QRT, COMP_FECCREA, USUA_USUARIO) binding n, na, nd, qlu, qna, qbl, qr, cblj, lbl, crtcomp, cdfcomp, qrtz.
    [Fact]
    public async Task SetCargueInfCompetidorSemestralMapsTheLegacyColumns()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var request = new CargueCompetidorSemRequest([new CargueCompetidorSemFila(1014, 1024, 2026, 3, 1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 9m, 10m, 11m, 12m)]);

        await repository.SetCargueInfCompetidorSemestralAsync(request, TokenUser, CancellationToken.None);

        Assert.Equal("DELETE FROM AUCO_CARGUECOMPESEM WHERE APSA_ID = :aps AND EMPR_EMPR = :empr AND COMP_ANNO = :anno AND COMP_MES = :mes", connection.Commands[0].CommandText);
        Assert.Equal(new object?[] { 1014, 1024, 2026, 3 }, new[] { "aps", "empr", "anno", "mes" }.Select(connection.Commands[0].Value));
        var insert = connection.Commands[1];
        Assert.Contains("(APSA_ID, EMPR_EMPR, COMP_ANNO, COMP_MES, COMP_N, COMP_NAA, COMP_NDA, COMP_QLU, COMP_QNA, COMP_QBL, COMP_QR, COMP_CBLJ, COMP_LBLCOM, COMP_CRTVBA, COMP_CDFVBA, COMP_QRT, COMP_FECCREA, USUA_USUARIO)", insert.CommandText);
        Assert.Equal(new object?[] { 1014, 1024, 2026, 3, 1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 9m, 10m, 11m, 12m, TokenUser },
            new[] { "aps", "empr", "anno", "mes", "n", "na", "nd", "qlu", "qna", "qbl", "qr", "cblj", "lbl", "crtcomp", "cdfcomp", "qrtz", "usuario" }.Select(insert.Value));
    }

    // Legacy controller.js:157-222 (filecarguecomercialsemestral): DELETE AUCO_CARGUEUSUSEM by the first row's
    // (codaps, anno, semestre), then one INSERT per row in the legacy column order with usucre = req.SISU_ID.
    [Fact]
    public async Task FileCargueComercialSemestralDeletesByFirstRowAndInsertsEachRow()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var fila = new CargueComercialSemFila(1024, "BARRANCABERMEJA", 2020, 2, 4, "ESTRATO 4", 1, 4, 1, "TOTALES",
            6359m, 6361m, 6359m, 6361m, 6359m, 6361m, 0m, 0m, 0m, 0m, 0m, 0m);

        var inserted = await repository.SetCargueComercialSemAsync(new CargueComercialSemRequest([fila, fila]), TokenUser, CancellationToken.None);

        Assert.Equal(2, inserted);
        Assert.Equal(3, connection.Commands.Count);
        Assert.Equal("DELETE FROM AUCO_CARGUEUSUSEM WHERE CAUS_CODAPS = :codaps AND CAUS_ANNO = :anno AND CAUS_SEMESTRE = :semestre", connection.Commands[0].CommandText);
        Assert.Equal(new object?[] { 1024, 2020, 2 }, new[] { "codaps", "anno", "semestre" }.Select(connection.Commands[0].Value));
        var insert = connection.Commands[1];
        Assert.Contains("(CAUS_CODAPS, CAUS_APSNOM, CAUS_ANNO, CAUS_SEMESTRE, CAUS_CODCU, CAUS_NOMCU, CAUS_CODFACTOR, CAUS_NOMFACTOR, CAUS_CODTIPO, CAUS_NOMTIPO, CAUS_CANTM1, CAUS_CANTM2, CAUS_CANTM3, CAUS_CANTM4, CAUS_CANTM5, CAUS_CANTM6, CAUS_TONM1, CAUS_TONM2, CAUS_TONM3, CAUS_TONM4, CAUS_TONM5, CAUS_TONM6, CAUS_FECRE, CAUS_USUCRE)", insert.CommandText);
        Assert.Equal(new object?[] { 1024, "BARRANCABERMEJA", 2020, 2, 4, "ESTRATO 4", 1, 4, 1, "TOTALES", 6359m, 6361m, 6359m, 6361m, 6359m, 6361m, 0m, 0m, 0m, 0m, 0m, 0m, TokenUser },
            new[] { "codaps", "apsNom", "anno", "semestre", "coduso", "nomuso", "codfactor", "nomfact", "codtipo", "nomtipo", "susm1", "susm2", "susm3", "susm4", "susm5", "susm6", "afom1", "afom2", "afom3", "afom4", "afom5", "afom6", "usuario" }.Select(insert.Value));
    }

    // Legacy controller.js:131-156 (guardarQRTRural): DELETE auco_carguerural (aps, anno, semestre) then INSERT
    // (APSA_ID, RURA_ANNO, RURA_SEMESTRE, RURA_QRT, COMP_FECCREA=SYSDATE, USUA_USUARIO=req.SISU_ID) (routes.js:18-23).
    [Fact]
    public async Task GuardarQrtRuralDeletesThenInsertsWithTheTokenUser()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        await repository.GuardarQrtRuralAsync(new QRTRuralRequest(5, 2026, 1, 12.5m), TokenUser, CancellationToken.None);

        Assert.Equal("DELETE FROM AUCO_CARGUERURAL WHERE APSA_ID = :aps AND RURA_ANNO = :anno AND RURA_SEMESTRE = :semestre", connection.Commands[0].CommandText);
        Assert.Equal(new object?[] { 5, 2026, 1 }, new[] { "aps", "anno", "semestre" }.Select(connection.Commands[0].Value));
        Assert.Contains("(APSA_ID, RURA_ANNO, RURA_SEMESTRE, RURA_QRT, COMP_FECCREA, USUA_USUARIO)", connection.Commands[1].CommandText);
        Assert.Equal(new object?[] { 5, 2026, 1, 12.5m, TokenUser }, new[] { "aps", "anno", "semestre", "qrtRural", "usuario" }.Select(connection.Commands[1].Value));
    }

    // Legacy controller.js:552-568 (getcanCertificateSemestral) maps semestre 1 -> mes 6, otherwise 12, and counts AUCO_TARIFAS.
    [Theory]
    [InlineData(1, 6)]
    [InlineData(2, 12)]
    public async Task GetCanCertificateSemestralCountsTariffsOfTheClosingMonth(int semestre, int mesCierre)
    {
        var connection = new RecordingDbConnection(_ => Table(("CANTIDAD", 3)));
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        var cantidad = await repository.GetCanCertificateSemestralAsync(new PrevalidarSemestralRequest(5, 2026, semestre), CancellationToken.None);

        Assert.Equal(3, cantidad);
        var command = Assert.Single(connection.Commands);
        Assert.Equal("SELECT COUNT(1) AS CANTIDAD FROM AUCO_TARIFAS WHERE APSA_ID = :aps AND TARI_ANNO = :anno AND TARI_MES = :mesCierre", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, mesCierre }, new[] { "aps", "anno", "mesCierre" }.Select(command.Value));
    }

    // Legacy controller.js:545-550 (getcanCertificate) runs
    // "select count(1) AS CANTIDAD from auco_tarifas where apsa_id = :1 and tari_anno = :2 and tari_mes = :3" and answers [{ CANTIDAD }].
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, getcanCertificate shape): the new API returns the
    // tariff rows and the frontend checks whether the list is empty.
    [Fact]
    public async Task GetCanCertificateReturnsTheTariffRowsOfThePeriod()
    {
        var connection = new RecordingDbConnection(_ => Table(("TARI_ANNO", 2026)));
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        var rows = await repository.GetCanCertificateAsync(new PrevalidarRequest(5, 2026, 2), CancellationToken.None);

        var command = Assert.Single(connection.Commands);
        Assert.Equal("SELECT * FROM AUCO_TARIFAS WHERE APSA_ID = :aps AND TARI_ANNO = :anno AND TARI_MES = :mes", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(command.Value));
        Assert.Equal(2026, (int)Assert.Single(rows).TARI_ANNO);
    }

    // Legacy controller.js:570-604 (Certificarsemestral): pk_certificacion.fauco_certificarsem(:1 aps, :2 semestre, :3 anno, :4 usuario) + COMMIT.
    [Fact]
    public async Task CertificarSemestralBindsApsSemestreAnnoUsuarioInLegacyOrder()
    {
        var connection = new RecordingDbConnection(command =>
        {
            command.Parameter("res").Value = 1;
            return 1;
        });
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        var result = await repository.CertificarSemestralAsync(new CertificarSemestralRequest(5, 2026, 2), TokenUser, CancellationToken.None);

        Assert.Equal(1, result);
        var command = Assert.Single(connection.Commands);
        Assert.Equal("BEGIN :res := PK_CERTIFICACION.fauco_certificarsem(:1,:2,:3,:4); COMMIT; END;", command.CommandText);
        Assert.Equal(new object?[] { 5, 2, 2026, TokenUser }, new[] { "1", "2", "3", "4" }.Select(command.Value));
    }

    // Legacy controller.js:592 throws "No se pueden certificar las variables" when res == 0, answering HTTP 500.
    [Fact]
    public async Task CertificarSemestralFailsWhenThePackageReturnsZero()
    {
        using var factory = new SuministrosApiFactory();
        factory.Suministros.CertificarSemestralResult = 0;
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/Certificarsemestral", new { aps = 5, anno = 2026, semestre = 1 });
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Contains("No se pueden certificar las variables", body);
    }

    // Legacy routes.js:88-92 reads { aps, anno, semestre } and passes req.SISU_ID.
    [Fact]
    public async Task CertificarSemestralUsesTheTokenUser()
    {
        using var factory = new SuministrosApiFactory();
        factory.Suministros.CertificarSemestralResult = 1;
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/Certificarsemestral", new { aps = 5, anno = 2026, semestre = 1, usuario = 9 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, body.GetProperty("data").GetInt32());
        var (request, usuario) = Assert.Single(factory.Suministros.CertificarSemestral);
        Assert.Equal(new CertificarSemestralRequest(5, 2026, 1), request);
        Assert.Equal(TokenUser, usuario);
    }

    // Legacy controller.js:1150-1209 (plcertificarSemestral): PK_GIRS.fpgirs_semestral(:1 aps, :2 anno, :3 semestre); the
    // dataset is transformed to { pgris: parseFloat(...), barrido: [{ variable, valor, color }] }.
    [Fact]
    public async Task PlCertificarSemestralParsesTheLegacyDatasetShape()
    {
        var connection = new RecordingDbConnection(command =>
        {
            command.Parameter("res").Value = "{\"dataset\":[{\"pgris\":[\"1.5\",\"2\"],\"barrido\":[[\"LBL\",\"10\",\"G\"],[\"QBL\",\"3\",\"R\"]]}]}";
            return 1;
        });
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        var response = await repository.PlCertificarSemestralAsync(new CertificarSemestralRequest(5, 2026, 1), CancellationToken.None);

        var command = Assert.Single(connection.Commands);
        Assert.Contains("PK_GIRS.fpgirs_semestral(:1,:2,:3)", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 1 }, new[] { "1", "2", "3" }.Select(command.Value));
        var dataset = Assert.Single(response.Dataset);
        Assert.Equal(new[] { 1.5m, 2m }, dataset.Pgris);
        Assert.Equal(new[] { new BarridoItem("LBL", "10", "G"), new BarridoItem("QBL", "3", "R") }, dataset.Barrido);
    }

    // Same legacy source: the JSON keys are dataset/pgris/barrido and variable/valor/color (envelope { data } is a recorded deviation).
    [Fact]
    public async Task PlCertificarSemestralSerializesTheLegacyKeys()
    {
        using var factory = new SuministrosApiFactory();
        factory.Suministros.PlCertificarSemestralResult = new PlCertificarSemestralResponse(
            [new SemestralDataset([1.5m], [new BarridoItem("LBL", "10", "G")])]);
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/plcertificarSemestral", new { aps = 5, anno = 2026, semestre = 1 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = body.GetProperty("data").GetProperty("dataset")[0];
        Assert.Equal(1.5m, item.GetProperty("pgris")[0].GetDecimal());
        var barrido = item.GetProperty("barrido")[0];
        Assert.Equal(("LBL", "10", "G"), (barrido.GetProperty("variable").GetString(), barrido.GetProperty("valor").GetString(), barrido.GetProperty("color").GetString()));
    }

    // Legacy controller.js:1030-1068 (certificarMensual): PK_GIRS.fpgirs_mensual(:1 aps, :2 anno, :3 mes).
    // Legacy controller.js:1118-1148 (certificarEdicionPODA, route cenrtificarEditar): PK_VALGRAL.fauco_existarifa(:1 aps, :2 anno, :3 mes).
    [Theory]
    [InlineData("PK_GIRS.fpgirs_mensual")]
    [InlineData("PK_VALGRAL.fauco_existarifa")]
    public async Task StringPackagesBindApsAnnoMesInLegacyOrder(string function)
    {
        var connection = new RecordingDbConnection(command =>
        {
            command.Parameter("res").Value = "0";
            return 1;
        });
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var request = new CertificarRequest(5, 2026, 2);

        var raw = function.StartsWith("PK_GIRS", StringComparison.Ordinal)
            ? await repository.CertificarMensualAsync(request, CancellationToken.None)
            : await repository.CenrtificarEditarAsync(request, CancellationToken.None);

        Assert.Equal("0", raw);
        var command = Assert.Single(connection.Commands);
        Assert.Equal($"BEGIN :res := {function}(:1,:2,:3); END;", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "1", "2", "3" }.Select(command.Value));
        Assert.Equal(DbType.String, command.Parameter("res").DbType);
    }

    // ---------- 309 Costo de Poda ----------

    // Legacy controller.js:871-891 (getPoda): EMPR_NOMBRE, CPTE_VALORSUI, CPTE_VALORFACT, CPTE_TIPINGRESO, EMPR_EMPR joined
    // through auco_apsemprdivi/auge_empresas filtered by (aps, anno, mes) and empr_estado = 1.
    [Fact]
    public async Task GetPodaSelectsTheLegacyColumnsAndFilters()
    {
        var connection = new RecordingDbConnection(_ => Table(("EMPR_NOMBRE", "VEOLIA"), ("CPTE_VALORSUI", 2m), ("CPTE_VALORFACT", 0m), ("CPTE_TIPINGRESO", 1), ("EMPR_EMPR", 1002)));
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        var rows = await repository.GetPodaAsync(new PodaConsultaRequest(5, 2026, 2), CancellationToken.None);

        var row = (IDictionary<string, object>)Assert.Single(rows);
        Assert.Equal(new[] { "EMPR_NOMBRE", "CPTE_VALORSUI", "CPTE_VALORFACT", "CPTE_TIPINGRESO", "EMPR_EMPR" }, row.Keys);
        var command = Assert.Single(connection.Commands);
        Assert.Contains("SELECT EMPS.EMPR_NOMBRE, PODA.CPTE_VALORSUI, PODA.CPTE_VALORFACT, PODA.CPTE_TIPINGRESO, EMPS.EMPR_EMPR", command.CommandText);
        Assert.Contains("INNER JOIN AUCO_APSEMPRDIVI EPRD ON PODA.EMPR_EMPR = EPRD.EMPR_EMPR AND PODA.APSA_ID = EPRD.APSA_ID", command.CommandText);
        Assert.Contains("EMPS.EMPR_ESTADO = 1", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(command.Value));
    }

    // Legacy controller.js:1070-1090 (consultaCostoPoda): SELECT * FROM auge_empresas E JOIN auco_apsemprdivi AE ... returns the
    // columns of both tables (empresa and APS-empresa-división).
    [Fact]
    public async Task ConsultaCostoPodaReturnsTheColumnsOfBothTables()
    {
        var connection = new RecordingDbConnection(_ => Table(("EMPR_EMPR", 1002)));
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        await repository.ConsultaCostoPodaAsync(new PodaCatalogoRequest(5), CancellationToken.None);

        var command = Assert.Single(connection.Commands);
        Assert.Contains("SELECT *", command.CommandText);
        Assert.Equal(5, command.Value("aps"));
    }

    // Legacy controller.js:1092-1116 (newCostoPoda): one INSERT AUCO_PODATECHO per element of datos with usuario = req.SISU_ID
    // (routes.js:246-255).
    [Fact]
    public async Task NewCostoPodaInsertsOneRowPerEmpresaWithTheTokenUser()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var request = new PodaNuevoRequest([new PodaNuevoItem(1002, "A", 1.5m), new PodaNuevoItem(1003, "B", 2.5m)], 5, 2026, 2);

        await repository.NewCostoPodaAsync(request, TokenUser, CancellationToken.None);

        Assert.Equal(2, connection.Commands.Count);
        Assert.All(connection.Commands, c => Assert.Equal(SuministrosRepository.NewCostoPodaSql, c.CommandText));
        Assert.Equal(new object?[] { 5, 1003, 2026, 2, 2.5m, TokenUser }, new[] { "1", "2", "3", "4", "5", "6" }.Select(connection.Commands[1].Value));
    }

    // Legacy routes.js:193-201 reads { datatable: { EMPR_EMPR, CPTE_VALORSUI }, apsa_id, cpte_anno, cpte_mes }
    // (formPoda.vue / SuministrosService.js) and controller.js:917-950 parseFloat()s CPTE_VALORSUI.
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, legacy request shape renamed; the new frontend sends
    // the flat { EMPR_EMPR, CPTE_VALORSUI, apsa_id, cpte_anno, cpte_mes } body).
    [Fact]
    public async Task RegistrarPodaAcceptsTheFlatBodyOfTheNewFrontend()
    {
        using var factory = new SuministrosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/registrarPoda",
            new { EMPR_EMPR = 1002, CPTE_VALORSUI = 2m, apsa_id = 5, cpte_anno = 2026, cpte_mes = 2 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var (request, _) = Assert.Single(factory.Suministros.RegistrarPoda);
        Assert.Equal((1002, 2m, 5, 2026, 2), (request.EMPR_EMPR, request.CPTE_VALORSUI, request.apsa_id, request.cpte_anno, request.cpte_mes));
    }

    // Legacy controller.js:930-937: UPDATE auco_podatecho SET cpte_valorsui = :1, cpte_tipingreso = 1, usua_usua = :2
    // WHERE apsa_id = :3 AND empr_empr = :4 AND cpte_anno = :5 AND cpte_mes = :6 (usuario = req.SISU_ID).
    [Fact]
    public async Task RegistrarPodaUpdatesValorTipoIngresoAndTokenUser()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        await repository.RegistrarPodaAsync(new PodaEditarRequest(1002, 2m, 5, 2026, 2), TokenUser, CancellationToken.None);

        var command = Assert.Single(connection.Commands);
        Assert.Contains("SET CPTE_VALORSUI = :valor", command.CommandText);
        Assert.Contains("CPTE_TIPINGRESO = 1", command.CommandText);
        Assert.Contains("USUA_USUA = :usuario", command.CommandText);
        Assert.Equal(new object?[] { 2m, TokenUser, 5, 1002, 2026, 2 }, new[] { "valor", "usuario", "aps", "emprEmpr", "anno", "mes" }.Select(command.Value));
    }

    // ---------- 3001/3002 Reversiones ----------

    // Legacy routes.js:126-132 reads { aps, anno, mes, valor } (CargueService.js:497-502 sends the motivo as `valor`).
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, legacy request field `valor` renamed to `motivo`,
    // sent by the new frontend).
    [Fact]
    public async Task SetReversionAcceptsTheMotivoFieldOfTheNewFrontend()
    {
        using var factory = new SuministrosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/setReversion", new { aps = 5, anno = 2026, mes = 2, motivo = "Error de cargue" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var (request, _) = Assert.Single(factory.Suministros.Reversiones);
        Assert.Equal("Error de cargue", request.motivo);
    }

    // Legacy controller.js:651-683 (setReversion): PK_REVERSION.fauco_reversion(:1 aps, :2 mes, :3 anno, :4 motivo, :5 usuario).
    [Fact]
    public async Task SetReversionBindsApsMesAnnoMotivoUsuarioInLegacyOrder()
    {
        var connection = new RecordingDbConnection(command =>
        {
            if (command.CommandText.Contains("fauco_reversion", StringComparison.Ordinal))
            {
                command.Parameter("res").Value = 1;
                return 1;
            }

            return Table(("ID", 33));
        });
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        var response = await repository.SetReversionAsync(new SetReversionRequest(5, 2026, 2, "Error de cargue"), (int)TokenUser, CancellationToken.None);

        Assert.True(response.ok);
        var command = connection.Commands[0];
        Assert.Equal("BEGIN :res := PK_REVERSION.fauco_reversion(:1,:2,:3,:4,:5); END;", command.CommandText);
        Assert.Equal(new object?[] { 5, 2, 2026, "Error de cargue", (int)TokenUser }, new[] { "1", "2", "3", "4", "5" }.Select(command.Value));
    }

    // Legacy controller.js:685-704 (getReversion): AUCO_REVERSIONES joined to AUGE_SISUSUARIO/AUCO_APSASEO, excluding users 9 and 4,
    // ORDER BY anno DESC, mes DESC, APS name. Typed camelCase keys are a recorded deviation (skill step 5).
    [Fact]
    public async Task GetReversionKeepsTheLegacyFilterAndOrder()
    {
        var fecha = new DateTime(2026, 2, 3, 10, 30, 0);
        var connection = new RecordingDbConnection(_ => Table(("Id", 1), ("Aps", 5), ("Anno", 2026), ("Mes", 2), ("Motivo", "m"), ("Fecha", fecha), ("Usuario", "a@b.co"), ("NombreAps", "SAN PEDRO")));
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));

        var rows = await repository.GetReversionAsync(CancellationToken.None);

        var row = Assert.Single(rows);
        Assert.Equal(("SAN PEDRO", 2026, 2, "m", fecha, "a@b.co"), (row.NombreAps, row.Anno, row.Mes, row.Motivo, row.Fecha, row.Usuario));
        var command = Assert.Single(connection.Commands);
        Assert.Contains("JOIN AUGE_SISUSUARIO su ON su.SISU_ID = ar.USUA_USUA", command.CommandText);
        Assert.Contains("JOIN AUCO_APSASEO aa ON aa.APSA_ID = ar.APSA_ID", command.CommandText);
        Assert.Contains("WHERE su.SISU_ID NOT IN (9,4)", command.CommandText);
        Assert.Contains("ORDER BY ar.REVE_ANNO DESC, ar.REVE_MES DESC, aa.APSA_NOMAPS", command.CommandText);
    }

    // ---------- 311 Cargue Productividad ----------

    // Legacy controller.js:7-25 (guardarProductividad) answers HTTP 400 "No hay datos para insertar" when both arrays are empty.
    [Fact]
    public async Task GuardarProductividadWithoutRowsAnswersBadRequestLikeLegacy()
    {
        using var factory = new SuministrosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/guardarProductividad", new { dataPropios = Array.Empty<object>(), dataTerceros = Array.Empty<object>() });
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("No hay datos para insertar", body);
    }

    // Legacy controller.js:27-75: deletes PORD_PROPIA (PRODANNO, PRODMES) and PORD_TERCERO (TERCANNO, TERCMES) of the first
    // row's ANNO/MES, inserts every row (COD_APS, APS, COD_EMPRESA, EMPRESA, ANNO, MES, CCS, CBLS, CLUS, CRT, CDF, CTL) and
    // answers "Guardado productividad correctamente".
    [Fact]
    public async Task GuardarProductividadReplacesThePeriodWithTheLegacyColumns()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SuministrosRepository(new RecordingConnectionFactory(connection));
        var service = new CargueProductividadService(new StubSheets(), repository);
        var propia = new ProductividadCargueRow(1033, "SAN PEDRO", 1002, "VEOLIA", 2026, 2, 1m, 2m, 3m, 4m, 5m, 6m);
        var tercero = new ProductividadCargueRow(1033, "SAN PEDRO", 2002, "OTRA", 2026, 2, 7m, 8m, 9m, 10m, 11m, 12m);

        await service.GuardarAsync(new CargueProductividadGuardarRequest([propia], [tercero]), CancellationToken.None);

        Assert.Equal(4, connection.Commands.Count);
        Assert.Equal("DELETE FROM PORD_PROPIA WHERE PRODANNO = :anno AND PRODMES = :mes", connection.Commands[0].CommandText);
        Assert.Equal("DELETE FROM PORD_TERCERO WHERE TERCANNO = :anno AND TERCMES = :mes", connection.Commands[1].CommandText);
        Assert.Equal(new object?[] { 2026, 2 }, new[] { "anno", "mes" }.Select(connection.Commands[1].Value));
        Assert.Contains("PORD_PROPIA (CODAPS, NOMAPS, CODEMPRESA, NOMEMPRESA, PRODANNO, PRODMES, PRODCCS, PRODCBLS, PRODCLUS, PRODCRT, PRODCDF, PRODCTL)", connection.Commands[2].CommandText);
        Assert.Equal(new object?[] { 1033, "SAN PEDRO", 1002, "VEOLIA", 2026, 2, 1m, 2m, 3m, 4m, 5m, 6m },
            new[] { "codAps", "aps", "codEmpresa", "empresa", "anno", "mes", "ccs", "cbls", "clus", "crt", "cdf", "ctl" }.Select(connection.Commands[2].Value));
        Assert.Contains("PORD_TERCERO (CODAPS, NOMAPS, CODEMPRESA, NOMEMPRESA, TERCANNO, TERCMES, TERCCCS, TERCCBLS, TERCCLUS, TERCCRT, TERCCDF, TERCCTL)", connection.Commands[3].CommandText);
        Assert.Equal(2002, connection.Commands[3].Value("codEmpresa"));
        Assert.True(connection.Committed);
    }

    [Fact]
    public async Task GuardarProductividadAnswersTheLegacySuccessText()
    {
        using var factory = new SuministrosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/guardarProductividad", new
        {
            // Legacy CargueProductividad.vue:107-115 sends keys with spaces replaced by '_' (COD_APS, COD_EMPRESA).
            dataPropios = new[] { new { COD_APS = 1033, APS = "SAN PEDRO", COD_EMPRESA = 1002, EMPRESA = "VEOLIA", ANNO = 2026, MES = 2, CCS = 1m, CBLS = 2m, CLUS = 3m, CRT = 4m, CDF = 5m, CTL = 6m } },
            dataTerceros = Array.Empty<object>()
        });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Guardado productividad correctamente", body.GetProperty("data").GetString());
        var request = Assert.Single(factory.Productividad.Calls);
        var fila = Assert.Single(request.dataPropios!);
        Assert.Equal((1033, 1002, 2026, 2, 6m), (fila.COD_APS, fila.COD_EMPRESA, fila.ANNO, fila.MES, fila.CTL));
    }

    // Legacy controller.js:92-145 (cargueProductividad): reads spreadsheet 1ECODm4vcJk8q-IdthFNQWI9qrpZRd7kYqPat0bHtoXw tabs PROPIA
    // and TERCEROS and keeps the rows whose ANNO (thousand separator '.' removed) and MES match the request.
    [Fact]
    public async Task CargueProductividadFiltersBothTabsByAnnoAndMes()
    {
        var sheets = new StubSheets();
        var service = new CargueProductividadService(sheets, new SuministrosRepository(new RecordingConnectionFactory(new RecordingDbConnection(_ => 1))));

        var (propios, terceros) = await service.ConsultarAsync(2025, 7, CancellationToken.None);

        Assert.Equal(new[] { ("1ECODm4vcJk8q-IdthFNQWI9qrpZRd7kYqPat0bHtoXw", "PROPIA"), ("1ECODm4vcJk8q-IdthFNQWI9qrpZRd7kYqPat0bHtoXw", "TERCEROS") }, sheets.Reads);
        Assert.Equal(new object?[] { "A", "C" }, propios.Select(r => r["APS"]));
        Assert.Equal(new object?[] { "T" }, terceros.Select(r => r["APS"]));
    }

    private static DataTable Table(params (string Column, object Value)[] cells)
    {
        var table = new DataTable();
        foreach (var (column, value) in cells) table.Columns.Add(column, value.GetType());
        table.Rows.Add(cells.Select(c => c.Value).ToArray());
        return table;
    }
}

file sealed class SuministrosApiFactory : WebApplicationFactory<Program>
{
    internal RecordingSuministrosRepository Suministros { get; } = new();
    internal RecordingProductividadService Productividad { get; } = new();

    internal HttpClient CreateAuthorizedClient(long sisuId)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(sisuId));
        return client;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<ISuministrosRepository>();
            services.AddSingleton<ISuministrosRepository>(Suministros);
            services.RemoveAll<ICargueProductividadService>();
            services.AddSingleton<ICargueProductividadService>(Productividad);
            services.RemoveAll<IValidacionesRepository>();
            services.AddSingleton<IValidacionesRepository>(new FixedValidaciones());
        });
    }
}

file sealed class FixedValidaciones : IValidacionesRepository
{
    public Task<string?> ExecuteAsync(string oracleFunction, int aps, int anno, int mes, CancellationToken ct) => Task.FromResult<string?>("0");
}

file sealed class RecordingProductividadService : ICargueProductividadService
{
    public List<CargueProductividadGuardarRequest> Calls { get; } = [];

    public Task<(IReadOnlyList<Dictionary<string, object?>> Propios, IReadOnlyList<Dictionary<string, object?>> Terceros)> ConsultarAsync(int anno, int mes, CancellationToken cancellationToken)
        => Task.FromResult<(IReadOnlyList<Dictionary<string, object?>>, IReadOnlyList<Dictionary<string, object?>>)>(([], []));

    public Task GuardarAsync(CargueProductividadGuardarRequest request, CancellationToken cancellationToken)
    {
        Calls.Add(request);
        if ((request.dataPropios?.Count ?? 0) == 0 && (request.dataTerceros?.Count ?? 0) == 0)
        {
            throw new InvalidOperationException("No hay datos para insertar.");
        }

        return Task.CompletedTask;
    }
}

file sealed class StubSheets : IGoogleSheetsService
{
    public List<(string Spreadsheet, string Tab)> Reads { get; } = [];

    public Task<GoogleSheetTabData> ReadTabAsync(string spreadsheetId, string tabTitle, CancellationToken cancellationToken)
    {
        Reads.Add((spreadsheetId, tabTitle));
        IReadOnlyList<Dictionary<string, object?>> rows = tabTitle == "PROPIA"
            ?
            [
                new() { ["APS"] = "A", ["ANNO"] = 2025d, ["MES"] = 7d },
                new() { ["APS"] = "B", ["ANNO"] = 2025d, ["MES"] = 6d },
                new() { ["APS"] = "C", ["ANNO"] = "2.025", ["MES"] = "7" }
            ]
            :
            [
                new() { ["APS"] = "T", ["ANNO"] = 2025d, ["MES"] = 7d },
                new() { ["APS"] = "U", ["ANNO"] = 2024d, ["MES"] = 7d }
            ];
        return Task.FromResult(new GoogleSheetTabData { SheetTitle = tabTitle, Rows = rows });
    }

    public Task<IReadOnlyList<GoogleSheetMetadata>> ListMetadataAsync(string spreadsheetId, CancellationToken cancellationToken) => throw new NotSupportedException();
    public Task<IReadOnlyList<string>> ReadHeadersAsync(string spreadsheetId, string tabTitle, CancellationToken cancellationToken) => throw new NotSupportedException();
    public Task<IReadOnlyList<string>> ListTabTitlesAsync(string spreadsheetId, CancellationToken cancellationToken) => throw new NotSupportedException();
}

file sealed class RecordingSuministrosRepository : ISuministrosRepository
{
    public List<string> Calls { get; } = [];
    public List<(CargueComercialRequest Request, long Usuario)> CargueComercial { get; } = [];
    public List<(TercerosRequest Request, long Usuario)> Terceros { get; } = [];
    public List<(CertificarSemestralRequest Request, long Usuario)> CertificarSemestral { get; } = [];
    public List<(PodaEditarRequest Request, long Usuario)> RegistrarPoda { get; } = [];
    public List<(SetReversionRequest Request, int Usuario)> Reversiones { get; } = [];
    public int? CertificarSemestralResult { get; set; }
    public PlCertificarSemestralResponse PlCertificarSemestralResult { get; set; } = new([]);

    public Task<int> SetCargueComercialAsync(CargueComercialRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        Calls.Add("filecarguecomercial");
        CargueComercial.Add((request, usuarioId));
        return Task.FromResult(request.filecontent?.Count ?? 0);
    }

    public Task<int> SetTercerosAsync(TercerosRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        Calls.Add("setTerceros");
        Terceros.Add((request, usuarioId));
        return Task.FromResult(1);
    }

    public Task<int?> CertificarSemestralAsync(CertificarSemestralRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        Calls.Add("Certificarsemestral");
        CertificarSemestral.Add((request, usuarioId));
        return Task.FromResult(CertificarSemestralResult);
    }

    public Task<PlCertificarSemestralResponse> PlCertificarSemestralAsync(CertificarSemestralRequest request, CancellationToken cancellationToken)
    {
        Calls.Add("plcertificarSemestral");
        return Task.FromResult(PlCertificarSemestralResult);
    }

    public Task RegistrarPodaAsync(PodaEditarRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        Calls.Add("registrarPoda");
        RegistrarPoda.Add((request, usuarioId));
        return Task.CompletedTask;
    }

    public Task<ReversionResponse> SetReversionAsync(SetReversionRequest request, int sisuId, CancellationToken cancellationToken)
    {
        Calls.Add("setReversion");
        Reversiones.Add((request, sisuId));
        return Task.FromResult(new ReversionResponse(true, null, 1));
    }

    public Task<IReadOnlyList<ReversionHistoryItem>> GetReversionAsync(CancellationToken cancellationToken) => Record<IReadOnlyList<ReversionHistoryItem>>("getReversion", []);
    public Task<int> SetCargueInfPropiaAsync(CarguePropiaRequest request, long usuarioId, CancellationToken cancellationToken) => Record("setCargueInfPropia", 1);
    public Task<int> SetCargueInfPropiaSemAsync(CarguePropiaSemRequest request, long usuarioId, CancellationToken cancellationToken) => Record("setCargueInfPropiaSem", 1);
    public Task<int> SetCargueInfCompetidorAsync(CargueCompetidorRequest request, long usuarioId, CancellationToken cancellationToken) => Record("setCargueInfCompetidor", 1);
    public Task<int> SetCargueInfCompetidorSemestralAsync(CargueCompetidorSemRequest request, long usuarioId, CancellationToken cancellationToken) => Record("setCargueInfCompetidorSemestral", 1);
    public Task<int> SetCargueComercialSemAsync(CargueComercialSemRequest request, long usuarioId, CancellationToken cancellationToken) => Record("filecarguecomercialsemestral", 1);
    public Task ReemplazarProductividadAsync(int anno, int mes, IReadOnlyList<ProductividadCargueRow> propios, IReadOnlyList<ProductividadCargueRow> terceros, CancellationToken cancellationToken) => Record("reemplazarProductividad", 0);
    public Task<int> GuardarQrtRuralAsync(QRTRuralRequest request, long usuarioId, CancellationToken cancellationToken) => Record("guardarQRTRural", 1);
    public Task<IReadOnlyList<dynamic>> GetCanCertificateAsync(PrevalidarRequest request, CancellationToken cancellationToken) => Record<IReadOnlyList<dynamic>>("getcanCertificate", []);
    public Task<int> GetCanCertificateSemestralAsync(PrevalidarSemestralRequest request, CancellationToken cancellationToken) => Record("getcanCertificateSemestral", 0);
    public Task<int?> CertificarAsync(CertificarRequest request, long usuarioId, CancellationToken cancellationToken) => Record<int?>("Certificar", 1);
    public Task<string?> CertificarMensualAsync(CertificarRequest request, CancellationToken cancellationToken) => Record<string?>("certificarMensual", null);
    public Task<string?> CenrtificarEditarAsync(CertificarRequest request, CancellationToken cancellationToken) => Record<string?>("cenrtificarEditar", "0");
    public Task<IReadOnlyList<dynamic>> GetPodaAsync(PodaConsultaRequest request, CancellationToken cancellationToken) => Record<IReadOnlyList<dynamic>>("getPoda", []);
    public Task<IReadOnlyList<dynamic>> ConsultaCostoPodaAsync(PodaCatalogoRequest request, CancellationToken cancellationToken) => Record<IReadOnlyList<dynamic>>("consultaCostoPoda", []);
    public Task NewCostoPodaAsync(PodaNuevoRequest request, long usuarioId, CancellationToken cancellationToken) => Record("newCostoPoda", 0);

    private Task<T> Record<T>(string name, T result)
    {
        Calls.Add(name);
        return Task.FromResult(result);
    }
}

file sealed class RecordingConnectionFactory(RecordingDbConnection connection) : IOracleConnectionFactory
{
    public IDbConnection CreateConnection() => connection;
}

/// <summary>A command as the repository sent it: SQL text plus the bound parameters.</summary>
file sealed class RecordedCommand(string commandText, IReadOnlyList<DbParameter> parameters)
{
    public string CommandText { get; } = commandText;
    public IReadOnlyList<DbParameter> Parameters { get; } = parameters;

    public DbParameter Parameter(string name)
        => Parameters.Single(p => string.Equals(p.ParameterName.TrimStart(':', '@'), name, StringComparison.Ordinal));

    public object? Value(string name) => Parameter(name).Value;
}

/// <summary>
/// In-memory ADO.NET connection that records every command Dapper executes and answers it through
/// <c>respond</c> (a <see cref="DataTable"/> for readers, an int for non-queries; output parameters are set in place).
/// </summary>
file sealed class RecordingDbConnection(Func<RecordedCommand, object?> respond) : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;

    public List<RecordedCommand> Commands { get; } = [];
    public bool Committed { get; set; }
    public bool RolledBack { get; set; }

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => "recording";
    public override string DataSource => "recording";
    public override string ServerVersion => "1";
    public override ConnectionState State => state;

    public override void ChangeDatabase(string databaseName) { }
    public override void Close() => state = ConnectionState.Closed;
    public override void Open() => state = ConnectionState.Open;

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) => new RecordingTransaction(this);
    protected override DbCommand CreateDbCommand() => new RecordingCommand(this);

    internal object? Execute(RecordingCommand command)
    {
        var recorded = new RecordedCommand(command.CommandText, command.RecordedParameters.ToList());
        Commands.Add(recorded);
        return respond(recorded);
    }

    private sealed class RecordingTransaction(RecordingDbConnection owner) : DbTransaction
    {
        private bool done;

        public override IsolationLevel IsolationLevel => IsolationLevel.ReadCommitted;
        protected override DbConnection? DbConnection => done ? null : owner;

        public override void Commit()
        {
            owner.Committed = true;
            done = true;
        }

        public override void Rollback()
        {
            owner.RolledBack = true;
            done = true;
        }
    }
}

file sealed class RecordingCommand(RecordingDbConnection owner) : DbCommand
{
    private readonly RecordingParameterCollection parameters = new();

    internal IEnumerable<DbParameter> RecordedParameters => parameters.Items;

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string CommandText { get; set; } = string.Empty;
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; } = CommandType.Text;
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get; set; }
    protected override DbParameterCollection DbParameterCollection => parameters;
    protected override DbTransaction? DbTransaction { get; set; }

    public override void Cancel() { }
    public override void Prepare() { }
    protected override DbParameter CreateDbParameter() => new RecordingParameter();

    public override int ExecuteNonQuery() => owner.Execute(this) is int rows ? rows : 0;

    public override object? ExecuteScalar()
    {
        var result = owner.Execute(this);
        return result is DataTable table ? (table.Rows.Count > 0 ? table.Rows[0][0] : null) : result;
    }

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
        => (owner.Execute(this) as DataTable ?? new DataTable()).CreateDataReader();
}

file sealed class RecordingParameter : DbParameter
{
    public override DbType DbType { get; set; } = DbType.Object;
    public override ParameterDirection Direction { get; set; } = ParameterDirection.Input;
    public override bool IsNullable { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ParameterName { get; set; } = string.Empty;
    public override int Size { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string SourceColumn { get; set; } = string.Empty;
    public override bool SourceColumnNullMapping { get; set; }
    public override object? Value { get; set; }

    public override void ResetDbType() => DbType = DbType.Object;
}

file sealed class RecordingParameterCollection : DbParameterCollection
{
    internal List<DbParameter> Items { get; } = [];

    public override int Count => Items.Count;
    public override object SyncRoot => Items;

    public override int Add(object value)
    {
        Items.Add((DbParameter)value);
        return Items.Count - 1;
    }

    public override void AddRange(Array values)
    {
        foreach (var value in values) Add(value);
    }

    public override void Clear() => Items.Clear();
    public override bool Contains(object value) => Items.Contains((DbParameter)value);
    public override bool Contains(string value) => IndexOf(value) >= 0;
    public override void CopyTo(Array array, int index) => ((ICollection)Items).CopyTo(array, index);
    public override IEnumerator GetEnumerator() => Items.GetEnumerator();
    public override int IndexOf(object value) => Items.IndexOf((DbParameter)value);
    public override int IndexOf(string parameterName) => Items.FindIndex(p => p.ParameterName == parameterName);
    public override void Insert(int index, object value) => Items.Insert(index, (DbParameter)value);
    public override void Remove(object value) => Items.Remove((DbParameter)value);
    public override void RemoveAt(int index) => Items.RemoveAt(index);
    public override void RemoveAt(string parameterName) => Items.RemoveAt(IndexOf(parameterName));
    protected override DbParameter GetParameter(int index) => Items[index];
    protected override DbParameter GetParameter(string parameterName) => Items[IndexOf(parameterName)];
    protected override void SetParameter(int index, DbParameter value) => Items[index] = value;
    protected override void SetParameter(string parameterName, DbParameter value) => Items[IndexOf(parameterName)] = value;
}
