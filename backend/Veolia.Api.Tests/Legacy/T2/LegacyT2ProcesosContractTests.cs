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
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Aprovechamiento;
using Veolia.Api.Modules.Regulator.Costos;
using Veolia.Api.Modules.Regulator.Indices;
using Veolia.Api.Modules.Regulator.Productividad;
using Veolia.Api.Modules.Regulator.SubCont;
using Veolia.Api.Modules.Regulator.Validaciones;

namespace Veolia.Api.Tests.Legacy.T2;

/// <summary>
/// Legacy characterization of /api/v1/{aprovechamiento, productividad, subcon, validaciones} and the /api/v1/costos and
/// /api/v1/indices endpoints not pinned by RegulatorSuministrosContractTests. Legacy sources:
/// back-tarificador/src/modules/{suministros,subcont,validaciones,costos,indicesCRA}/{routes.js,controller.js}.
/// </summary>
public sealed class LegacyT2ProcesosContractTests
{
    private const long TokenUser = 4242;

    // ---------- 308 Activar Aprovechamiento (legacy suministros/getAprovechamiento + postAprovechamiento) ----------

    // Legacy suministros/controller.js:851-869: SELECT * FROM aprov_activar WHERE APSID=:1 AND APROANNO=:2 AND APROMES=:3.
    [Fact]
    public async Task AprovechamientoConsultaFiltersByApsAnnoMes()
    {
        var connection = new RecordingDbConnection(_ => Table(("ApsId", 5), ("AproAnno", 2026), ("AproMes", 2), ("AproActivar", 1)));
        var repository = new AprovechamientoRepository(new RecordingConnectionFactory(connection));

        var row = await repository.ConsultarAsync(5, 2026, 2);

        Assert.NotNull(row);
        Assert.Equal((5, 2026, 2, 1), (row.ApsId, row.AproAnno, row.AproMes, row.AproActivar));
        var command = Assert.Single(connection.Commands);
        Assert.Contains("FROM APROV_ACTIVAR", command.CommandText);
        Assert.Contains("WHERE APSID = :aps", command.CommandText);
        Assert.Contains("AND APROANNO = :anno", command.CommandText);
        Assert.Contains("AND APROMES = :mes", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(command.Value));
    }

