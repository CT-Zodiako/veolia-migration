using System.Collections;
using System.Data;
using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging.Abstractions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Pgirs;
using Veolia.Api.Modules.Regulator.Reversiones;
using Veolia.Api.Modules.Regulator.Sui;
using Veolia.Api.Modules.Regulator.SuiReversiones;

namespace Veolia.Api.Tests.Legacy.T3;

// Legacy-derived characterization of Regulator PGIRS (2001-2003), Reversiones (3001-3004),
// SUI read endpoints (801/803/804) and SUI reversiones (805).
// Legacy source of truth: /Users/zodiako/DEV/oracle/back-tarificador/src/modules/{pgirs,reversiones,sui,validaciones}.
// Approved deviations (odd/tasks/parity-review-all.md): token on every /api/v1 route (S10), response
// envelopes (T9/T10 "Response envelope INTENTIONAL"), user taken from the token (S11 "T1+S2"),
// 803/804 routes renamed (T18/T19/T20 "routes renamed where intentional").

public sealed class LegacyT3PgirsContractTests
{
    // ---------------- Repository: SQL, view and bind order ----------------

    // Legacy pgirs/controller.js:6-10 (infoPgirs): "SELECT * FROM vgirs_informe WHERE apsid = :1", binds [aps];
    // db.open returns the rows with the Oracle column names (database/database.js:19,58).
    [Fact]
    public async Task ResumenReadsVgirsInformeByApsAndKeepsOracleColumns()
    {
        var db = new RecordingDb(_ => T3Data.Table(("APSID", 7), ("APSA_NOMAPS", "Tunja"), ("PERIODO", "2025-03"), ("PODA", 1.23456m)));
        var repository = new PgirsRepository(new RecordingFactory(db));

        var rows = (await repository.GetResumenAsync(7)).Cast<IDictionary<string, object>>().ToList();

        var command = Assert.Single(db.Commands);
        Assert.Equal(T3Sql.Normalize("SELECT * FROM vgirs_informe WHERE apsid = :1"), T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7"], command.BindsInSqlOrder().Select(T3Data.Text));
        var row = Assert.Single(rows);
        Assert.Equal(["APSID", "APSA_NOMAPS", "PERIODO", "PODA"], row.Keys);
        Assert.Equal("Tunja", row["APSA_NOMAPS"]);
        Assert.Equal(1.23456m, row["PODA"]);
    }

    // Legacy pgirs/controller.js:18-22 (informePgirs): vpgir_infvariables WHERE APSAID = :1 ORDER BY apsa_nomaps, periodo DESC.
    [Fact]
    public async Task InformeVariablesReadsVpgirInfvariablesOrderedByApsAndPeriodoDesc()
    {
        var db = new RecordingDb(_ => T3Data.Table(("APSA_NOMAPS", "Tunja"), ("PERIODO", "2025-03"), ("PGRINGRESO", "MANUAL"), ("PGRIFECHA", "2025-04-02T00:00:00"), ("SISU_CORREO", "a@v.com")));
        var repository = new PgirsRepository(new RecordingFactory(db));

        var rows = (await repository.GetInformeVariablesAsync(7)).Cast<IDictionary<string, object>>().ToList();

        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("SELECT * FROM vpgir_infvariables  WHERE APSAID = :1  ORDER BY apsa_nomaps, periodo DESC"),
            T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.Equal(["APSA_NOMAPS", "PERIODO", "PGRINGRESO", "PGRIFECHA", "SISU_CORREO"], Assert.Single(rows).Keys);
    }

    // Legacy pgirs/controller.js:12-16 (barridoVariablesPgirs): "SELECT * FROM VGIRS_INFORMELBL WHERE apsid = :1".
    [Fact]
    public async Task BarridoReadsVgirsInformelblByAps()
    {
        var db = new RecordingDb(_ => T3Data.Table(("APSID", 7), ("SEMESTRE", 1), ("BARRIDO", 2.5m), ("BARRIDOPGIRS", 3m)));
        var repository = new PgirsRepository(new RecordingFactory(db));

        var rows = (await repository.GetBarridoAsync(7)).Cast<IDictionary<string, object>>().ToList();

        var command = Assert.Single(db.Commands);
        Assert.Equal(T3Sql.Normalize("SELECT * FROM VGIRS_INFORMELBL WHERE apsid = :1"), T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.Equal(["APSID", "SEMESTRE", "BARRIDO", "BARRIDOPGIRS"], Assert.Single(rows).Keys);
    }

    // Legacy pgirs/controller.js:25-29 (getVariablesPGRIS): vpirg_parametros WHERE APSAID = :1 AND PGRIANNO = :2 AND PGRIMES = :3,
    // binds [aps, anno, mes].
    [Fact]
    public async Task VariablesReadsVpirgParametrosByApsAnnoMesInLegacyOrder()
    {
        var db = new RecordingDb(_ => T3Data.Table(("APSAID", 7), ("PGRIVARIABLE", 11), ("PGRIVALOR", 4.5m)));
        var repository = new PgirsRepository(new RecordingFactory(db));

        var rows = (await repository.GetVariablesAsync(7, 2025, 3)).ToList();

        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("SELECt * FROM vpirg_parametros WHERE APSAID = :1 AND PGRIANNO = :2 AND PGRIMES = :3"),
            T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7", "2025", "3"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.Single(rows);
    }

    // Legacy pgirs/controller.js:49-53 (editarVariablesPGIRS): UPDATE TARIFICADOR.PGRI_PARAMETROS SET PGRIVALOR= :1,
    // PGRIFRECUENCIA= :2, PGRIFECHA=sysdate, PGRIUSUARIO= :3, pgringreso= 'MANUAL' WHERE APSAID= :4 AND PGRIANNO= :5
    // AND PGRIMES= :6 AND PGRIVARIABLE= :7. The user now comes from the token (parity-review S11 "T1+S2 Usuario desde el token").
    [Fact]
    public async Task EditarUpdatesPgriParametrosWithTheLegacyStatementAndBindOrder()
    {
        var db = new RecordingDb(_ => 1);
        var repository = new PgirsRepository(new RecordingFactory(db));

        var updated = await repository.EditarVariablesAsync(
            [new EditarVariableDto { ApsId = 7, Anno = 2025, Mes = 2, CodVariable = 22, Valor = 9.75m, Frecuencia = "2" }],
            usuarioId: 55);

        Assert.True(updated);
        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("UPDATE TARIFICADOR.PGRI_PARAMETROS SET PGRIVALOR= :1, PGRIFRECUENCIA= :2, PGRIFECHA=sysdate, PGRIUSUARIO= :3, pgringreso= 'MANUAL' WHERE APSAID= :4 AND PGRIANNO= :5 AND PGRIMES= :6 AND PGRIVARIABLE= :7"),
            T3Sql.Normalize(command.CommandText));
        Assert.Equal(["9.75", "2", "55", "7", "2025", "2", "22"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.True(db.Committed);
    }

    // Legacy pgirs/controller.js:70-151 (nuevoVariablesPGRIS): one INSERT INTO TARIFICADOR.PGRI_PARAMETROS
    // (APSAID, PGRIANNO, PGRIMES, PGRIVARIABLE, PGRIVALOR, PGRIFRECUENCIA, PGRIFECHA, PGRIUSUARIO) VALUES (:1..:6, SYSDATE, :7)
    // per variable in the order LBL 11, CESPED 21, PODA 22, LAVADO 23, PLAYAS 24, INSCESTAS 25, MANCESTAS 26,
    // binds [aps, anno, mes, codigo, Number(valor), parseInt(frecuencia), SISU_ID] (user from the token, routes.js:43).
    [Fact]
    public async Task NuevoInsertsTheSevenVariablesInLegacyOrderWithLegacyBinds()
    {
        var db = new RecordingDb(_ => 1);
        var repository = new PgirsRepository(new RecordingFactory(db));

        var created = await repository.NuevoVariablesAsync(new NuevoVariablesRequestDto
        {
            ApsId = 7, Anno = 2025, Mes = 2,
            Lbl = 1m, LblFrecuencia = "1",
            Cesped = 2m, CespedFrecuencia = "2",
            Poda = 3m, PodaFrecuencia = "3",
            Lavado = 4m, LavadoFrecuencia = "1",
            Playas = 5m, PlayasFrecuencia = "2",
            Inscestas = 6m, InscestasFrecuencia = "3",
            Mancestas = 7m, MancestasFrecuencia = "1"
        }, usuarioId: 55);

        Assert.True(created);
        Assert.Equal(7, db.Commands.Count);
        Assert.All(db.Commands, c => Assert.Equal(
            T3Sql.Normalize("INSERT INTO TARIFICADOR.PGRI_PARAMETROS (APSAID, PGRIANNO, PGRIMES, PGRIVARIABLE, PGRIVALOR, PGRIFRECUENCIA, PGRIFECHA, PGRIUSUARIO) VALUES (:1, :2, :3, :4, :5, :6, SYSDATE, :7)"),
            T3Sql.Normalize(c.CommandText)));
        Assert.Equal(
            [
                "7,2025,2,11,1,1,55",
                "7,2025,2,21,2,2,55",
                "7,2025,2,22,3,3,55",
                "7,2025,2,23,4,1,55",
                "7,2025,2,24,5,2,55",
                "7,2025,2,25,6,3,55",
                "7,2025,2,26,7,1,55"
            ],
            db.Commands.Select(c => string.Join(",", c.BindsInSqlOrder().Select(T3Data.Text))));
        Assert.True(db.Committed);
    }

    // ---------------- HTTP: routes, auth, envelope, token user ----------------

    // Legacy pgirs/routes.js:8-21,49-54: infoPgirs/informePgirs/barridoVariablesPgirs read the APS and answer the rows.
    // New canonical routes keep the same data inside the approved envelope (parity-review T9/T10).
    [Theory]
    [InlineData("resumen", "Resumen(7)")]
    [InlineData("informe-variables", "InformeVariables(7)")]
    [InlineData("barrido", "Barrido(7)")]
    public async Task ApsReportsAnswerTheViewRowsInsideTheEnvelope(string route, string expectedCall)
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync($"/api/v1/pgirs/{route}", new { apsId = 7 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await T3Data.Json(response);
        Assert.Equal("success", json.GetProperty("status").GetString());
        Assert.Equal("OK", json.GetProperty("message").GetString());
        var row = Assert.Single(json.GetProperty("data").EnumerateArray());
        Assert.Equal("Tunja", row.GetProperty("APSA_NOMAPS").GetString());
        Assert.Equal(1.5m, row.GetProperty("PODA").GetDecimal());
        Assert.Equal([expectedCall], factory.Pgirs.Calls);
    }

    // Legacy pgirs/routes.js:23-28 (getVariablesPGRIS) binds aps, anno, mes. It had no token check; the token is now
    // required on every /api/v1 route (parity-review S10) and the legacy 403 message is kept (middlewares/authJwt.js:12-15).
    [Fact]
    public async Task VariablesForwardsApsAnnoMesAndRequiresAToken()
    {
        using var factory = new T3ApiFactory();
        using var anonymous = factory.CreateClient();
        using var client = T3Data.Client(factory, sisuId: 55);

        var rejected = await anonymous.PostAsJsonAsync("/api/v1/pgirs/variables", new { apsId = 7, anno = 2025, mes = 3 });
        var accepted = await client.PostAsJsonAsync("/api/v1/pgirs/variables", new { apsId = 7, anno = 2025, mes = 3 });

        Assert.Equal(HttpStatusCode.Forbidden, rejected.StatusCode);
        Assert.Equal("No existe token de verificacion", (await T3Data.Json(rejected)).GetProperty("message").GetString());
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        Assert.Equal("success", (await T3Data.Json(accepted)).GetProperty("status").GetString());
        Assert.Equal(["Variables(7,2025,3)"], factory.Pgirs.Calls);
    }

    // Legacy pgirs/routes.js:41-46 (nuevoVariablesPGRIS) passes req.SISU_ID (token user) to the INSERT.
    [Fact]
    public async Task GuardarUsesTheTokenUser()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync("/api/v1/pgirs/guardar", new { apsId = 7, anno = 2025, mes = 2, lbl = 1.5m, lblFrecuencia = "1" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Variables creadas", (await T3Data.Json(response)).GetProperty("message").GetString());
        Assert.Equal(["Nuevo(7,2025,2,lbl=1.5/1,usuario=55)"], factory.Pgirs.Calls);
    }

    // Legacy pgirs/routes.js:30-38 edits one row; its user is now the token user (parity-review S11 "T1+S2").
    [Fact]
    public async Task ActualizarVariableUsesTheTokenUser()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync("/api/v1/pgirs/actualizar-variable", new
        {
            variables = new[] { new { apsId = 7, anno = 2025, mes = 2, codVariable = 22, valor = 9.75m, frecuencia = "2" } }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Variables actualizadas", (await T3Data.Json(response)).GetProperty("message").GetString());
        Assert.Equal(["Editar(7,2025,2,22,9.75,2,usuario=55)"], factory.Pgirs.Calls);
    }

    // Legacy request contract: pgirs/routes.js:8-28 read the body field "aps" (and anno, mes) on the routes infoPgirs,
    // informePgirs, barridoVariablesPgirs and getVariablesPGRIS; pgirsService.js:9-101 posts exactly those bodies.
    // Accepted deviation: legacy-characterization-tests S8/S9 (renamed legacy routes and request field names consumed consistently by pgirs.service.ts): the reads take
    // "apsId" on resumen/informe-variables/barrido/variables; infoPgirs/informePgirs stay as aliases with the new body.
    [Theory]
    [InlineData("resumen", "{\"apsId\":7}", "Resumen(7)")]
    [InlineData("infoPgirs", "{\"apsId\":7}", "Resumen(7)")]
    [InlineData("informe-variables", "{\"apsId\":7}", "InformeVariables(7)")]
    [InlineData("informePgirs", "{\"apsId\":7}", "InformeVariables(7)")]
    [InlineData("barrido", "{\"apsId\":7}", "Barrido(7)")]
    [InlineData("variables", "{\"apsId\":7,\"anno\":2025,\"mes\":3}", "Variables(7,2025,3)")]
    public async Task RenamedReadRoutesAndBodiesAreAccepted(string route, string body, string expectedCall)
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsync($"/api/v1/pgirs/{route}", T3Data.Body(body));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([expectedCall], factory.Pgirs.Calls);
    }

    // Legacy pgirs/routes.js:30-38 + controller.js:53: POST editarVariablesPGIRS {datatable: {PGRIVALOR, PGRIFRECUENCIA,
    // APSAID, PGRIANNO, PGRIMES, PGRIVARIABLE}} (one row object, tableVariablesPGRIS.vue:280-284).
    // Accepted deviation: legacy-characterization-tests S8/S9 (renamed route/fields): the edit is "actualizar-variable" {variables:[{apsId,anno,mes,codVariable,valor,
    // frecuencia}]} (ActualizarVariableUsesTheTokenUser); the legacy route no longer exists.
    [Fact]
    public async Task LegacyEditarVariablesRouteWasRenamed()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsync("/api/v1/pgirs/editarVariablesPGIRS", T3Data.Body(
            "{\"datatable\":{\"PGRIVALOR\":9.75,\"PGRIFRECUENCIA\":2,\"APSAID\":7,\"PGRIANNO\":2025,\"PGRIMES\":2,\"PGRIVARIABLE\":22}}"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(factory.Pgirs.Calls);
    }

    // Legacy pgirs/routes.js:41-46 + controller.js:78-151 and tableVariablesPGRIS.vue:344-362: POST nuevoVariablesPGRIS
    // {LBL, selectorLBL, CESPED, selectorCESPED, ..., MANCESTAS, selectorMANCESTAS, anno, mes, aps}.
    // Accepted deviation: legacy-characterization-tests S8/S9 (renamed route/fields): the create is "guardar" {apsId, anno, mes, lbl, lblFrecuencia, ...}
    // (GuardarUsesTheTokenUser above); the legacy route no longer exists.
    [Fact]
    public async Task LegacyNuevoVariablesRouteWasRenamed()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var legacy = await client.PostAsync("/api/v1/pgirs/nuevoVariablesPGRIS", T3Data.Body(
            "{\"LBL\":\"1.5\",\"selectorLBL\":\"1\",\"aps\":7,\"anno\":2025,\"mes\":2}"));
        var renamed = await client.PostAsync("/api/v1/pgirs/guardar", T3Data.Body(
            "{\"lbl\":1.5,\"lblFrecuencia\":\"1\",\"apsId\":7,\"anno\":2025,\"mes\":2}"));

        Assert.Equal(HttpStatusCode.NotFound, legacy.StatusCode);
        Assert.Equal(HttpStatusCode.OK, renamed.StatusCode);
        Assert.Equal(["Nuevo(7,2025,2,lbl=1.5/1,usuario=55)"], factory.Pgirs.Calls);
    }
}

public sealed class LegacyT3ReversionesContractTests
{
    // Legacy reversiones/controller.js:6-13: INSERT INTO TARIFICADOR.REVE_AUTORIZACION (APSA_ID, AUTO_ANNO, AUTO_MES,
    // AUTO_DESCRIPCION, AUTO_FECCREA, USUA_USUARIO) VALUES(:1, :2, :3, :4, SYSDATE , :5), binds [aps, anno, mes, descripcion, usuario].
    [Fact]
    public async Task CrearAutorizacionInsertsReveAutorizacionWithLegacyBinds()
    {
        var db = new RecordingDb(_ => 1);
        var repository = new ReversionesRepository(new RecordingFactory(db));

        var affected = await repository.CrearAutorizacion(7, 2025, 2, "Corrección F24", 55, CancellationToken.None);

        Assert.Equal(1, affected);
        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("INSERT INTO TARIFICADOR.REVE_AUTORIZACION (APSA_ID, AUTO_ANNO, AUTO_MES, AUTO_DESCRIPCION, AUTO_FECCREA, USUA_USUARIO) VALUES(:1, :2, :3, :4, SYSDATE , :5)"),
            T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7", "2025", "2", "Corrección F24", "55"], command.BindsInSqlOrder().Select(T3Data.Text));
    }

    // Legacy reversiones/controller.js:16-26: SELECT * FROM vreve_autorizacion WHERE SISU_ID = :1 ORDER BY 2 DESC, 3 DESC, 1.
    [Fact]
    public async Task DetalladoAutorizacionReadsTheViewForTheUserInLegacyOrder()
    {
        var db = new RecordingDb(_ => T3Data.Table(("APSA_NOMAPS", "Tunja"), ("AUTO_ANNO", 2025), ("AUTO_MES", 2), ("AUTO_DESCRIPCION", "x")));
        var repository = new ReversionesRepository(new RecordingFactory(db));

        var rows = await repository.DetalladoAutorizacion(55, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        Assert.Equal(T3Sql.Normalize("SELECT * FROM vreve_autorizacion WHERE SISU_ID = :1 ORDER BY 2 DESC, 3 DESC, 1"), T3Sql.Normalize(command.CommandText));
        Assert.Equal(["55"], command.BindsInSqlOrder().Select(T3Data.Text));
        var row = Assert.IsAssignableFrom<IDictionary<string, object>>(Assert.Single(rows));
        Assert.Equal(["APSA_NOMAPS", "AUTO_ANNO", "AUTO_MES", "AUTO_DESCRIPCION"], row.Keys);
    }

    // Legacy reversiones/routes.js:8-13: body {aps, anno, mes, descripcion}, usuario = req.SISU_ID.
    [Fact]
    public async Task CrearAutorizacionForwardsTheBodyAndTheTokenUser()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync("/api/v1/reversiones/crearAutorizacion", new { aps = 7, anno = 2025, mes = 2, descripcion = "Corrección F24" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["Crear(7,2025,2,Corrección F24,55)"], factory.Reversiones.Calls);
    }

    // Legacy reversiones/routes.js:8-13 answers res.send(db.open(INSERT)), which is {rowsAffected: n} (database/database.js:59).
    // Accepted deviation: legacy-characterization-tests S8/S9 (crearAutorizacion response, API-only): the new route answers the bare affected-row count.
    [Fact]
    public async Task CrearAutorizacionAnswersTheAffectedRowCount()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync("/api/v1/reversiones/crearAutorizacion", new { aps = 7, anno = 2025, mes = 2, descripcion = "Corrección F24" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, (await T3Data.Json(response)).GetInt32());
    }

    // Legacy reversiones/routes.js:8-13 and controller.js:6-13 never validate the body: a short or missing description is inserted
    // (AutorizacionReversiones.vue:59-74 sends whatever the textarea holds, even null).
    // Accepted deviation: parity-review-all T23 (Reversiones DataAnnotations, group E of legacy-characterization-tests S9):
    // [Required]/[MinLength(3)] reject it with 400 before inserting.
    [Theory]
    [InlineData("ab", "La descripción debe tener al menos 3 caracteres.")]
    [InlineData(null, "La descripción es obligatoria.")]
    public async Task CrearAutorizacionRejectsAShortOrMissingDescripcion(string? descripcion, string message)
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync("/api/v1/reversiones/crearAutorizacion", new { aps = 7, anno = 2025, mes = 2, descripcion });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(message, await response.Content.ReadAsStringAsync());
        Assert.Empty(factory.Reversiones.Calls);
    }

    // Legacy reversiones/routes.js:16-23: GET detalladoAutorizacion uses req.SISU_ID and answers the raw rows (Oracle column names).
    [Fact]
    public async Task DetalladoAutorizacionAnswersTheRowsOfTheTokenUser()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.GetAsync("/api/v1/reversiones/detalladoAutorizacion");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var row = Assert.Single((await T3Data.Json(response)).EnumerateArray());
        Assert.Equal("Tunja", row.GetProperty("APSA_NOMAPS").GetString());
        Assert.Equal(2025, row.GetProperty("AUTO_ANNO").GetInt32());
        Assert.Equal(["Detallado(55)"], factory.Reversiones.Calls);
    }

    // Legacy reversiones/routes.js:8,16 [authJwt.verificarToken]: no token -> 403 "No existe token de verificacion".
    [Fact]
    public async Task ReversionesRequireAToken()
    {
        using var factory = new T3ApiFactory();
        using var client = factory.CreateClient();

        var crear = await client.PostAsJsonAsync("/api/v1/reversiones/crearAutorizacion", new { aps = 7, anno = 2025, mes = 2, descripcion = "abc" });
        var detallado = await client.GetAsync("/api/v1/reversiones/detalladoAutorizacion");

        Assert.Equal(HttpStatusCode.Forbidden, crear.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, detallado.StatusCode);
        Assert.Equal("No existe token de verificacion", (await T3Data.Json(detallado)).GetProperty("message").GetString());
        Assert.Empty(factory.Reversiones.Calls);
    }
}

public sealed class LegacyT3SuiReversionesContractTests
{
    // Legacy sui/controller.js:300-333: SELECT * FROM sui_revfNN WHERE APSA_ID = :1, binds [aps].
    [Theory]
    [InlineData("F19", "SELECT * FROM sui_revf19 WHERE APSA_ID = :1")]
    [InlineData("F23", "SELECT * FROM sui_revf23 WHERE APSA_ID = :1")]
    [InlineData("F24", "SELECT * FROM sui_revf24 WHERE APSA_ID = :1")]
    [InlineData("F35", "SELECT * FROM sui_revf35 WHERE APSA_ID = :1")]
    [InlineData("F36", "SELECT * FROM sui_revf36 WHERE APSA_ID = :1")]
    public async Task ReversionesReadTheSuiRevTableByAps(string formato, string legacySql)
    {
        var db = new RecordingDb(_ => T3Data.Table(("REVE_ID", 4), ("APSA_ID", 7)));
        var repository = new SuiReversionesRepository(new RecordingFactory(db));

        var rows = formato switch
        {
            "F19" => await repository.GetReversionesF19(7, CancellationToken.None),
            "F23" => await repository.GetReversionesF23(7, CancellationToken.None),
            "F24" => await repository.GetReversionesF24(7, CancellationToken.None),
            "F35" => await repository.GetReversionesF35(7, CancellationToken.None),
            _ => await repository.GetReversionesF36(7, CancellationToken.None)
        };

        var command = Assert.Single(db.Commands);
        Assert.Equal(T3Sql.Normalize(legacySql), T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.Equal(["REVE_ID", "APSA_ID"], Assert.IsAssignableFrom<IDictionary<string, object>>(Assert.Single(rows)).Keys);
    }

    // Legacy sui/routes.js:110-138: POST reversionesFNN {aps} answers res.send(rows) (raw array, Oracle columns).
    // Legacy had no token check; the token is now required (parity-review S10).
    [Theory]
    [InlineData("reversionesF19", "F19(7)")]
    [InlineData("reversionesF23", "F23(7)")]
    [InlineData("reversionesF24", "F24(7)")]
    [InlineData("reversionesF35", "F35(7)")]
    [InlineData("reversionesF36", "F36(7)")]
    public async Task ReversionesAnswerTheRawRowsAndRequireAToken(string route, string expectedCall)
    {
        using var factory = new T3ApiFactory();
        using var anonymous = factory.CreateClient();
        using var client = T3Data.Client(factory, sisuId: 55);

        var rejected = await anonymous.PostAsJsonAsync($"/api/v1/sui/{route}", new { aps = 7 });
        var response = await client.PostAsJsonAsync($"/api/v1/sui/{route}", new { aps = 7 });

        Assert.Equal(HttpStatusCode.Forbidden, rejected.StatusCode);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var row = Assert.Single((await T3Data.Json(response)).EnumerateArray());
        Assert.Equal(4, row.GetProperty("REVE_ID").GetInt32());
        Assert.Equal([expectedCall], factory.SuiReversiones.Calls);
    }

    // Legacy sui/routes.js:110-114 + controller.js:300-305 never validate aps: an empty body runs the query with a null bind
    // (APSA_ID = NULL -> no rows) and answers 200 [].
    // Accepted deviation: legacy-characterization-tests S8/S9 (400 without aps on SUI reversiones): the new route rejects it before querying.
    [Fact]
    public async Task ReversionesWithoutApsAnswer400()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsync("/api/v1/sui/reversionesF19", T3Data.Body("{}"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("El campo aps es requerido y debe ser mayor a cero", (await T3Data.Json(response)).GetProperty("message").GetString());
        Assert.Empty(factory.SuiReversiones.Calls);
    }
}

public sealed class LegacyT3SuiContractTests
{
    // Legacy sui/controller.js:166-170 (InformacionDashBoard): SELECT * FROM TABLE(PK_SUI.fsui_estado(:1, :2)) p INNER JOIN
    // auco_apsusuarios u ON p.apsid = u.apsa_id WHERE u.SISU_ID = :3 and u.apsi_estado = 1, binds [anno, mes, usuario].
    [Fact]
    public async Task DashboardReadsFsuiEstadoForTheUserApsInLegacyBindOrder()
    {
        var db = new RecordingDb(_ => T3Data.Table(("APSID", 7), ("APSNOM", "Tunja"), ("F19", "PROCESADO"), ("F23", "PENDIENTE"), ("F24", "NO APLICA"), ("F35", "PROCESADO"), ("F36", "PROCESADO"), ("USUARIO", "a@v.com")));
        var repository = new SuiRepository(new RecordingFactory(db), NullLogger<SuiRepository>.Instance);

        var dashboard = await repository.DashboardAsync(2025, 2, 55, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("SELECT * FROM TABLE(PK_SUI.fsui_estado(:1, :2)) p INNER JOIN auco_apsusuarios u ON p.apsid = u.apsa_id WHERE u.SISU_ID = :3 and u.apsi_estado = 1"),
            T3Sql.Normalize(command.CommandText));
        Assert.Equal(["2025", "2", "55"], command.BindsInSqlOrder().Select(T3Data.Text));
        var row = Assert.IsAssignableFrom<IDictionary<string, object>>(Assert.Single(dashboard.Filas));
        Assert.Equal(["APSID", "APSNOM", "F19", "F23", "F24", "F35", "F36", "USUARIO"], row.Keys);
    }

    // Legacy sui/routes.js:63-70 (getDashBoardSui) body {anno, mes}, usuario = req.SISU_ID. Route renamed to /dashboard
    // (parity-review T18/T19/T20 "803/804 renamed"); rows inside the approved envelope.
    [Fact]
    public async Task DashboardForwardsAnnoMesAndTheTokenUser()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync("/api/v1/sui/dashboard", new { anno = 2025, mes = 2 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await T3Data.Json(response);
        Assert.Equal("success", json.GetProperty("status").GetString());
        var row = Assert.Single(json.GetProperty("data").GetProperty("filas").EnumerateArray());
        Assert.Equal("PENDIENTE", row.GetProperty("F23").GetString());
        Assert.Equal(["Dashboard(2025,2,55)"], factory.Sui.Calls);
    }

    // Legacy sui/controller.js:5-46 (consultafNN): exact column lists from TARIFICADOR.SUI_FNN WHERE apsa_id = :1 and
    // fNN_anno = :2 and fNN_mes = :3, binds [aps, anno, mes].
    [Theory]
    [InlineData("F19", "SELECT APSA_ID, F19_ANNO, F19_MES, F19_NJ, F19_NDJ, F19_CRTJ, F19_CDFJ, F19_QRTJ, F19_QRJ, F19_QBLJ, F19_QLUJ, F19_QNAZ, F19_QAJ, F19_FECHA, USUARIO FROM TARIFICADOR.SUI_F19 where apsa_id = :1 and f19_anno = :2 and f19_mes = :3")]
    [InlineData("F23", "SELECT APSA_ID, EMPR_EMPR, F23_ANNO, F23_MES, F23_ID, F23_NUAP, F23_N, F23_CP, F23_CCC, F23_M2CCJ, F23_CLAVJ, F23_M3AGUAJ, F23_M2LAVJ, F23_CLPJ, F23_KLPJ, F23_CCEI, F23_TIJ, F23_CCEMJ, F23_TMJ, F23_CLUS, F23_CBLJ, F23_LBLJ, F23_CBLS, F23_FACBLCLUS, F23_ABC, F23_FECHA, USUARIO FROM TARIFICADOR.SUI_F23 WHERE apsa_id = :1 and f23_anno = :2 and f23_mes = :3")]
    [InlineData("F24", "SELECT APSA_ID, F24_ANNO, F24_MES, F24_NUAP, F24_NUSD, F24_CENTROIDE, F24_QRT, F24_F1, F24_F2, F24_CPE, F24_PRTZ, F24_DET, F24_F1ET, F24_CPEET, F24_PRTZET, F24_CEG, F24_CRTP, F24_SALINIDAD, F24_VACRTABC, F24_VACRT, F24_FCK, F24_T, F24_CRTZ, F24_CRT, F24_FACRT, F24_FACCS, F24_FECHA, USUARIO FROM TARIFICADOR.SUI_F24 WHERE apsa_id = :1 and f24_anno = :2 and f24_mes = :3")]
    [InlineData("F35", "SELECT APSA_ID, F35_ANNO, F35_MES, F35_NUSD, F35_NOMDF, F35_CAMRERS, F35_QRSMES, F35_QRSPROM, F35_CDFVU, F35_PERADDT, F35_CDFPC, F35_INCENTIVO, F35_DISPALT9, F35_INCCDFALT9, F35_VACDFABC, F35_VACDF, F35_PRCTCRRCP, F35_CDF, F35_CDFP, F35_FACCDF, F35_V0, F35_VM, F35_MCRS, F35_ICRSM, F35_ICCRS, F35_FREIN, F35_CAPREMDF, F35_FECHA, USUARIO FROM TARIFICADOR.SUI_F35 WHERE apsa_id = :1 and f35_anno = :2 and f35_mes = :3")]
    [InlineData("F36", "SELECT APSA_ID, F36_ANNO, F36_MES, F36_NUSD, F36_NOMDPTO, F36_NOMMPIO, F36_NOMDF, F36_VLMES, F36_VLMPROM, F36_ESCENA, F36_CTLMVU, F36_ANNOPOSCLA, F36_CTLMPC, F36_CTLM, F36_CTLMX, F36_VACTLABC, F36_VACTL, F36_FCKCTL, F36_QRS, F36_CTL, F36_FACCTL, F36_FECHA, USUARIO FROM TARIFICADOR.SUI_F36 WHERE apsa_id = :1 and f36_anno = :2 and f36_mes = :3")]
    public async Task ConsultaFormatoSelectsTheLegacyColumnsInLegacyBindOrder(string formato, string legacySql)
    {
        var db = new RecordingDb(_ => T3Data.Table(("APSA_ID", 7)));
        var repository = new SuiRepository(new RecordingFactory(db), NullLogger<SuiRepository>.Instance);

        var rows = await repository.ConsultarFormatoAsync(formato, aps: 7, mes: 2, anno: 2025, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        Assert.Equal(T3Sql.Normalize(legacySql), T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7", "2025", "2"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.Single(rows);
    }

    // Legacy sui/routes.js:7-39: POST consuformu19/consuformu23/consuforma24/consuforma35/consuforma36 with {aps, anno, mes}.
    [Theory]
    [InlineData("consuformu19", "Consulta(F19,7,2025,2)")]
    [InlineData("consuformu23", "Consulta(F23,7,2025,2)")]
    [InlineData("consuforma24", "Consulta(F24,7,2025,2)")]
    [InlineData("consuforma35", "Consulta(F35,7,2025,2)")]
    [InlineData("consuforma36", "Consulta(F36,7,2025,2)")]
    public async Task ConsultaFormatoRoutesForwardApsAnnoMes(string route, string expectedCall)
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync($"/api/v1/sui/{route}", new { aps = 7, anno = 2025, mes = 2 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await T3Data.Json(response);
        Assert.Equal("success", json.GetProperty("status").GetString());
        Assert.Equal(7, Assert.Single(json.GetProperty("data").GetProperty("filas").EnumerateArray()).GetProperty("APSA_ID").GetInt32());
        Assert.Equal([expectedCall], factory.Sui.Calls);
    }

    // Legacy sui/controller.js:187-275 (resumenApsfNN): SELECT * FROM TARIFICADOR.SUI_FNN WHERE apsa_id = :1.
    [Theory]
    [InlineData("F19")]
    [InlineData("F23")]
    [InlineData("F24")]
    [InlineData("F35")]
    [InlineData("F36")]
    public async Task ResumenFormatoReadsTheWholeSuiTableOfTheAps(string formato)
    {
        var db = new RecordingDb(_ => T3Data.Table(("APSA_ID", 7), ($"{formato}_ANNO", 2025)));
        var repository = new SuiRepository(new RecordingFactory(db), NullLogger<SuiRepository>.Instance);

        var rows = await repository.ResumenFormatosAsync(formato, 7, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        Assert.Equal(T3Sql.Normalize($"SELECT * FROM TARIFICADOR.SUI_{formato} WHERE apsa_id = :1"), T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.Equal(["APSA_ID", $"{formato}_ANNO"], Assert.IsAssignableFrom<IDictionary<string, object>>(Assert.Single(rows)).Keys);
    }

    // Legacy sui/routes.js:73-101 (getApsResumenNN) body {aps}; routes renamed to resumenFNN (parity-review T18/T19/T20).
    [Theory]
    [InlineData("resumenF19", "Resumen(F19,7)")]
    [InlineData("resumenF23", "Resumen(F23,7)")]
    [InlineData("resumenF24", "Resumen(F24,7)")]
    [InlineData("resumenF35", "Resumen(F35,7)")]
    [InlineData("resumenF36", "Resumen(F36,7)")]
    public async Task ResumenFormatoRoutesForwardTheAps(string route, string expectedCall)
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync($"/api/v1/sui/{route}", new { aps = 7 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await T3Data.Json(response);
        Assert.Equal("success", json.GetProperty("status").GetString());
        Assert.Equal(7, Assert.Single(json.GetProperty("data").GetProperty("filas").EnumerateArray()).GetProperty("APSA_ID").GetInt32());
        Assert.Equal([expectedCall], factory.Sui.Calls);
    }

    // Legacy sui/routes.js:73-77 + controller.js:187-203 never validate aps: an empty body answers 200 [] (no rows for NULL).
    // Accepted deviation: legacy-characterization-tests S8/S9 (400 without aps on SUI resumen): SuiResumenRequest [Range] rejects it
    // with 400 before querying.
    [Fact]
    public async Task ResumenWithoutApsAnswers400()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsync("/api/v1/sui/resumenF19", T3Data.Body("{}"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("El APS es obligatorio.", await response.Content.ReadAsStringAsync());
        Assert.Empty(factory.Sui.Calls);
    }

    // Legacy validaciones/controller.js:7-24 (certificarfauco_existarifa, called by Suisui.vue:182-200 before Procesar):
    // BEGIN :res := PK_VALGRAL.fauco_generasui(:1,:2,:3); END; binds [aps, anno, mes], OUT STRING; only Number(res) === 1 lets
    // Procesar run (Suisui.vue:187-201).
    [Theory]
    [InlineData("1", true)]
    [InlineData("0", false)]
    [InlineData("", false)]
    public async Task GetcanCertificateRunsFaucoGenerasuiWithApsAnnoMesAndOnlyOneLetsProcess(string outValue, bool puedeProcesar)
    {
        var db = new RecordingDb(c =>
        {
            c.Parameter("res").Value = outValue;
            return 1;
        });
        var repository = new SuiRepository(new RecordingFactory(db), NullLogger<SuiRepository>.Instance);

        var result = await repository.GetCanCertificateAsync(aps: 7, mes: 2, anno: 2025, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        Assert.Equal(T3Sql.Normalize("BEGIN :res := PK_VALGRAL.fauco_generasui(:1,:2,:3); END;"), T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7", "2025", "2"], command.BindsInSqlOrder().Skip(1).Select(T3Data.Text));
        Assert.Equal(ParameterDirection.Output, command.Parameter("res").Direction);
        Assert.Equal(puedeProcesar, result.PuedeProcesar);
    }

    // Legacy sui/controller.js:110-118 (getcanCertificate): "select count(1) AS CANTIDAD from sui_f24 where apsa_id = :1 and
    // f24_anno = :2 and f24_mes = :3"; the new API serves this count as existenArchivosGenerados.
    [Fact]
    public async Task ExistenArchivosGeneradosCountsSuiF24RowsOfThePeriod()
    {
        var db = new RecordingDb(_ => T3Data.Table(("CANTIDAD", 3)));
        var repository = new SuiRepository(new RecordingFactory(db), NullLogger<SuiRepository>.Instance);

        var result = await repository.ExistenArchivosGeneradosAsync(aps: 7, anno: 2025, mes: 2, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("select count(1) AS CANTIDAD from sui_f24 where apsa_id = :1 and f24_anno = :2 and f24_mes = :3"),
            T3Sql.Normalize(command.CommandText));
        Assert.Equal(["7", "2025", "2"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.True(result.Existen);
        Assert.Equal(3, result.Cantidad);
    }

    // Legacy sui/routes.js:49-53: POST getcanCertificate {aps, anno, mes} answers the count rows [{CANTIDAD: n}]
    // (controller.js:110-118). The new route of the same name runs the fauco_generasui precheck instead.
    // Accepted deviation: legacy-characterization-tests S8/S9 (getcanCertificate shape): getcanCertificate answers the precheck {puedeProcesar, mensajes} and the F24 count
    // moved to existenArchivosGenerados.
    [Fact]
    public async Task GetcanCertificateRunsThePrecheckAndTheCountMovedToExistenArchivos()
    {
        using var factory = new T3ApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var precheck = await client.PostAsJsonAsync("/api/v1/sui/getcanCertificate", new { aps = 7, anno = 2025, mes = 2 });
        var count = await client.PostAsJsonAsync("/api/v1/sui/existenArchivosGenerados", new { aps = 7, anno = 2025, mes = 2 });

        Assert.Equal(HttpStatusCode.OK, precheck.StatusCode);
        Assert.Equal(HttpStatusCode.OK, count.StatusCode);
        Assert.True((await T3Data.Json(precheck)).GetProperty("data").GetProperty("puedeProcesar").GetBoolean());
        Assert.Equal(3, (await T3Data.Json(count)).GetProperty("data").GetProperty("cantidad").GetInt32());
        Assert.Equal(["Precheck(7,2025,2)", "Existen(7,2025,2)"], factory.Sui.Calls);
    }

    // Legacy sui/routes.js:7-101 all use [authJwt.verificarToken]: no token -> 403 "No existe token de verificacion".
    [Theory]
    [InlineData("dashboard")]
    [InlineData("consuformu19")]
    [InlineData("resumenF19")]
    [InlineData("getcanCertificate")]
    [InlineData("existenArchivosGenerados")]
    public async Task SuiReadRoutesRequireAToken(string route)
    {
        using var factory = new T3ApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync($"/api/v1/sui/{route}", new { aps = 7, anno = 2025, mes = 2 });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", (await T3Data.Json(response)).GetProperty("message").GetString());
        Assert.Empty(factory.Sui.Calls);
    }
}

// ---------------------------------------------------------------------------------------------
// File-local test infrastructure
// ---------------------------------------------------------------------------------------------

file static class T3Sql
{
    // Compares statements the way Oracle executes them: whitespace and case are irrelevant, bind names (:1 vs :aps) are
    // positional placeholders, and the legacy TARIFICADOR. schema prefix is the connected schema.
    internal static string Normalize(string sql)
    {
        var withoutSchema = Regex.Replace(sql, "TARIFICADOR\\.", string.Empty, RegexOptions.IgnoreCase);
        var placeholders = Regex.Replace(withoutSchema, ":\\w+", ":?");
        return Regex.Replace(placeholders, "\\s+", string.Empty).ToUpperInvariant();
    }
}

file static class T3Data
{
    internal static DataTable Table(params (string Column, object Value)[] cells)
    {
        var table = new DataTable();
        foreach (var (column, value) in cells) table.Columns.Add(column, value.GetType());
        table.Rows.Add(cells.Select(c => c.Value).ToArray());
        return table;
    }

    internal static string Text(object? value) => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty;

    internal static HttpClient Client(WebApplicationFactory<Program> factory, long sisuId)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(sisuId));
        return client;
    }

    internal static StringContent Body(string json) => new(json, Encoding.UTF8, "application/json");

    internal static async Task<JsonElement> Json(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

    internal static IDictionary<string, object> Row(params (string Key, object Value)[] cells)
        => cells.ToDictionary(c => c.Key, c => c.Value);
}

file sealed class T3ApiFactory : WebApplicationFactory<Program>
{
    internal StubPgirsRepository Pgirs { get; } = new();
    internal StubReversionesRepository Reversiones { get; } = new();
    internal StubSuiRepository Sui { get; } = new();
    internal StubSuiReversionesRepository SuiReversiones { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IPgirsRepository>();
            services.AddSingleton<IPgirsRepository>(Pgirs);
            services.RemoveAll<IReversionesRepository>();
            services.AddSingleton<IReversionesRepository>(Reversiones);
            services.RemoveAll<ISuiRepository>();
            services.AddSingleton<ISuiRepository>(Sui);
            services.RemoveAll<ISuiReversionesRepository>();
            services.AddSingleton<ISuiReversionesRepository>(SuiReversiones);
        });
    }
}

file sealed class StubPgirsRepository : IPgirsRepository
{
    internal List<string> Calls { get; } = [];

    private static IEnumerable<dynamic> Rows() => [T3Data.Row(("APSA_NOMAPS", "Tunja"), ("PODA", 1.5m))];

    public Task<IEnumerable<dynamic>> GetResumenAsync(long apsId)
    {
        Calls.Add($"Resumen({apsId})");
        return Task.FromResult(Rows());
    }

    public Task<IEnumerable<dynamic>> GetInformeVariablesAsync(long apsId)
    {
        Calls.Add($"InformeVariables({apsId})");
        return Task.FromResult(Rows());
    }

    public Task<IEnumerable<dynamic>> GetBarridoAsync(long apsId)
    {
        Calls.Add($"Barrido({apsId})");
        return Task.FromResult(Rows());
    }

    public Task<IEnumerable<dynamic>> GetVariablesAsync(long apsId, int anno, int mes)
    {
        Calls.Add($"Variables({apsId},{anno},{mes})");
        return Task.FromResult(Rows());
    }

    public Task<bool> EditarVariablesAsync(List<EditarVariableDto> variables, long usuarioId)
    {
        foreach (var v in variables)
            Calls.Add($"Editar({v.ApsId},{v.Anno},{v.Mes},{v.CodVariable},{T3Data.Text(v.Valor)},{v.Frecuencia},usuario={usuarioId})");
        return Task.FromResult(true);
    }

    public Task<bool> NuevoVariablesAsync(NuevoVariablesRequestDto data, long usuarioId)
    {
        Calls.Add($"Nuevo({data.ApsId},{data.Anno},{data.Mes},lbl={T3Data.Text(data.Lbl)}/{data.LblFrecuencia},usuario={usuarioId})");
        return Task.FromResult(true);
    }
}

file sealed class StubReversionesRepository : IReversionesRepository
{
    internal List<string> Calls { get; } = [];

    public Task<int> CrearAutorizacion(int aps, int anno, int mes, string descripcion, int sisuId, CancellationToken cancellationToken)
    {
        Calls.Add($"Crear({aps},{anno},{mes},{descripcion},{sisuId})");
        return Task.FromResult(1);
    }

    public Task<IReadOnlyList<object>> DetalladoAutorizacion(int sisuId, CancellationToken cancellationToken)
    {
        Calls.Add($"Detallado({sisuId})");
        return Task.FromResult<IReadOnlyList<object>>([T3Data.Row(("APSA_NOMAPS", "Tunja"), ("AUTO_ANNO", 2025))]);
    }
}

file sealed class StubSuiReversionesRepository : ISuiReversionesRepository
{
    internal List<string> Calls { get; } = [];
    internal IReadOnlyList<object> Rows { get; set; } = [T3Data.Row(("REVE_ID", 4), ("APSA_ID", 7))];

    private Task<IReadOnlyList<object>> Answer(string formato, int aps)
    {
        Calls.Add($"{formato}({aps})");
        return Task.FromResult(Rows);
    }

    public Task<IReadOnlyList<object>> GetReversionesF19(int aps, CancellationToken cancellationToken) => Answer("F19", aps);
    public Task<IReadOnlyList<object>> GetReversionesF23(int aps, CancellationToken cancellationToken) => Answer("F23", aps);
    public Task<IReadOnlyList<object>> GetReversionesF24(int aps, CancellationToken cancellationToken) => Answer("F24", aps);
    public Task<IReadOnlyList<object>> GetReversionesF35(int aps, CancellationToken cancellationToken) => Answer("F35", aps);
    public Task<IReadOnlyList<object>> GetReversionesF36(int aps, CancellationToken cancellationToken) => Answer("F36", aps);
}

file sealed class StubSuiRepository : ISuiRepository
{
    internal List<string> Calls { get; } = [];
    internal IReadOnlyList<object> Rows { get; set; } = [T3Data.Row(("APSA_ID", 7))];

    public Task<SuiDashboardResponse> DashboardAsync(int anno, int mes, long usuario, CancellationToken cancellationToken)
    {
        Calls.Add($"Dashboard({anno},{mes},{usuario})");
        return Task.FromResult(new SuiDashboardResponse([T3Data.Row(("APSID", 7), ("F23", "PENDIENTE"))]));
    }

    public Task<IReadOnlyList<dynamic>> ConsultarFormatoAsync(string formato, int aps, int mes, int anno, CancellationToken cancellationToken)
    {
        Calls.Add($"Consulta({formato},{aps},{anno},{mes})");
        return Task.FromResult<IReadOnlyList<dynamic>>([new Dictionary<string, object?> { ["APSA_ID"] = 7 }]);
    }

    public Task<IReadOnlyList<object>> ResumenFormatosAsync(string formato, int aps, CancellationToken cancellationToken)
    {
        Calls.Add($"Resumen({formato},{aps})");
        return Task.FromResult(Rows);
    }

    public Task<SuiProcesarResponse> ProcesarAsync(SuiProcesarRequest request, long usuario, CancellationToken cancellationToken)
        => throw new NotSupportedException("Procesar is covered by RegulatorSuiInformesContractTests.");

    public Task<SuiComplementoResponse> GuardarComplementoAsync(SuiComplementoRequest request, long usuario, CancellationToken cancellationToken)
        => throw new NotSupportedException("Complemento is covered by RegulatorSuiInformesContractTests.");

    public Task<SuiPrecheckResponse> GetCanCertificateAsync(int aps, int mes, int anno, CancellationToken cancellationToken)
    {
        Calls.Add($"Precheck({aps},{anno},{mes})");
        return Task.FromResult(new SuiPrecheckResponse(true, ["1"]));
    }

    public Task<SuiExistenArchivosResponse> ExistenArchivosGeneradosAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        Calls.Add($"Existen({aps},{anno},{mes})");
        return Task.FromResult(new SuiExistenArchivosResponse(true, 3));
    }
}

file sealed class RecordingFactory(RecordingDb connection) : IOracleConnectionFactory
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

    /// <summary>Bound values in the order their placeholders appear in the SQL (Oracle positional order).</summary>
    public IEnumerable<object?> BindsInSqlOrder()
        => Regex.Matches(CommandText, ":(\\w+)").Select(m => Parameter(m.Groups[1].Value).Value);
}

/// <summary>
/// In-memory ADO.NET connection that records every command Dapper executes and answers it through
/// <c>respond</c> (a <see cref="DataTable"/> for readers, an int for non-queries; output parameters are set in place).
/// </summary>
file sealed class RecordingDb(Func<RecordedCommand, object?> respond) : DbConnection
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

    private sealed class RecordingTransaction(RecordingDb owner) : DbTransaction
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

file sealed class RecordingCommand(RecordingDb owner) : DbCommand
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
        return result is DataTable table ? table.Rows[0][0] : result;
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
