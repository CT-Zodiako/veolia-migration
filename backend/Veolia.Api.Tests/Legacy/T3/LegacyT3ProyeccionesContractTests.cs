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
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Proyecciones;

namespace Veolia.Api.Tests.Legacy.T3;

// Legacy-derived characterization of Regulator Proyecciones (901-905) endpoints not already pinned by
// ProyeccionesContractSmokeTests / RegulatorProyeccionesPgirsContractTests.
// Legacy source of truth: /Users/zodiako/DEV/oracle/back-tarificador/src/modules/proyecciones/{routes,controller}.js and
// front-tarificador/src/service/ProyService.js. Approved deviations (odd/tasks/parity-review-all.md): token on every
// /api/v1 route (S10), response envelopes (T9/T10), user taken from the token (S11 "T1+S2"), P1 descripción, P2
// crecimiento Drive keys, P3 905 month, P4 locked timeline rows, P6 Desde/APS fixed on edit.

public sealed class LegacyT3ProyeccionesContractTests
{
    // ---------------- Repository: SQL and bind order ----------------

    // Legacy proyecciones/controller.js:49-53 (consulta): "SELECT * FROM proy_proyeccion WHERE APS = :1 ORDER BY PROYNOMBRE";
    // seleccionarProyeccion.vue:139-145 reads PROYID, PROYNOMBRE, PROYDESCRIPCION, PROYANNODES/MESDES, PROYANNOHAS/MESHAS, APS.
    [Fact]
    public async Task ConsultaReadsTheApsProjectionsOrderedByNombre()
    {
        var db = new RecordingDb(_ => new DataTable());
        var repository = new ProyeccionRepository(new RecordingFactory(db));

        await repository.ConsultaAsync(3, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        var sql = T3Sql.Collapse(command.CommandText);
        Assert.Matches(@"FROM PROY_PROYECCION( \w+)? WHERE (\w+\.)?APS = :\w+ ORDER BY (\w+\.)?PROYNOMBRE$", sql);
        foreach (var column in new[] { "PROYID", "APS", "PROYNOMBRE", "PROYDESCRIPCION", "PROYANNODES", "PROYMESDES", "PROYANNOHAS", "PROYMESHAS" })
            Assert.Matches($@"\b{column}\b", sql.Split(" FROM ")[0]);
        Assert.Equal(["3"], command.BindsInSqlOrder().Select(T3Data.Text));
    }

    // Legacy proyecciones/controller.js:86-102 (consultageneral): PROY_PROYECCION JOIN AUCO_APSASEO ON APSA_ID = APS JOIN
    // AUGE_PARAMETROS ON (PARA_PARA = PROYTIPO100 AND CLAS_CLAS = 100) JOIN AUGE_SISUSUARIO ON SISU_ID = USUARIO
    // WHERE aps IN (SELECT apsa_id FROM auco_apsusuarios WHERE sisu_id = :1) ORDER BY 1 (SISU_CORREO), binds [token user].
    [Fact]
    public async Task ConsultaGeneralJoinsApsTipoUsuarioForTheUserApsOrderedByCorreo()
    {
        var db = new RecordingDb(_ => new DataTable());
        var repository = new ProyeccionRepository(new RecordingFactory(db));

        await repository.ConsultaGeneralAsync(55, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        var sql = T3Sql.Collapse(command.CommandText);
        Assert.Matches(@"FROM PROY_PROYECCION (\w+) JOIN AUCO_APSASEO (\w+) ON \2\.APSA_ID = \1\.APS", sql);
        Assert.Matches(@"JOIN AUGE_PARAMETROS (\w+) ON \(\1\.PARA_PARA = \w+\.PROYTIPO100 AND \1\.CLAS_CLAS = 100\)", sql);
        Assert.Matches(@"JOIN AUGE_SISUSUARIO (\w+) ON \1\.SISU_ID = \w+\.USUARIO", sql);
        Assert.Matches(@"WHERE \w+\.APS IN \(SELECT AU\.APSA_ID FROM AUCO_APSUSUARIOS AU WHERE AU\.SISU_ID = :\w+\)", sql);
        Assert.Matches(@"ORDER BY \w+\.SISU_CORREO$", sql);
        Assert.Matches(@"\bSISU_CORREO\b.*\bPARA_NOMBRE\b|\bPARA_NOMBRE\b.*\bSISU_CORREO\b", sql.Split(" FROM ")[0]);
        Assert.Contains("APSA_NOMAPS", sql.Split(" FROM ")[0]);
        Assert.Equal(["55"], command.BindsInSqlOrder().Select(T3Data.Text));
    }

    // Legacy proyecciones/controller.js:183-187 (consultaruna): "SELECT * FROM proy_proyeccion WHERE PROYID = :1" returns every
    // column, PROYDESCRIPCION included.
    [Fact]
    public async Task ConsultaProyReturnsTheDescripcionLikeLegacy()
    {
        var db = new RecordingDb(_ => new DataTable());
        var repository = new ProyeccionRepository(new RecordingFactory(db));

        await repository.ConsultaProyAsync(8, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        Assert.Matches(@"\bPROYDESCRIPCION\b", T3Sql.Collapse(command.CommandText).Split(" FROM ")[0]);
        Assert.Equal(["8"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.NotNull(typeof(ProyeccionDetail).GetProperty("ProyDescripcion"));
    }

    // Legacy proyecciones/controller.js:145-150 (modificar): "UPDATE proy_proyeccion SET PROYNOMBRE = :1, PROYDESCRIPCION = :2,
    // PROYTIPO100 =:3, PROYANNOHAS =:4, PROYMESHAS = :5 WHERE PROYID =:6" -- no PROYESTADO condition.
    [Fact]
    public async Task EditarUpdatesByProyIdOnlyLikeLegacy()
    {
        var db = new RecordingDb(_ => 1);
        var repository = new ProyeccionRepository(new RecordingFactory(db));

        await repository.EditarAsync(8, new ProyeccionUpdateRequest
        {
            ProyNombre = "Proy", ProyDescripcion = "Nueva", ProyTipo100 = 2, ProyAnnoHas = 2026, ProyMesHas = 3
        }, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("UPDATE proy_proyeccion SET PROYNOMBRE = :1, PROYDESCRIPCION = :2, PROYTIPO100 =:3, PROYANNOHAS =:4, PROYMESHAS = :5 WHERE PROYID =:6"),
            T3Sql.Normalize(command.CommandText));
    }

    // Legacy proyecciones/controller.js:67-72 (consultabyid): "SELECT * FROM PROY_DETLINEATIEMPO WHERE PROYID = :1 ORDER BY PROYANNO, PROYMES".
    [Fact]
    public async Task LineaTiempoReadsTheTimelineOrderedByAnnoMes()
    {
        var db = new RecordingDb(_ => new DataTable());
        var repository = new LineaTiempoRepository(new RecordingFactory(db));

        await repository.GetByProyeccionAsync(8, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        var sql = T3Sql.Collapse(command.CommandText);
        Assert.Matches(@"FROM PROY_DETLINEATIEMPO WHERE PROYID = :\w+ ORDER BY PROYANNO, PROYMES$", sql);
        foreach (var column in new[] { "PROYANNO", "PROYMES", "DELTIPC", "DELTIPCC", "DELTSMLV", "DELTIOEXP", "DELTFACPRODUC", "DELTINDIPCC", "DELTIPCCS", "DELTESTADO" })
            Assert.Matches($@"\b{column}\b", sql.Split(" FROM ")[0]);
        Assert.Equal(["8"], command.BindsInSqlOrder().Select(T3Data.Text));
    }

    // Legacy proyecciones/controller.js:227-236 (postlineastiempo, isnew): INSERT INTO PROY_DETLINEATIEMPO (PROYID, APS, PROYANNO,
    // PROYMES, DELTIPC, DELTIPCC, DELTSMLV, DELTIOEXP, DELTFACPRODUC, DELTFECHA, USUARIO, DELTINDIPCC, DELTIPCCS) VALUES(:1..:9,
    // sysdate, :10, :11, :12), binds [PROYID, APS, PROYANNO, PROYMES, DELTIPC, DELTIPCC, DELTSMLV, DELTIOEXP, DELTFACPRODUC,
    // usuario (token), DELTINDIPCC, DELTIPCCS]. The new INSERT also writes DELTESTADO = 0 (column NOT NULL, LineaTiempoRepository.cs).
    [Fact]
    public async Task LineaTiempoInsertBindsTheLegacyColumnsInLegacyOrder()
    {
        var db = new RecordingDb(_ => 1);
        var repository = new LineaTiempoRepository(new RecordingFactory(db));

        var result = await repository.UpsertAsync(new LineaTiempoUpsertRequest
        {
            ProyId = 8, ApsaId = 3, IsNew = true,
            Rows = [new LineaTiempoRow { Anno = 2025, Mes = 4, Deltipc = 1.1m, Deltipcc = 2.2m, Deltsmlv = 3.3m, Deltioexp = 4.4m, Deltfacproduc = 5.5m, Deltindipcc = 6.6m, Deltipccs = 7.7m }]
        }, usuarioId: 55, CancellationToken.None);

        Assert.True(result.Success);
        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("INSERT INTO PROY_DETLINEATIEMPO (PROYID, APS, PROYANNO, PROYMES, DELTIPC, DELTIPCC, DELTSMLV, DELTIOEXP, DELTFACPRODUC, DELTESTADO, DELTFECHA, USUARIO, DELTINDIPCC, DELTIPCCS) VALUES(:1, :2, :3, :4, :5, :6, :7, :8, :9, 0, sysdate ,:10 ,:11, :12)"),
            T3Sql.Normalize(command.CommandText));
        Assert.Equal(["8", "3", "2025", "4", "1.1", "2.2", "3.3", "4.4", "5.5", "55", "6.6", "7.7"], command.BindsInSqlOrder().Select(T3Data.Text));
        Assert.True(db.Committed);
    }

    // Legacy proyecciones/controller.js:239-246 (postlineastiempo, update): UPDATE PROY_DETLINEATIEMPO SET DELTIPC= :1, DELTIPCC= :2,
    // DELTSMLV= :3, DELTIOEXP=:4, DELTFACPRODUC=:5, DELTFECHA=sysdate , USUARIO= :6, DELTINDIPCC= :7, DELTIPCCS=:8
    // WHERE PROYID= :9 AND APS= :10 AND PROYANNO= :11 AND PROYMES= :12.
    [Fact]
    public async Task LineaTiempoUpdateUsesTheLegacyStatementAndBindOrder()
    {
        var db = new RecordingDb(c => c.CommandText.Contains("SELECT") ? new DataTable() : 1);
        var repository = new LineaTiempoRepository(new RecordingFactory(db));

        await repository.UpsertAsync(new LineaTiempoUpsertRequest
        {
            ProyId = 8, ApsaId = 3, IsNew = false,
            Rows = [new LineaTiempoRow { Anno = 2025, Mes = 4, Deltipc = 1.1m, Deltipcc = 2.2m, Deltsmlv = 3.3m, Deltioexp = 4.4m, Deltfacproduc = 5.5m, Deltindipcc = 6.6m, Deltipccs = 7.7m }]
        }, usuarioId: 55, CancellationToken.None);

        var update = Assert.Single(db.Commands, c => c.CommandText.Contains("UPDATE"));
        Assert.Equal(
            T3Sql.Normalize("UPDATE PROY_DETLINEATIEMPO SET DELTIPC= :1, DELTIPCC= :2, DELTSMLV= :3, DELTIOEXP=:4, DELTFACPRODUC=:5, DELTFECHA=sysdate , USUARIO= :6, DELTINDIPCC= :7, DELTIPCCS=:8 WHERE PROYID= :9 AND APS= :10 AND PROYANNO= :11 AND PROYMES= :12"),
            T3Sql.Normalize(update.CommandText));
        Assert.Equal(["1.1", "2.2", "3.3", "4.4", "5.5", "55", "6.6", "7.7", "8", "3", "2025", "4"], update.BindsInSqlOrder().Select(T3Data.Text));
    }

    // Legacy proyecciones/controller.js:618-683 (consultarproyeccionusuario/infopropia/infotercero/descuentos): SELECT * of
    // PROY_USUARIOS / PROY_PROPIA / PROY_COMPETIDOR / PROY_DESCUENTOS WHERE PROY_ID = :1 with these ORDER BYs.
    [Fact]
    public async Task CrecimientoConsultaReadsTheFourTablesInLegacyOrder()
    {
        var db = new RecordingDb(_ => new DataTable());
        var repository = new CrecimientoRepository(new RecordingFactory(db));

        await repository.ConsultarAsync(8, CancellationToken.None);

        var tails = db.Commands.Select(c => Regex.Match(T3Sql.Collapse(c.CommandText), " FROM .*$").Value.Trim()).ToList();
        Assert.Equal(
            [
                "FROM PROY_USUARIOS WHERE PROY_ID = :1 ORDER BY ANNO, SEMESTRE, CODTIPOPRED, CODUSO",
                "FROM PROY_PROPIA WHERE PROY_ID = :1 ORDER BY ANNO, MES",
                "FROM PROY_COMPETIDOR WHERE PROY_ID = :1 ORDER BY COD_EMPRESA, ANNO, MES",
                "FROM PROY_DESCUENTOS WHERE PROY_ID = :1 ORDER BY ANNO, MES"
            ],
            tails);
        Assert.All(db.Commands, c => Assert.Equal(["8"], c.BindsInSqlOrder().Select(T3Data.Text)));
    }

    // Legacy SELECT * (controller.js:620,637,654,670) returns COD_APS, shown as the first "APS" column of every Variables grid
    // (components/proyecciones/CrecimientoUsuarios.vue:6, CrecimientoInfPropia.vue, CrecimientoInfTercero.vue,
    // CrecimientoDescuentosCostos.vue: field="COD_APS").
    [Fact]
    public async Task CrecimientoConsultaReturnsCodApsLikeLegacy()
    {
        var db = new RecordingDb(_ => new DataTable());
        var repository = new CrecimientoRepository(new RecordingFactory(db));

        await repository.ConsultarAsync(8, CancellationToken.None);

        Assert.Equal(4, db.Commands.Count);
        Assert.All(db.Commands, c => Assert.Matches(@"\bCOD_APS\b", T3Sql.Collapse(c.CommandText).Split(" FROM ")[0]));
    }

    // Legacy proyecciones/controller.js:730-733 (consultasubcont): "SELECT CLAS_CLASE , SUCO_VALOR FROM PROY_APSSUBSCONT WHERE
    // APSA_ID = :1 AND PROY_ID = :2 AND SUCO_ANNO = :3 AND SUCO_MES = :4", binds [apsa_id, proy_id, anno, mes].
    [Fact]
    public async Task SubcontConsultaReadsProyApssubscontInLegacyBindOrder()
    {
        var db = new RecordingDb(_ => new DataTable());
        var repository = new SubcontProyRepository(new RecordingFactory(db));

        await repository.GetSubcontAsync(new SubcontConsultaRequest { ApsaId = 3, ProyId = 8, Anno = 2025, Mes = 1 }, CancellationToken.None);

        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("SELECT CLAS_CLASE , SUCO_VALOR FROM PROY_APSSUBSCONT WHERE APSA_ID = :1 AND PROY_ID = :2 AND  SUCO_ANNO = :3 AND SUCO_MES  = :4"),
            T3Sql.Normalize(T3Sql.StripAliases(command.CommandText)));
        Assert.Equal(["3", "8", "2025", "1"], command.BindsInSqlOrder().Select(T3Data.Text));
    }

    // Legacy proyecciones/controller.js:762-781 (editarPorcSubCon): DELETE FROM TARIFICADOR.PROY_SUBSCONTEMP WHERE APSA_ID = :1 AND
    // PROY_ID = :2 AND SUCO_ANNO = :3 AND SUCO_MES = :4, then per item INSERT INTO TARIFICADOR.PROY_SUBSCONTEMP (SUCO_ID, PROY_ID,
    // APSA_ID, CLAS_CLASE, SUCO_ANNO, SUCO_MES, SUCO_VALOR, SUCO_ESTADO, SUCO_FECHA, USUA_USUA) VALUES (sproy_subscontemp.NEXTVAL,
    // :1, :2, :3, :4, :5, :6, 1, SYSDATE, :7), binds [proy_id, aps, CLAS_CLASE, anno, mes, SUCO_VALOR, usuario].
    [Fact]
    public async Task SubcontUpsertDeletesThePeriodAndInsertsEachClaseLikeLegacy()
    {
        var db = new RecordingDb(_ => 1);
        var repository = new SubcontProyRepository(new RecordingFactory(db));

        var result = await repository.UpsertSubcontAsync(new SubcontUpsertRequest
        {
            ProyId = 8, ApsaId = 3, Anno = 2025, Mes = 1,
            Items = [new SubcontItem { ClasClase = 1, SucoValor = 0.5m }, new SubcontItem { ClasClase = 7, SucoValor = -0.2m }]
        }, usuarioId: 55, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(3, db.Commands.Count);
        var delete = db.Commands[0];
        Assert.StartsWith(T3Sql.Normalize("DELETE FROM TARIFICADOR.PROY_SUBSCONTEMP WHERE"), T3Sql.Normalize(delete.CommandText));
        Assert.Equal(
            new Dictionary<string, string> { ["APSA_ID"] = "3", ["PROY_ID"] = "8", ["SUCO_ANNO"] = "2025", ["SUCO_MES"] = "1" },
            delete.PredicateBinds());
        var insertSql = T3Sql.Normalize("INSERT INTO TARIFICADOR.PROY_SUBSCONTEMP (SUCO_ID, PROY_ID, APSA_ID, CLAS_CLASE, SUCO_ANNO, SUCO_MES, SUCO_VALOR, SUCO_ESTADO, SUCO_FECHA, USUA_USUA) VALUES (sproy_subscontemp.NEXTVAL, :1, :2, :3, :4, :5, :6, 1, SYSDATE, :7)");
        Assert.Equal(insertSql, T3Sql.Normalize(db.Commands[1].CommandText));
        Assert.Equal(["8", "3", "1", "2025", "1", "0.5", "55"], db.Commands[1].BindsInSqlOrder().Select(T3Data.Text));
        Assert.Equal(["8", "3", "7", "2025", "1", "-0.2", "55"], db.Commands[2].BindsInSqlOrder().Select(T3Data.Text));
        Assert.True(db.Committed);
    }

    // Legacy proyecciones/controller.js:783-786: success answers "Porcentajes de subsidios y contribuciones editados correctamente".
    [Fact]
    public async Task SubcontUpsertAnswersTheLegacySuccessMessage()
    {
        var db = new RecordingDb(_ => 1);
        var repository = new SubcontProyRepository(new RecordingFactory(db));

        var result = await repository.UpsertSubcontAsync(new SubcontUpsertRequest
        {
            ProyId = 8, ApsaId = 3, Anno = 2025, Mes = 1, Items = [new SubcontItem { ClasClase = 1, SucoValor = 0.5m }]
        }, usuarioId: 55, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal("Porcentajes de subsidios y contribuciones editados correctamente", result.Message);
    }

    // Legacy proyecciones/controller.js:693-720 (ejecutarproyectar): BEGIN :res := PK_PROYLIQUIDA.fproy_proyectar(:1, :2, :3);
    // COMMIT; END; binds [proy_id, apsa_id, usuario (token)], OUT NUMBER. The explicit COMMIT is equivalent to ODP.NET
    // autocommit of a command without transaction, so it is ignored in the comparison.
    [Fact]
    public async Task EjecutarCallsFproyProyectarWithProyApsUsuarioAndANumericOut()
    {
        var db = new RecordingDb(c =>
        {
            c.Parameter("res").Value = 1;
            return 1;
        });
        var repository = new EjecucionProyeccionRepository(new RecordingFactory(db));

        var resultado = await repository.EjecutarProyectarAsync(8, 3, 55, CancellationToken.None);

        Assert.Equal(1, resultado);
        var command = Assert.Single(db.Commands);
        Assert.Equal(
            T3Sql.Normalize("BEGIN :res := PK_PROYLIQUIDA.fproy_proyectar(:1, :2, :3); END;"),
            T3Sql.Normalize(command.CommandText.Replace("COMMIT;", string.Empty)));
        Assert.Equal(["8", "3", "55"], command.BindsInSqlOrder().Skip(1).Select(T3Data.Text));
        Assert.Equal(ParameterDirection.Output, command.Parameter("res").Direction);
        Assert.NotEqual(DbType.String, command.Parameter("res").DbType);
    }

    // ---------------- HTTP: routes, token user, envelope ----------------

    // Legacy proyecciones/routes.js:18-22 (consultageneral): usuario = req.SISU_ID, no body.
    [Fact]
    public async Task ConsultaGeneralUsesTheTokenUser()
    {
        using var factory = new T3ProyApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync("/api/v1/proyecciones/consultageneral", new { });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await T3Data.Json(response)).GetProperty("status").GetBoolean());
        Assert.Equal(["ConsultaGeneral(55)"], factory.Calls);
    }

    // Legacy proyecciones/routes.js:24-29 + 12-16: consultaproy and consultabyid read body field "id".
    [Theory]
    [InlineData("consultaproy", "ConsultaProy(8)")]
    [InlineData("consultabyid", "LineaTiempo(8)")]
    public async Task IdRoutesReadTheLegacyIdField(string route, string expectedCall)
    {
        using var factory = new T3ProyApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync($"/api/v1/proyecciones/{route}", new { id = 8 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await T3Data.Json(response)).GetProperty("status").GetBoolean());
        Assert.Equal([expectedCall], factory.Calls);
    }

    // Legacy ProyService.js:546-560: the projection succeeded only when res === 1; any other value is an error toast.
    [Theory]
    [InlineData(1, true, "Proceso ejecutado correctamente.")]
    [InlineData(0, false, "Ejecución finalizada con observaciones.")]
    public async Task EjecutarSucceedsOnlyWhenTheFunctionAnswersOne(int resultado, bool success, string message)
    {
        using var factory = new T3ProyApiFactory { EjecutarResultado = resultado };
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync("/api/v1/proyecciones/ejecutarproyectar", new { proyId = 8, apsaId = 3 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await T3Data.Json(response);
        Assert.Equal(success, json.GetProperty("status").GetBoolean());
        Assert.Equal(success, json.GetProperty("data").GetProperty("success").GetBoolean());
        Assert.Equal(resultado, json.GetProperty("data").GetProperty("resultado").GetInt32());
        Assert.Equal(message, json.GetProperty("message").GetString());
        Assert.Equal(["Ejecutar(8,3,55)"], factory.Calls);
    }

    // Legacy proyecciones/controller.js:750-755: an empty or non-array data answers 400 "El parámetro 'data' debe ser un array
    // válido con al menos un elemento" before deleting anything.
    [Fact]
    public async Task EditarPorcSubConRejectsAnEmptyListLikeLegacy()
    {
        using var factory = new T3ProyApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.PostAsJsonAsync("/api/v1/proyecciones/editarPorcSubCon", new { proyId = 8, apsaId = 3, anno = 2025, mes = 1, items = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("El parámetro 'data' debe ser un array válido con al menos un elemento", await response.Content.ReadAsStringAsync());
        Assert.Empty(factory.Calls);
    }

    // Legacy proyecciones/routes.js:103-112 + controller.js:262-301: POST consultarcrecimiento {apsaid} reads
    // PROY_CRECIMIENTO_VBLES and the Drive sheets of the APS.
    // Accepted deviation: legacy-characterization-tests S8/S9 (consultarcrecimiento contract): consultarcrecimiento {proyId}
    // answers the stored PROY_* rows of the proyección and the Drive read moved to cargardesdedrive {apsaId}.
    [Fact]
    public async Task ConsultarCrecimientoReadsStoredRowsAndDriveMovedToCargarDesdeDrive()
    {
        using var factory = new T3ProyApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var stored = await client.PostAsync("/api/v1/proyecciones/consultarcrecimiento", T3Data.Body("{\"proyId\":8}"));
        var drive = await client.PostAsync("/api/v1/proyecciones/cargardesdedrive", T3Data.Body("{\"apsaId\":3}"));

        Assert.Equal(HttpStatusCode.OK, stored.StatusCode);
        Assert.Equal(HttpStatusCode.OK, drive.StatusCode);
        Assert.True((await T3Data.Json(stored)).GetProperty("status").GetBoolean());
        Assert.True((await T3Data.Json(drive)).GetProperty("status").GetBoolean());
        Assert.Equal(["Crecimiento(8)", "Drive(3)"], factory.Calls);
    }

    // Legacy request bodies (proyecciones/routes.js and ProyService.js): consulta {aps} (routes.js:7), ultimastarifas {aps} (:82),
    // crear {aps, nombre, descripcion, tipo, annosDesde, mesesDesde, annos, meses} (:39-40), editar/:id {nombre, descripcion,
    // tipo, annos, meses} (:59), registrarlineatiempo {datatable:[{PROYID, APS, PROYANNO, PROYMES, DELT*}], isnew} (:91),
    // consultasubcont {apsa_id, proy_id, anno, mes} (:240), editarPorcSubCon {aps, anno, mes, proy_id, data:[{CLAS_CLASE,
    // SUCO_VALOR}]} (:246), ejecutarproyectar {apsa_id, proy_id} (:229), registrardescuento {datos_descuentos, proy_id} (:148).
    // Accepted deviation: legacy-characterization-tests S8/S9 (renamed legacy request field names consumed consistently by the
    // new frontend, proyecciones.service.ts): the same values arrive through the new camelCase DTO names.
    [Theory]
    [InlineData("POST", "consulta", "{\"apsaId\":3}", "Consulta(3)")]
    [InlineData("POST", "ultimastarifas", "{\"apsaId\":3}", "UltimasTarifas(3)")]
    [InlineData("POST", "crear", "{\"apsaId\":3,\"proyNombre\":\"Proy\",\"proyDescripcion\":\"Base\",\"proyTipo100\":2,\"proyAnnoDes\":2025,\"proyMesDes\":4,\"proyAnnoHas\":2026,\"proyMesHas\":3}", "Crear(3,Proy,Base,2,2025,4,2026,3,55)")]
    [InlineData("PUT", "editar/8", "{\"proyNombre\":\"Proy\",\"proyDescripcion\":\"Base\",\"proyTipo100\":2,\"proyAnnoHas\":2026,\"proyMesHas\":3}", "Editar(8,Proy,Base,2,2026,3)")]
    [InlineData("POST", "registrarlineatiempo", "{\"proyId\":8,\"apsaId\":3,\"isNew\":true,\"rows\":[{\"anno\":2025,\"mes\":4,\"deltipc\":1.1}]}", "LineaTiempoUpsert(8,3,True,2025-4:1.1,55)")]
    [InlineData("POST", "consultasubcont", "{\"apsaId\":3,\"proyId\":8,\"anno\":2025,\"mes\":1}", "Subcont(3,8,2025,1)")]
    [InlineData("POST", "editarPorcSubCon", "{\"apsaId\":3,\"anno\":2025,\"mes\":1,\"proyId\":8,\"items\":[{\"clasClase\":1,\"sucoValor\":0.5}]}", "SubcontUpsert(8,3,2025,1,1:0.5,55)")]
    [InlineData("POST", "ejecutarproyectar", "{\"apsaId\":3,\"proyId\":8}", "Ejecutar(8,3,55)")]
    [InlineData("POST", "registrardescuento", "{\"proyId\":8,\"apsaId\":3,\"items\":[{\"ANNO\":2025,\"MES\":4,\"D_CCS\":1}]}", "Descuentos(8,1 rows,55)")]
    public async Task RenamedRequestBodiesAreBound(string method, string route, string body, string expectedCall)
    {
        using var factory = new T3ProyApiFactory();
        using var client = T3Data.Client(factory, sisuId: 55);

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), $"/api/v1/proyecciones/{route}") { Content = T3Data.Body(body) });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([expectedCall], factory.Calls);
    }

    // Legacy proyecciones/routes.js:6-237 use [authJwt.verificarToken] except consultarproyecciondescuentos and consultasubcont
    // (:161-170, :239-243); the token is now required on every route (parity-review S10).
    [Theory]
    [InlineData("consultageneral")]
    [InlineData("consultasubcont")]
    [InlineData("editarPorcSubCon")]
    [InlineData("consultarclasesuso")]
    [InlineData("registrarlineatiempo")]
    public async Task ProyeccionesRoutesRequireAToken(string route)
    {
        using var factory = new T3ProyApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync($"/api/v1/proyecciones/{route}", new { proyId = 8, apsaId = 3 });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", (await T3Data.Json(response)).GetProperty("message").GetString());
        Assert.Empty(factory.Calls);
    }
}

// ---------------------------------------------------------------------------------------------
// File-local test infrastructure
// ---------------------------------------------------------------------------------------------

file sealed class T3ProyApiFactory : WebApplicationFactory<Program>
{
    internal List<string> Calls { get; } = [];
    internal int EjecutarResultado { get; init; } = 1;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            var stub = new StubProyecciones(Calls, EjecutarResultado);
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<IProyeccionRepository>();
            services.AddSingleton<IProyeccionRepository>(stub);
            services.RemoveAll<ILineaTiempoRepository>();
            services.AddSingleton<ILineaTiempoRepository>(stub);
            services.RemoveAll<ICrecimientoRepository>();
            services.AddSingleton<ICrecimientoRepository>(stub);
            services.RemoveAll<ICrecimientoDriveService>();
            services.AddSingleton<ICrecimientoDriveService>(stub);
            services.RemoveAll<ISubcontProyRepository>();
            services.AddSingleton<ISubcontProyRepository>(stub);
            services.RemoveAll<IEjecucionProyeccionRepository>();
            services.AddSingleton<IEjecucionProyeccionRepository>(stub);
        });
    }
}

file sealed class StubProyecciones(List<string> calls, int ejecutarResultado)
    : IProyeccionRepository, ILineaTiempoRepository, ICrecimientoRepository, ICrecimientoDriveService, ISubcontProyRepository, IEjecucionProyeccionRepository
{
    private static readonly MutationResponse Ok = new() { Success = true, Message = "OK" };

    public Task<IReadOnlyList<ProyeccionListItem>> ConsultaAsync(long apsaId, CancellationToken cancellationToken)
    {
        calls.Add($"Consulta({apsaId})");
        return Task.FromResult<IReadOnlyList<ProyeccionListItem>>([]);
    }

    public Task<IReadOnlyList<ProyeccionListItem>> ConsultaGeneralAsync(long sisuId, CancellationToken cancellationToken)
    {
        calls.Add($"ConsultaGeneral({sisuId})");
        return Task.FromResult<IReadOnlyList<ProyeccionListItem>>([]);
    }

    public Task<ProyeccionDetail?> ConsultaProyAsync(long proyId, CancellationToken cancellationToken)
    {
        calls.Add($"ConsultaProy({proyId})");
        return Task.FromResult<ProyeccionDetail?>(new ProyeccionDetail { ProyId = proyId, ProyNombre = "Proy" });
    }

    public Task<MutationResponse> CrearAsync(ProyeccionCreateRequest r, long usuarioId, CancellationToken cancellationToken)
    {
        calls.Add($"Crear({r.ApsaId},{r.ProyNombre},{r.ProyDescripcion},{r.ProyTipo100},{r.ProyAnnoDes},{r.ProyMesDes},{r.ProyAnnoHas},{r.ProyMesHas},{usuarioId})");
        return Task.FromResult(Ok);
    }

    public Task<MutationResponse> EditarAsync(long proyId, ProyeccionUpdateRequest r, CancellationToken cancellationToken)
    {
        calls.Add($"Editar({proyId},{r.ProyNombre},{r.ProyDescripcion},{r.ProyTipo100},{r.ProyAnnoHas},{r.ProyMesHas})");
        return Task.FromResult(Ok);
    }

    public Task<MutationResponse> EliminarAsync(long proyId, CancellationToken cancellationToken)
    {
        calls.Add($"Eliminar({proyId})");
        return Task.FromResult(Ok);
    }

    public Task<IReadOnlyList<object>> UltimasTarifasAsync(long apsaId, CancellationToken cancellationToken)
    {
        calls.Add($"UltimasTarifas({apsaId})");
        return Task.FromResult<IReadOnlyList<object>>([]);
    }

    public Task<IReadOnlyList<LineaTiempoRow>> GetByProyeccionAsync(long proyId, CancellationToken cancellationToken)
    {
        calls.Add($"LineaTiempo({proyId})");
        return Task.FromResult<IReadOnlyList<LineaTiempoRow>>([]);
    }

    public Task<MutationResponse> UpsertAsync(LineaTiempoUpsertRequest r, long usuarioId, CancellationToken cancellationToken)
    {
        var rows = string.Join(";", r.Rows.Select(x => $"{x.Anno}-{x.Mes}:{T3Data.Text(x.Deltipc)}"));
        calls.Add($"LineaTiempoUpsert({r.ProyId},{r.ApsaId},{r.IsNew},{rows},{usuarioId})");
        return Task.FromResult(Ok);
    }

    public Task<CrecimientoDriveConfig?> GetDriveConfigAsync(long apsaId, CancellationToken cancellationToken)
        => Task.FromResult<CrecimientoDriveConfig?>(null);

    public Task<CrecimientoPayload> ConsultarAsync(long proyId, CancellationToken cancellationToken)
    {
        calls.Add($"Crecimiento({proyId})");
        return Task.FromResult(new CrecimientoPayload());
    }

    public Task<MutationResponse> RegistrarUsuariosAsync(CrecimientoUsuariosRequest r, long usuarioId, CancellationToken cancellationToken)
    {
        calls.Add($"Usuarios({r.ProyId},{r.Items.Count} rows,{usuarioId})");
        return Task.FromResult(Ok);
    }

    public Task<MutationResponse> RegistrarPropiaAsync(CrecimientoPropiaRequest r, long usuarioId, CancellationToken cancellationToken)
    {
        calls.Add($"Propia({r.ProyId},{r.Items.Count} rows,{usuarioId})");
        return Task.FromResult(Ok);
    }

    public Task<MutationResponse> RegistrarTercerosAsync(CrecimientoTercerosRequest r, long usuarioId, CancellationToken cancellationToken)
    {
        calls.Add($"Terceros({r.ProyId},{r.Items.Count} rows,{usuarioId})");
        return Task.FromResult(Ok);
    }

    public Task<MutationResponse> RegistrarDescuentosAsync(DescuentosRequest r, long usuarioId, CancellationToken cancellationToken)
    {
        calls.Add($"Descuentos({r.ProyId},{r.Items.Count} rows,{usuarioId})");
        return Task.FromResult(Ok);
    }

    public Task<IReadOnlyList<CrecimientoDriveTabResponse>> CargarDesdeDriveAsync(long apsaId, CancellationToken cancellationToken)
    {
        calls.Add($"Drive({apsaId})");
        return Task.FromResult<IReadOnlyList<CrecimientoDriveTabResponse>>([]);
    }

    public Task<IReadOnlyList<SubcontItem>> GetSubcontAsync(SubcontConsultaRequest r, CancellationToken cancellationToken)
    {
        calls.Add($"Subcont({r.ApsaId},{r.ProyId},{r.Anno},{r.Mes})");
        return Task.FromResult<IReadOnlyList<SubcontItem>>([]);
    }

    public Task<MutationResponse> UpsertSubcontAsync(SubcontUpsertRequest r, long usuarioId, CancellationToken cancellationToken)
    {
        var items = string.Join(";", r.Items.Select(i => $"{i.ClasClase}:{T3Data.Text(i.SucoValor)}"));
        calls.Add($"SubcontUpsert({r.ProyId},{r.ApsaId},{r.Anno},{r.Mes},{items},{usuarioId})");
        return Task.FromResult(Ok);
    }

    public Task<IReadOnlyList<ClaseUsoItem>> GetClasesUsoAsync(CancellationToken cancellationToken)
    {
        calls.Add("ClasesUso()");
        return Task.FromResult<IReadOnlyList<ClaseUsoItem>>([]);
    }

    public Task<int> EjecutarProyectarAsync(long proyId, long apsaId, long usuarioId, CancellationToken cancellationToken)
    {
        calls.Add($"Ejecutar({proyId},{apsaId},{usuarioId})");
        return Task.FromResult(ejecutarResultado);
    }
}

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

    /// <summary>Upper-cased SQL with single spaces, for regex checks on clauses.</summary>
    internal static string Collapse(string sql)
        => Regex.Replace(Regex.Replace(sql, "TARIFICADOR\\.", string.Empty, RegexOptions.IgnoreCase), "\\s+", " ").Trim().ToUpperInvariant();

    /// <summary>Drops "AS Alias" column aliases (Dapper mapping only, not part of the legacy statement).</summary>
    internal static string StripAliases(string sql) => Regex.Replace(sql, "\\s+AS\\s+\\w+", string.Empty, RegexOptions.IgnoreCase);
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

    /// <summary>"COLUMN = :bind" predicates of the statement mapped to their bound values (order-independent WHERE check).</summary>
    public Dictionary<string, string> PredicateBinds()
        => Regex.Matches(CommandText, "(\\w+)\\s*=\\s*:(\\w+)")
            .ToDictionary(m => m.Groups[1].Value.ToUpperInvariant(), m => T3Data.Text(Parameter(m.Groups[2].Value).Value));
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