    // Legacy suministros/routes.js:163-173: when no row exists for (aps, anno, mes) it INSERTs (controller.js:805-819,
    // VALUES(aps, anno, mes, activar, SYSDATE, usuario)) with usuario = req.SISU_ID.
    [Fact]
    public async Task AprovechamientoActualizarInsertsWhenThePeriodHasNoRow()
    {
        var connection = new RecordingDbConnection(command => command.CommandText.Contains("SELECT") ? new DataTable() : 1);
        var repository = new AprovechamientoRepository(new RecordingConnectionFactory(connection));

        await repository.ActualizarAsync(5, 2026, 2, activar: true, usuarioId: TokenUser);

        Assert.Equal(2, connection.Commands.Count);
        var insert = connection.Commands[1];
        Assert.Equal(AprovechamientoRepository.InsertSql, insert.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2, 1, TokenUser }, new[] { "1", "2", "3", "4", "5" }.Select(insert.Value));
    }

    // Legacy suministros/routes.js:169-171 + controller.js:821-834: an existing row is UPDATEd
    // (SET APROACTIVAR = :1 WHERE APSID = :2 AND APROANNO = :3 AND APROMES = :4); nothing is inserted.
    [Fact]
    public async Task AprovechamientoActualizarUpdatesAnExistingRow()
    {
        var connection = new RecordingDbConnection(command => command.CommandText.Contains("SELECT")
            ? Table(("ApsId", 5), ("AproAnno", 2026), ("AproMes", 2), ("AproActivar", 1))
            : 1);
        var repository = new AprovechamientoRepository(new RecordingConnectionFactory(connection));

        await repository.ActualizarAsync(5, 2026, 2, activar: false, usuarioId: TokenUser);

        Assert.Equal(2, connection.Commands.Count);
        var update = connection.Commands[1];
        Assert.Contains("UPDATE APROV_ACTIVAR", update.CommandText);
        Assert.Contains("SET APROACTIVAR = :activar", update.CommandText);
        Assert.Contains("WHERE APSID = :aps", update.CommandText);
        Assert.Equal(new object?[] { 0, 5, 2026, 2 }, new[] { "activar", "aps", "anno", "mes" }.Select(update.Value));
        Assert.DoesNotContain(connection.Commands, c => c.CommandText.StartsWith("INSERT", StringComparison.Ordinal));
    }

    // Legacy suministros/routes.js:165 uses req.SISU_ID (recorded deviation S11 "T1+S2 Usuario desde el token").
    [Fact]
    public async Task AprovechamientoActualizarUsesTheTokenUser()
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/aprovechamiento/actualizar", new { aps = 5, anno = 2026, mes = 2, activar = true, usuario = 9 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new[] { (5, 2026, 2, true, TokenUser) }, factory.Aprovechamiento.Updates);
    }

    // Legacy ActAprovechamiento.vue:75 / SuministrosService.js:46-51 send `activar` as 1 or 0 (numbers).
    [Fact(Skip = "PARITY-FINDING: aprovechamiento/actualizar binds `activar` as a JSON boolean; the legacy numeric activar = 1/0 is rejected with 400.")]
    public async Task AprovechamientoActualizarAcceptsTheLegacyNumericActivar()
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/aprovechamiento/actualizar", new { aps = 5, anno = 2026, mes = 2, activar = 1 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new[] { (5, 2026, 2, true, TokenUser) }, factory.Aprovechamiento.Updates);
    }

    // ---------- 303 Ajuste Productividad (legacy suministros/getProductividad + setProductividad) ----------

    // Legacy suministros/controller.js:690-696: SELECT * FROM AUCO_PRODUCTIVIDAD WHERE APSA_ID = :1 AND PROD_ANNO = :2 AND PROD_MES = :3.
    [Fact]
    public async Task ProductividadConsultaFiltersByApsAnnoMes()
    {
        var connection = new RecordingDbConnection(_ => Table(("ApsaId", 5), ("ProdAnno", 2026), ("ProdMes", 2), ("ProdValor", 0.85m)));
        var repository = new ProductividadRepository(new RecordingConnectionFactory(connection));

        var row = await repository.ConsultarAsync(5, 2026, 2);

        Assert.Equal(0.85m, row!.ProdValor);
        var command = Assert.Single(connection.Commands);
        Assert.Contains("FROM AUCO_PRODUCTIVIDAD", command.CommandText);
        Assert.Contains("WHERE APSA_ID = :aps", command.CommandText);
        Assert.Contains("AND PROD_ANNO = :anno", command.CommandText);
        Assert.Contains("AND PROD_MES = :mes", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(command.Value));
    }

    // Legacy suministros/controller.js:513-527: INSERT INTO AUCO_PRODUCTIVIDAD VALUES(:1 aps, :2 anno, :3 mes, :4 valor, SYSDATE, :5 usuario).
    [Fact]
    public async Task ProductividadCrearInsertsPositionallyWithTheUser()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new ProductividadRepository(new RecordingConnectionFactory(connection));

        await repository.CrearAsync(5, 2026, 3, 0.75m, TokenUser);

        var command = Assert.Single(connection.Commands);
        Assert.Contains("INSERT INTO AUCO_PRODUCTIVIDAD", command.CommandText);
        Assert.Contains("VALUES (:aps, :anno, :mes, :valor, SYSDATE, :usuario)", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 3, 0.75m, TokenUser }, new[] { "aps", "anno", "mes", "valor", "usuario" }.Select(command.Value));
    }

    // Legacy suministros/routes.js:63-67 passes req.SISU_ID to setProductividad.
    [Fact]
    public async Task ProductividadCrearUsesTheTokenUser()
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/productividad/crear", new { aps = 5, anno = 2026, mes = 3, valor = 0.75m, usuario = 9 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(new[] { ("crear", 5, 2026, 3, 0.75m, (long?)TokenUser) }, factory.Productividad.Calls);
    }

    // Legacy suministros/controller.js:529-542: UPDATE AUCO_PRODUCTIVIDAD SET PROD_VALOR = :1 WHERE APSA_ID = :2 AND PROD_ANNO = :3 AND PROD_MES = :4.
    // The month shift legacy did inside uptProductividad lives in the frontend (parity-review-all.md S11 "Productividad (303)",
    // ajuste-productividad.component.spec.ts), so the API updates exactly the period it receives.
    [Fact]
    public async Task ProductividadEditarUpdatesTheReceivedPeriod()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new ProductividadRepository(new RecordingConnectionFactory(connection));

        var updated = await repository.EditarAsync(5, 2025, 12, 0.9m);

        Assert.True(updated);
        var command = Assert.Single(connection.Commands);
        Assert.Contains("UPDATE AUCO_PRODUCTIVIDAD", command.CommandText);
        Assert.Contains("SET PROD_VALOR = :valor", command.CommandText);
        Assert.Equal(new object?[] { 0.9m, 5, 2025, 12 }, new[] { "valor", "aps", "anno", "mes" }.Select(command.Value));
    }

    // Legacy suministros/routes.js:69-73 answers 200 with the driver result even when no row matched.
    [Fact(Skip = "PARITY-FINDING: productividad/editar answers 404 \"No se encontró un registro de productividad para ese período.\" when nothing is updated; legacy PUT setProductividad answered 200.")]
    public async Task ProductividadEditarWithoutRowAnswersOkLikeLegacy()
    {
        using var factory = new ProcesosApiFactory();
        factory.Productividad.EditarResult = false;
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PutAsJsonAsync("/api/v1/productividad/editar", new { aps = 5, anno = 2025, mes = 12, valor = 0.9m });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ---------- 302 Subsidios y Contribuciones (legacy subcont/routes.js) ----------

    // Legacy subcont/controller.js:26-33: SELECT * FROM auco_apssubscont WHERE apsa_id = :1 AND suco_anno = :2 AND suco_mes = :3
    // (no SUCO_ESTADO filter); controller.js:44-52 updates by (aps, anno, mes, CLAS_CLASE) without SUCO_ESTADO either.
    [Fact(Skip = "PARITY-FINDING: subcon consulta and editar add SUCO_ESTADO = 1; legacy (subcont/controller.js:26-33, :44-52) had no estado filter, so rows with another SUCO_ESTADO disappear from the screen and are not updated.")]
    public async Task SubContConsultaAndEditarDoNotFilterByEstado()
    {
        var connection = new RecordingDbConnection(_ => new DataTable());
        var repository = new SubContRepository(new RecordingConnectionFactory(connection));

        await repository.ConsultarAsync(5, 2026, 2, CancellationToken.None);
        await repository.EditarAsync(5, 2026, 2, [new SubContValorItem(1, 10m)], CancellationToken.None);

        Assert.All(connection.Commands, c => Assert.DoesNotContain("SUCO_ESTADO", c.CommandText));
    }

    // Legacy subcont/controller.js:26-33 binds (aps, anno, mes).
    [Fact]
    public async Task SubContConsultaBindsApsAnnoMes()
    {
        var connection = new RecordingDbConnection(_ => new DataTable());
        var repository = new SubContRepository(new RecordingConnectionFactory(connection));

        await repository.ConsultarAsync(5, 2026, 2, CancellationToken.None);

        var command = Assert.Single(connection.Commands);
        Assert.Contains("FROM AUCO_APSSUBSCONT", command.CommandText);
        Assert.Contains("WHERE APSA_ID = :aps AND SUCO_ANNO = :anno AND SUCO_MES = :mes", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(command.Value));
    }

    // Legacy subcont/controller.js:5-24: looks up AUCO_APSEMPRDIVI (APSA_ID = :1 AND APEM_ESTADO = 1) and INSERTs one row per
    // valor: (SAUCO_APSSUBSCONT.NEXTVAL, aps, EMPR_EMPR, DIVI_DIVI, valor.id, anno, mes, PARA_TIPPRED20016 = 2, valor.val,
    // SUCO_ESTADO = 1, CURRENT_DATE, usuario).
    [Fact]
    public async Task SubContCrearLooksUpEmpresaDivisionAndInsertsEachValor()
    {
        var connection = new RecordingDbConnection(command => command.CommandText.Contains("AUCO_APSEMPRDIVI")
            ? Table(("APSA_ID", 5), ("EMPR_EMPR", 1002), ("DIVI_DIVI", 3))
            : 1);
        var repository = new SubContRepository(new RecordingConnectionFactory(connection));

        var result = await repository.CrearAsync(5, 2026, 2, [new SubContValorItem(1, 10m), new SubContValorItem(7, -50m)], TokenUser, CancellationToken.None);

        Assert.True(result.Success);
        var lookup = connection.Commands[0];
        Assert.Contains("WHERE APSA_ID = :aps AND APEM_ESTADO = 1", lookup.CommandText);
        Assert.Equal(5, lookup.Value("aps"));
        Assert.Equal(3, connection.Commands.Count);
        var insert = connection.Commands[2];
        Assert.Contains("(SUCO_ID, APSA_ID, EMPR_EMPR, DIVI_DIVI, CLAS_CLASE, SUCO_ANNO, SUCO_MES,", insert.CommandText);
        Assert.Contains("PARA_TIPPRED20016, SUCO_VALOR, SUCO_ESTADO, SUCO_FECHACREACION, USUA_USUA)", insert.CommandText);
        Assert.Contains(":sucoValor, 1, CURRENT_DATE, :usuaUsua", insert.CommandText);
        Assert.Equal(new object?[] { 5, 1002, 3, 7, 2026, 2, 2, -50m, TokenUser },
            new[] { "apsaId", "emprEmpr", "diviDivi", "clasClase", "sucoAnno", "sucoMes", "paraTippred", "sucoValor", "usuaUsua" }.Select(insert.Value));
        Assert.True(connection.Committed);
    }

    // Legacy SubCon.vue:291-302 sends the nine clases (est1..est6, com, indu, ofi) with val = null for blank inputs and
    // subcont/controller.js:13-20 inserts them (SUCO_VALOR null).
    [Fact(Skip = "PARITY-FINDING: subcon/crear rejects valores with val = null (400); legacy SubCon.vue sent all nine clases with blank values as null and inserted them.")]
    public async Task SubContCrearAcceptsBlankValoresLikeLegacy()
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/subcon/crear", new
        {
            aps = 5,
            anno = 2026,
            mes = 2,
            valores = new object[] { new { id = 1, val = (decimal?)10m }, new { id = 2, val = (decimal?)null } }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, Assert.Single(factory.SubCont.Creates).Valores.Count);
    }

    // Legacy subcont/routes.js:21-31 uses req.SISU_ID and the body { aps, anno, mes, valores: [{ id, val }] }.
    [Fact]
    public async Task SubContCrearUsesTheTokenUserAndTheLegacyBody()
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/subcon/crear", new { aps = 5, anno = 2026, mes = 2, valores = new[] { new { id = 1, val = 10.5m } }, usuario = 9 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var crear = Assert.Single(factory.SubCont.Creates);
        Assert.Equal((5, 2026, 2, TokenUser), (crear.Aps, crear.Anno, crear.Mes, crear.Usuario));
        Assert.Equal(new[] { new SubContValorItem(1, 10.5m) }, crear.Valores);
    }

    // Legacy subcont/controller.js:44-52 binds (val, aps, anno, mes, CLAS_CLASE) per valor.
    [Fact]
    public async Task SubContEditarUpdatesEachClaseOfThePeriod()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new SubContRepository(new RecordingConnectionFactory(connection));

        await repository.EditarAsync(5, 2026, 2, [new SubContValorItem(1, 10m), new SubContValorItem(2, 11m)], CancellationToken.None);

        Assert.Equal(2, connection.Commands.Count);
        Assert.Contains("SET SUCO_VALOR = :sucoValor", connection.Commands[1].CommandText);
        Assert.Equal(new object?[] { 11m, 5, 2026, 2, 2 }, new[] { "sucoValor", "aps", "anno", "mes", "clasClase" }.Select(connection.Commands[1].Value));
        Assert.True(connection.Committed);
    }

    // Legacy subcont/routes.js:6 guards consulta with authJwt.verificarToken (403 "No existe token" when missing).
    [Fact]
    public async Task SubContConsultaRequiresTheToken()
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/subcon/consulta", new { aps = 5, anno = 2026, mes = 2 });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(factory.SubCont.Creates);
    }

    // ---------- Validaciones (legacy validaciones/routes.js + controller.js) ----------

    // Legacy validaciones/routes.js:7-78 maps each route to PK_VALGRAL (controller.js): certificarfauco_existarifa -> fauco_generasui
    // (:14), cpsuivsfact (:47), cpproductividad (:80), cpenero (:113), integracion (:208), existerelleno (:145),
    // certificarfauco_existarifacert -> fauco_tarifacert (:175); each reads { aps, anno, mes } from the body.
    [Theory]
    [InlineData("certificarfauco_existarifa", "fauco_generasui")]
    [InlineData("certificarFauco_cpsuivsfact", "fauco_cpsuivsfact")]
    [InlineData("certificarFauco_cpproductividad", "fauco_cpproductividad")]
    [InlineData("certificarFauco_cpenero", "fauco_cpenero")]
    [InlineData("certificarFauco_integracion", "fauco_integracion")]
    [InlineData("certificarfauco_existerelleno", "fauco_existerelleno")]
    [InlineData("certificarfauco_existarifacert", "fauco_tarifacert")]
    public async Task ValidacionRoutesCallTheLegacyPackageFunction(string route, string function)
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync($"/api/v1/validaciones/{route}", new { aps = 1033, anno = 2025, mes = 11 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new[] { (function, 1033, 2025, 11) }, factory.Validaciones.Calls);
    }

    // Legacy validaciones/controller.js:12-22: BEGIN :res := PK_VALGRAL.<fn>(:1,:2,:3); END; binding 1 = aps, 2 = anno, 3 = mes,
    // res = BIND_OUT STRING.
    [Theory]
    [InlineData("fauco_generasui")]
    [InlineData("fauco_cpsuivsfact")]
    [InlineData("fauco_cpproductividad")]
    [InlineData("fauco_cpenero")]
    [InlineData("fauco_integracion")]
    [InlineData("fauco_existerelleno")]
    [InlineData("fauco_tarifacert")]
    public async Task ValidacionRepositoryBindsApsAnnoMesInLegacyOrder(string function)
    {
        var connection = new RecordingDbConnection(command =>
        {
            command.Parameter("res").Value = "0";
            return 1;
        });
        var repository = new ValidacionesRepository(new RecordingConnectionFactory(connection));

        var raw = await repository.ExecuteAsync(function, 1033, 2025, 11, CancellationToken.None);

        Assert.Equal("0", raw);
        var command = Assert.Single(connection.Commands);
        Assert.Equal($"BEGIN :res := PK_VALGRAL.{function}(:1,:2,:3); END;", command.CommandText);
        Assert.Equal(new object?[] { 1033, 2025, 11 }, new[] { "1", "2", "3" }.Select(command.Value));
        Assert.Equal((ParameterDirection.Output, DbType.String), (command.Parameter("res").Direction, command.Parameter("res").DbType));
    }

    // Recorded deviation (parity-review-all.md S10 "Exigir token" / L19): legacy validaciones routes were anonymous (routes.js:7-78).
    [Fact]
    public async Task ValidacionRoutesNowRequireTheToken()
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/validaciones/certificarFauco_integracion", new { aps = 1033, anno = 2025, mes = 11 });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(factory.Validaciones.Calls);
    }

    // Legacy validaciones/controller.js:26-29 answers the raw function result (resPl.res); a message is passed through as-is.
    [Fact]
    public async Task ValidacionKeepsTheRawMessageOfAFailedCheck()
    {
        using var factory = new ProcesosApiFactory();
        factory.Validaciones.Result = "El costo de poda de facturación supera el costo SUI";
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync("/api/v1/validaciones/certificarFauco_cpsuivsfact", new { aps = 1033, anno = 2025, mes = 11 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(body.GetProperty("ok").GetBoolean());
        Assert.Equal("El costo de poda de facturación supera el costo SUI", body.GetProperty("message").GetString());
    }

    // Legacy validaciones/controller.js:187-190 returns resPl.res unchanged, so callers tell "0" from "1"
    // (Calculo.vue:384-389 enables CERTIFICAR only when existarifacert === 0).
    [Fact(Skip = "PARITY-FINDING: validaciones collapses the raw results \"0\" and \"1\" into the same { ok: true, message: null }; legacy returned the raw value and Calculo.vue enabled CERTIFICAR only for 0.")]
    public async Task ValidacionLetsCallersDistinguishZeroFromOne()
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        factory.Validaciones.Result = "0";
        var cero = await (await client.PostAsJsonAsync("/api/v1/validaciones/certificarfauco_existarifacert", new { aps = 1, anno = 2025, mes = 11 })).Content.ReadAsStringAsync();
        factory.Validaciones.Result = "1";
        var uno = await (await client.PostAsJsonAsync("/api/v1/validaciones/certificarfauco_existarifacert", new { aps = 1, anno = 2025, mes = 11 })).Content.ReadAsStringAsync();

        Assert.NotEqual(cero, uno);
    }

    // ---------- 401 Cálculo de tarifas: costos queries ----------

    // Legacy costos/controller.js:26-34: SELECT * FROM vauco_costos WHERE APSCOSTO = :1 AND ANNOCOSTO = :2 AND MESCOSTO = :3.
    [Fact]
    public async Task CostosConsultarFiltersVaucoCostosByApsAnnoMes()
    {
        var connection = new RecordingDbConnection(_ => new DataTable());
        var repository = new CostosRepository(new RecordingConnectionFactory(connection), null!, null!);

        await repository.ConsultarCostosAsync(5, 2026, 2, CancellationToken.None);

        var command = Assert.Single(connection.Commands);
        Assert.Contains("FROM VAUCO_COSTOS", command.CommandText);
        Assert.Contains("WHERE APSCOSTO = :aps AND ANNOCOSTO = :anno AND MESCOSTO = :mes", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(command.Value));
    }

    // Legacy costos/controller.js:36-43: SELECT * FROM vacuo_costosclus WHERE apsa_id = :1 and cost_anno = :2 and cost_mes = :3.
    [Fact]
    public async Task CostosClusFiltersVacuoCostosClusByApsAnnoMes()
    {
        var connection = new RecordingDbConnection(_ => Table(("ApsaId", 5), ("CostAnno", 2026), ("CostMes", 2), ("ParaCosto20021", 1), ("ParaNombre", "BARRIDO"), ("CostValor", 12.5m)));
        var repository = new CostosRepository(new RecordingConnectionFactory(connection), null!, null!);

        var rows = await repository.ConsultarCostosClusAsync(5, 2026, 2, CancellationToken.None);

        Assert.Equal(("BARRIDO", 12.5m), (Assert.Single(rows).ParaNombre, rows[0].CostValor));
        var command = Assert.Single(connection.Commands);
        Assert.Contains("FROM VACUO_COSTOSCLUS", command.CommandText);
        Assert.Contains("WHERE APSA_ID = :aps AND COST_ANNO = :anno AND COST_MES = :mes", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(command.Value));
    }

    // Legacy costos/controller.js:45-52: VAUCO_ACTICLUS WHERE APSA_ID = :1 AND INED_ANNO*12+INED_MES BETWEEN (:2*12+:3)-6 AND :2*12+:3.
    [Fact]
    public async Task CostosComportaClusReadsTheLastSixMonthsWindow()
    {
        var connection = new RecordingDbConnection(_ => new DataTable());
        var repository = new CostosRepository(new RecordingConnectionFactory(connection), null!, null!);

        await repository.ConsultarComportaClusAsync(5, 2026, 2, CancellationToken.None);

        var command = Assert.Single(connection.Commands);
        Assert.Contains("FROM VAUCO_ACTICLUS", command.CommandText);
        Assert.Contains("INED_ANNO * 12 + INED_MES BETWEEN (:anno * 12 + :mes) - 6 AND :anno * 12 + :mes", command.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(command.Value));
    }

    // Legacy costos/controller.js:54-85: pk_validaciones.fauco_antesliquidar(:1 aps, :2 mes, :3 anno), then
    // SELECT * FROM VAUCO_ANTESLIQUIDAR WHERE VALI_ANNO = :1 AND VALI_MES = :2 AND APSA_ID = :3.
    [Fact]
    public async Task ValidapreactualizaRunsAntesLiquidarThenReadsTheView()
    {
        var connection = new RecordingDbConnection(command => command.CommandText.Contains("fauco_antesliquidar")
            ? 1
            : Table(("EmpresaNombre", "VEOLIA"), ("Grupo", "CLUS"), ("Variable", "LBL"), ("Valor", 1.5m), ("EmpresaPropia", 1m)));
        var repository = new CostosRepository(new RecordingConnectionFactory(connection), null!, null!);

        var response = await repository.ValidapreactualizaAsync(5, 2, 2026, (int)TokenUser, CancellationToken.None);

        var pl = connection.Commands[0];
        Assert.Equal("BEGIN :res := PK_VALIDACIONES.fauco_antesliquidar(:1,:2,:3); END;", pl.CommandText);
        Assert.Equal(new object?[] { 5, 2, 2026 }, new[] { "1", "2", "3" }.Select(pl.Value));
        var vista = connection.Commands[1];
        Assert.Contains("FROM VAUCO_ANTESLIQUIDAR", vista.CommandText);
        Assert.Contains("WHERE APSA_ID = :aps AND VALI_ANNO = :anno AND VALI_MES = :mes", vista.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2 }, new[] { "aps", "anno", "mes" }.Select(vista.Value));
        Assert.Equal(new VerificacionDetalleResponse("VEOLIA", "CLUS", "LBL", 1.5m, 1m), Assert.Single(response.Detalle));
    }

    // Legacy costos/controller.js:87-119: pk_liquidar.fauco_calculartarifas(:1 aps, :2 mes, :3 anno, :4 usuario);
    // Calculo.vue:310-316 treats res != 0 as "Ya existen tarifas calculadas" and 0 as "Tarifas Calculadas".
    [Theory]
    [InlineData(0, true)]
    [InlineData(1, false)]
    public async Task CalculartarifasBindsTheLegacyOrderAndTreatsZeroAsSuccess(int res, bool exitoso)
    {
        var connection = new RecordingDbConnection(command =>
        {
            command.Parameter("res").Value = res;
            return 1;
        });
        var repository = new CostosRepository(new RecordingConnectionFactory(connection), null!, null!);

        var response = await repository.CalculartarifasAsync(5, 2, 2026, (int)TokenUser, CancellationToken.None);

        Assert.Equal(exitoso, response.Exitoso);
        var command = Assert.Single(connection.Commands);
        Assert.Equal("BEGIN :res := PK_LIQUIDAR.fauco_calculartarifas(:1,:2,:3,:4); END;", command.CommandText);
        Assert.Equal(new object?[] { 5, 2, 2026, (int)TokenUser }, new[] { "1", "2", "3", "4" }.Select(command.Value));
    }

    // Legacy costos/controller.js:7-17: INSERT INTO TARIFICADOR.AUCO_TARICERTIFICADA (APSA_ID, TACE_ANNO, TACE_MES, TACE_FECCREA,
    // USUA_USUARIO) VALUES(:1, :2, :3, SYSDATE, :4) with usuario = req.SISU_ID.
    [Fact]
    public async Task CertificarTarifasInsertsTheLegacyRow()
    {
        var connection = new RecordingDbConnection(command => command.CommandText.Contains("AUCO_TARICERTIFICADA") && command.CommandText.Contains("COUNT")
            ? Table(("C", 0))
            : command.CommandText.Contains("VAUCO_COSTOS") ? Table(("C", 3)) : 1);
        var repository = new CostosRepository(new RecordingConnectionFactory(connection), null!, null!);

        var response = await repository.CertificarTarifasAsync(5, 2, 2026, (int)TokenUser, CancellationToken.None);

        Assert.True(response.Certificado);
        var insert = Assert.Single(connection.Commands, c => c.CommandText.StartsWith("INSERT", StringComparison.Ordinal));
        Assert.Contains("AUCO_TARICERTIFICADA (APSA_ID, TACE_ANNO, TACE_MES, TACE_FECCREA, USUA_USUARIO)", insert.CommandText);
        Assert.Contains("VALUES (:aps, :anno, :mes, SYSDATE, :usuario)", insert.CommandText);
        Assert.Equal(new object?[] { 5, 2026, 2, (int)TokenUser }, new[] { "aps", "anno", "mes", "usuario" }.Select(insert.Value));
        Assert.True(connection.Committed);
    }

    // Legacy costos/controller.js:7-17 inserts the certification without checking VAUCO_COSTOS first.
    [Fact(Skip = "PARITY-FINDING: certificarTarifas rejects the period (\"No existe cálculo previo para certificar el período seleccionado.\") when VAUCO_COSTOS has no rows; legacy inserted AUCO_TARICERTIFICADA unconditionally.")]
    public async Task CertificarTarifasInsertsEvenWithoutAPreviousCalculation()
    {
        var connection = new RecordingDbConnection(command => command.CommandText.Contains("COUNT") ? Table(("C", 0)) : 1);
        var repository = new CostosRepository(new RecordingConnectionFactory(connection), null!, null!);

        await repository.CertificarTarifasAsync(5, 2, 2026, (int)TokenUser, CancellationToken.None);

        Assert.Single(connection.Commands, c => c.CommandText.StartsWith("INSERT", StringComparison.Ordinal));
    }

    // Legacy costos/routes.js:14-38 read { aps, anno, mes } for consultar/cosclus/comportaclus (envelope is a recorded deviation).
    [Theory]
    [InlineData("consultar")]
    [InlineData("cosclus")]
    [InlineData("comportaclus")]
    public async Task CostosQueriesForwardApsAnnoMes(string route)
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync($"/api/v1/costos/{route}", new { aps = 5, anno = 2026, mes = 2 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Array, body.GetProperty("data").ValueKind);
        Assert.Equal(new[] { (route, 5, 2026, 2) }, factory.Costos.Queries);
    }

    // Legacy costos/routes.js:27-31 (getclusjson -> PK_JSON.fjson_clus) and :41-45 (actualizar -> pk_costos.fauco_actualizacostos).
    [Theory(Skip = "PARITY-FINDING: legacy /api/v1/costos/getclusjson and /api/v1/costos/actualizar answer 404 in the new API (CLUS JSON moved to /informes; actualizar dropped).")]
    [InlineData("getclusjson")]
    [InlineData("actualizar")]
    public async Task LegacyCostosRoutesStillExist(string route)
    {
        using var factory = new ProcesosApiFactory();
        using var client = factory.CreateAuthorizedClient(TokenUser);

        var response = await client.PostAsJsonAsync($"/api/v1/costos/{route}", new { aps = 5, anno = 2026, mes = 2 });

        Assert.NotEqual(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ---------- 305 Índices CRA (legacy indicesCRA/routes.js) ----------

    // Legacy indicesCRA/controller.js:25-32: auco_indicescra WHERE indi_anno = :1 AND indi_mes = :2 and indi_estado = 1.
    [Fact]
    public async Task IndicesConsultaFiltersActiveRowsOfThePeriod()
    {
        var connection = new RecordingDbConnection(_ => new DataTable());
        var repository = new IndicesRepository(new RecordingConnectionFactory(connection));

        await repository.GetByPeriodAsync(2026, 2);

        var command = Assert.Single(connection.Commands);
        Assert.Contains("FROM AUCO_INDICESCRA", command.CommandText);
        Assert.Contains("WHERE INDI_ANNO = :anno", command.CommandText);
        Assert.Contains("AND INDI_MES = :mes", command.CommandText);
        Assert.Contains("AND INDI_ESTADO = 1", command.CommandText);
        Assert.Equal(new object?[] { 2026, 2 }, new[] { "anno", "mes" }.Select(command.Value));
    }

    // Legacy indicesCRA/controller.js:34-40 (GET /): SELECT * FROM auco_indicescra WHERE indi_estado = 1.
    [Fact]
    public async Task IndicesListarReturnsActiveRows()
    {
        var connection = new RecordingDbConnection(_ => new DataTable());
        var repository = new IndicesRepository(new RecordingConnectionFactory(connection));

        await repository.GetAllAsync();

        Assert.Contains("WHERE INDI_ESTADO = 1", Assert.Single(connection.Commands).CommandText);
    }

    // Legacy indicesCRA/controller.js:5-23: per valor INSERT VALUES (sauco_indicescra.nextval, valor.id, anno, mes, 1, valor.val,
    // valor.val/2, sysdate, usuario) with usuario = req.SISU_ID (routes.js:26).
    [Fact]
    public async Task IndicesCrearInsertsValorAndHalfValorWithTheUser()
    {
        var connection = new RecordingDbConnection(command => command.CommandText.Contains("COUNT(1)") ? Table(("C", 0))
            : command.CommandText.Contains("MIN(INDI_ID)") ? Table(("C", 90L)) : 1);
        var repository = new IndicesRepository(new RecordingConnectionFactory(connection));
        var dto = new IndicesCrearRequestDto { Anno = 2026, Mes = 2, Valores = [new IndiceValorDto { Id = 2, Val = 1423500m }] };

        var id = await repository.CrearAsync(dto, TokenUser);

        Assert.Equal(90L, id);
        var insert = Assert.Single(connection.Commands, c => c.CommandText.Contains("INSERT INTO AUCO_INDICESCRA"));
        Assert.Contains("SAUCO_INDICESCRA.NEXTVAL", insert.CommandText);
        Assert.Equal(new object?[] { 2L, 2026, 2, 1423500m, 711750m, TokenUser }, new[] { "paraId", "anno", "mes", "valor", "mitadValor", "usuario" }.Select(insert.Value));
        Assert.True(connection.Committed);
    }

    // Legacy indicesCRA/controller.js:5-23 has no duplicate check: a second crear for the same period inserts again.
    [Fact(Skip = "PARITY-FINDING: indices/crear answers 409 \"Ya existen índices activos para ese período.\" when the period already has active rows; legacy inserted them again.")]
    public async Task IndicesCrearForAnExistingPeriodInsertsLikeLegacy()
    {
        var connection = new RecordingDbConnection(command => command.CommandText.Contains("COUNT(1)") ? Table(("C", 4)) : command.CommandText.Contains("MIN(") ? Table(("C", 1L)) : 1);
        var repository = new IndicesRepository(new RecordingConnectionFactory(connection));

        await repository.CrearAsync(new IndicesCrearRequestDto { Anno = 2026, Mes = 2, Valores = [new IndiceValorDto { Id = 1, Val = 5m }] }, TokenUser);

        Assert.Single(connection.Commands, c => c.CommandText.Contains("INSERT INTO AUCO_INDICESCRA"));
    }

    // Legacy indicesCRA/controller.js:42-52: UPDATE auco_indicescra SET INDI_VALOR = :1, INDI_MITADVALOR = :2/2
    // WHERE para_indice20011 = :3 AND indi_anno = :4 AND indi_mes = :5 (no indi_estado filter).
    [Fact(Skip = "PARITY-FINDING: indices/editar adds INDI_ESTADO = 1 to the UPDATE; legacy (indicesCRA/controller.js:47) updated the period's rows regardless of estado.")]
    public async Task IndicesEditarDoesNotFilterByEstado()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new IndicesRepository(new RecordingConnectionFactory(connection));

        await repository.EditarAsync(new IndicesEditarRequestDto { Anno = 2026, Mes = 2, Valores = [new IndiceValorDto { Id = 1, Val = 5m }] });

        Assert.DoesNotContain("INDI_ESTADO", Assert.Single(connection.Commands).CommandText);
    }

    // Same legacy source: binds (val, val/2, indice, anno, mes).
    [Fact]
    public async Task IndicesEditarBindsValorHalfValorIndiceAnnoMes()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new IndicesRepository(new RecordingConnectionFactory(connection));

        var updated = await repository.EditarAsync(new IndicesEditarRequestDto { Anno = 2026, Mes = 2, Valores = [new IndiceValorDto { Id = 3, Val = 5m }] });

        Assert.True(updated);
        var command = Assert.Single(connection.Commands);
        Assert.Contains("SET INDI_VALOR = :valor", command.CommandText);
        Assert.Contains("INDI_MITADVALOR = :mitadValor", command.CommandText);
        Assert.Equal(new object?[] { 5m, 2.5m, 3L, 2026, 2 }, new[] { "valor", "mitadValor", "paraId", "anno", "mes" }.Select(command.Value));
    }

    // Legacy indicesCRA/controller.js:54-60 (intent): UPDATE auco_indicescra SET indi_estado = 0 WHERE para_indice20011 = :1
    // AND indi_anno = :2 AND indi_mes = :3 (legacy SQL had a stray ')' and always failed).
    [Fact]
    public async Task IndicesEliminarDeactivatesTheIndiceOfThePeriod()
    {
        var connection = new RecordingDbConnection(_ => 1);
        var repository = new IndicesRepository(new RecordingConnectionFactory(connection));

        var deleted = await repository.EliminarAsync(3, 2026, 2);

        Assert.True(deleted);
        var command = Assert.Single(connection.Commands);
        Assert.Contains("SET INDI_ESTADO = 0", command.CommandText);
        Assert.Contains("WHERE PARA_INDICE20011 = :paraId", command.CommandText);
        Assert.Equal(new object?[] { 3L, 2026, 2 }, new[] { "paraId", "anno", "mes" }.Select(command.Value));
    }

    private static DataTable Table(params (string Column, object Value)[] cells)
    {
        var table = new DataTable();
        foreach (var (column, value) in cells) table.Columns.Add(column, value.GetType());
        table.Rows.Add(cells.Select(c => c.Value).ToArray());
        return table;
    }
}

file sealed class ProcesosApiFactory : WebApplicationFactory<Program>
{
    internal RecordingAprovechamiento Aprovechamiento { get; } = new();
    internal RecordingProductividad Productividad { get; } = new();
    internal RecordingSubCont SubCont { get; } = new();
    internal RecordingValidaciones Validaciones { get; } = new();
    internal RecordingCostos Costos { get; } = new();

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
            services.RemoveAll<IAprovechamientoRepository>();
            services.AddSingleton<IAprovechamientoRepository>(Aprovechamiento);
            services.RemoveAll<IProductividadRepository>();
            services.AddSingleton<IProductividadRepository>(Productividad);
            services.RemoveAll<ISubContRepository>();
            services.AddSingleton<ISubContRepository>(SubCont);
            services.RemoveAll<IValidacionesRepository>();
            services.AddSingleton<IValidacionesRepository>(Validaciones);
            services.RemoveAll<ICostosRepository>();
            services.AddSingleton<ICostosRepository>(Costos);
        });
    }
}

file sealed class RecordingAprovechamiento : IAprovechamientoRepository
{
    public List<(int Aps, int Anno, int Mes, bool Activar, long Usuario)> Updates { get; } = [];

    public Task<AprovechamientoResponseDto?> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken = default)
        => Task.FromResult<AprovechamientoResponseDto?>(null);

    public Task ActualizarAsync(int aps, int anno, int mes, bool activar, long usuarioId, CancellationToken cancellationToken = default)
    {
        Updates.Add((aps, anno, mes, activar, usuarioId));
        return Task.CompletedTask;
    }
}

file sealed class RecordingProductividad : IProductividadRepository
{
    public List<(string Op, int Aps, int Anno, int Mes, decimal Valor, long? Usuario)> Calls { get; } = [];
    public bool EditarResult { get; set; } = true;

    public Task<ProductividadResponseDto?> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken = default)
        => Task.FromResult<ProductividadResponseDto?>(null);

    public Task CrearAsync(int aps, int anno, int mes, decimal valor, long usuarioId, CancellationToken cancellationToken = default)
    {
        Calls.Add(("crear", aps, anno, mes, valor, usuarioId));
        return Task.CompletedTask;
    }

    public Task<bool> EditarAsync(int aps, int anno, int mes, decimal valor, CancellationToken cancellationToken = default)
    {
        Calls.Add(("editar", aps, anno, mes, valor, null));
        return Task.FromResult(EditarResult);
    }
}

file sealed class RecordingSubCont : ISubContRepository
{
    public List<(int Aps, int Anno, int Mes, List<SubContValorItem> Valores, long Usuario)> Creates { get; } = [];

    public Task<List<SubContItemResponse>> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken) => Task.FromResult(new List<SubContItemResponse>());

    public Task<SubContResponse> CrearAsync(int aps, int anno, int mes, List<SubContValorItem> valores, long usuarioId, CancellationToken cancellationToken)
    {
        Creates.Add((aps, anno, mes, valores, usuarioId));
        return Task.FromResult(new SubContResponse(true, null));
    }

    public Task<SubContResponse> EditarAsync(int aps, int anno, int mes, List<SubContValorItem> valores, CancellationToken cancellationToken) => Task.FromResult(new SubContResponse(true, null));
    public Task<List<SubContApsResponse>> ListarApsAsync(CancellationToken cancellationToken) => Task.FromResult(new List<SubContApsResponse>());
    public Task<SubContResponse> EliminarAsync(long id, CancellationToken cancellationToken) => Task.FromResult(new SubContResponse(true, null));
}

file sealed class RecordingValidaciones : IValidacionesRepository
{
    public List<(string Function, int Aps, int Anno, int Mes)> Calls { get; } = [];
    public string? Result { get; set; } = "0";

    public Task<string?> ExecuteAsync(string oracleFunction, int aps, int anno, int mes, CancellationToken ct)
    {
        Calls.Add((oracleFunction, aps, anno, mes));
        return Task.FromResult(Result);
    }
}

file sealed class RecordingCostos : ICostosRepository
{
    public List<(string Route, int Aps, int Anno, int Mes)> Queries { get; } = [];

    public Task<IReadOnlyList<CostoItemResponse>> ConsultarCostosAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        Queries.Add(("consultar", aps, anno, mes));
        return Task.FromResult<IReadOnlyList<CostoItemResponse>>([]);
    }

    public Task<IReadOnlyList<CostoClusItemResponse>> ConsultarCostosClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        Queries.Add(("cosclus", aps, anno, mes));
        return Task.FromResult<IReadOnlyList<CostoClusItemResponse>>([]);
    }

    public Task<IReadOnlyList<ComportaClusItemResponse>> ConsultarComportaClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        Queries.Add(("comportaclus", aps, anno, mes));
        return Task.FromResult<IReadOnlyList<ComportaClusItemResponse>>([]);
    }

    public Task<ValidapreactualizaResponse> ValidapreactualizaAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken) => throw new NotSupportedException();
    public Task<RunPrechecksResponse> RunPrechecksAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken) => throw new NotSupportedException();
    public Task<CalculartarifasResponse> CalculartarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken) => throw new NotSupportedException();
    public Task<CertificarTarifasResponse> CertificarTarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken) => throw new NotSupportedException();
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
