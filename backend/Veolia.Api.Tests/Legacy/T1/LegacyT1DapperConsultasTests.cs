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
using Veolia.Api.Modules.Regulator.General;
using Veolia.Api.Modules.Regulator.Informes;
using Veolia.Api.Modules.Regulator.Killometros;
using Veolia.Api.Modules.Regulator.Tafna;
using Veolia.Api.Modules.Regulator.Toneladas;
using Veolia.Api.Modules.Regulator.Trna;
using Veolia.Api.Modules.Regulator.UsuariosGrafico;

namespace Veolia.Api.Tests.Legacy.T1;

// Legacy-derived contract tests (odd/tasks/legacy-characterization-tests.md S1-S6) for the Regulator route
// groups whose repositories run plain Dapper on IOracleConnectionFactory: trna, tafna, kilometros, toneladas,
// usuarios (gráfico), general and informes. Each test goes through HTTP with the legacy request body, runs the
// real repository against a recording connection (SQL + binds observable) and checks the JSON returned.
// Recorded deviations asserted as the new behavior (parity-review-all.md S10, T9/T10, parent clarification):
// token required on every /api/v1 route, {status,data,message} envelope, camelCase keys of typed DTOs.
// Legacy root: /Users/zodiako/DEV/oracle/back-tarificador/src.

public sealed class LegacyT1TrnaContractTests
{
    // Legacy trna/routes.js:6-11 (POST /trna, body {aps, anno, mes}, authJwt.verificarToken) and
    // trna/controller.js:6-14 (SQL; binds [anno, mes, aps] for :1, :2, :3; columns apsa_id, empr_empr, divi_divi,
    // apsa_nomaps, fapr_nombre, fapr_codigo, fapr_valor, trna).
    [Fact]
    public async Task TrnaRunsTheLegacySqlWithAnnoMesApsBindsAndReturnsEveryLegacyColumn()
    {
        var connection = new RecordingDbConnection(Db.Rows(
            ("ApsaId", 7m), ("EmprEmpr", 11m), ("DiviDivi", 5001m), ("ApsaNomaps", "APS NORTE"),
            ("FaprNombre", "RECOLECCION"), ("FaprCodigo", 4m), ("FaprValor", 0.5m), ("Trna", 1234.1234567891m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/trna/trna", new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Consulta TRNA ejecutada correctamente.");
        var command = Assert.Single(connection.Commands);
        var sql = Db.Squash(command.CommandText);
        Assert.Contains("ROUND(PK_TRNA.FAUCO_TRNA(ED.EMPR_EMPR,ED.DIVI_DIVI,ED.APSA_ID,FP.FAPR_CODIGO,:1,:2),10)", sql);
        Assert.Contains("FROMAUCO_APSEMPRDIVIEDINNERJOINAUCO_FACTPRODUCCIONFPON(ED.APSA_ID=FP.APSA_ID)INNERJOINAUCO_APSASEOAPON(ED.APSA_ID=AP.APSA_ID)", sql);
        Assert.Contains("WHEREED.APSA_ID=:3ANDED.APEM_ESTADO=1ANDFP.FAPR_VALOR>0ORDERBYFP.FAPR_CODIGO", sql);
        Assert.Contains("TRIM(FP.FAPR_NOMBRE)", sql);
        Assert.Equal(Db.Anno, command.Value("1"));
        Assert.Equal(Db.Mes, command.Value("2"));
        Assert.Equal(Db.Aps, command.Value("3"));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(7m, row.GetProperty("apsaId").GetDecimal());
        Assert.Equal(11m, row.GetProperty("emprEmpr").GetDecimal());
        Assert.Equal(5001m, row.GetProperty("diviDivi").GetDecimal());
        Assert.Equal("APS NORTE", row.GetProperty("apsaNomaps").GetString());
        Assert.Equal("RECOLECCION", row.GetProperty("faprNombre").GetString());
        Assert.Equal(4m, row.GetProperty("faprCodigo").GetDecimal());
        Assert.Equal(0.5m, row.GetProperty("faprValor").GetDecimal());
        Assert.Equal(1234.1234567891m, row.GetProperty("trna").GetDecimal());
    }
}

public sealed class LegacyT1TafnaContractTests
{
    // Legacy tafna/routes.js:6-10 (POST /tafna, body {aps, anno, mes}) and tafna/controller.js:8-11
    // (vauco_toneladas, tipo IN ('TAFNA'), aps = :1, anno*12+mes BETWEEN (:2*12+:3)-6 AND :2*12+:3; binds [aps, anno, mes];
    // columns aps, empresa, anno, mes, valor).
    [Fact]
    public async Task TafnaRunsTheLegacySevenMonthWindowWithApsAnnoMesBinds()
    {
        var connection = new RecordingDbConnection(Db.Rows(("Aps", 7m), ("Empresa", 11m), ("Anno", 2025m), ("Mes", 2m), ("Valor", 0.25m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/tafna/tafna", new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Consulta TAFNA ejecutada correctamente.");
        var command = Assert.Single(connection.Commands);
        var sql = Db.Squash(command.CommandText);
        Assert.Contains("FROMVAUCO_TONELADAS", sql);
        Assert.Contains("WHEREAPS=:1ANDTIPOIN('TAFNA')AND(ANNO*12+MES)BETWEEN((:2*12+:3)-6)AND(:2*12+:3)", sql);
        Assert.Equal(Db.Aps, command.Value("1"));
        Assert.Equal(Db.Anno, command.Value("2"));
        Assert.Equal(Db.Mes, command.Value("3"));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(7m, row.GetProperty("aps").GetDecimal());
        Assert.Equal(11m, row.GetProperty("empresa").GetDecimal());
        Assert.Equal(2025, row.GetProperty("anno").GetInt32());
        Assert.Equal(2, row.GetProperty("mes").GetInt32());
        Assert.Equal(0.25m, row.GetProperty("valor").GetDecimal());
    }

    // Legacy tafna/controller.js:8 selects the raw `valor` column (no rounding).
    [Fact(Skip = "PARITY-FINDING: TAFNA valor is rounded to 6 decimals (TafnaRepository.cs: ROUND(VALOR, 6)); legacy tafna/controller.js:8 returned the raw valor.")]
    public async Task TafnaReturnsTheRawValorLikeLegacy()
    {
        var connection = new RecordingDbConnection(Db.Rows(("Aps", 7m), ("Empresa", 11m), ("Anno", 2025m), ("Mes", 2m), ("Valor", 0.25m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        await client.PostAsJsonAsync("/api/v1/tafna/tafna", new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });

        var sql = Db.Squash(Assert.Single(connection.Commands).CommandText);
        Assert.DoesNotContain("ROUND(", sql);
        Assert.Contains("VALORASVALOR", sql);
    }
}

public sealed class LegacyT1KilometrosContractTests
{
    // Legacy kilometros/routes.js:6-10 (POST /lbl, body {aps, anno, mes}) and kilometros/controller.js:6-11
    // (vauco_lbl, aps = :1 AND estado = 1, seven-month window; binds [aps, anno, mes]; columns aps, empresa, mpio, mes, valor).
    // The new endpoint also returns anno and estado (additive, nothing removed).
    [Fact]
    public async Task LblRunsTheLegacyFilterAndReturnsEveryLegacyColumn()
    {
        var connection = new RecordingDbConnection(Db.Rows(
            ("Aps", 7m), ("Empresa", 11m), ("Mpio", 5001m), ("Anno", 2025m), ("Mes", 2m), ("Valor", 12.75m), ("Estado", 1m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/kilometros/lbl", new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Consulta LBL ejecutada correctamente.");
        var command = Assert.Single(connection.Commands);
        var sql = Db.Squash(command.CommandText);
        Assert.Contains("FROMVAUCO_LBL", sql);
        Assert.Contains("WHEREAPS=:1ANDESTADO=1AND(ANNO*12+MES)BETWEEN((:2*12+:3)-6)AND(:2*12+:3)", sql);
        Assert.Contains("VALORASVALOR", sql);
        Assert.Equal(Db.Aps, command.Value("1"));
        Assert.Equal(Db.Anno, command.Value("2"));
        Assert.Equal(Db.Mes, command.Value("3"));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(7m, row.GetProperty("aps").GetDecimal());
        Assert.Equal(11m, row.GetProperty("empresa").GetDecimal());
        Assert.Equal(5001m, row.GetProperty("mpio").GetDecimal());
        Assert.Equal(2, row.GetProperty("mes").GetInt32());
        Assert.Equal(12.75m, row.GetProperty("valor").GetDecimal());
    }
}

public sealed class LegacyT1ToneladasContractTests
{
    // Legacy toneladas/routes.js:6-10 (POST /qrt) and toneladas/controller.js:6-12: ROUND(SUM(valor)/6,4) AS VALOR,
    // tipo NOT IN ('QA','TAFNA'), seven-month window, GROUP BY aps, empresa, tipo, ORDER BY aps, empresa, tipo
    // (aps is fixed by the WHERE, so the new ORDER BY EMPRESA, TIPO yields the same order); binds [aps, anno, mes].
    [Fact]
    public async Task QrtRunsTheLegacySixMonthAverageGroupedByEmpresaTipo()
    {
        var connection = new RecordingDbConnection(Db.Rows(("Aps", 7m), ("Empresa", 11m), ("Tipo", "QBL"), ("Valor", 10.1234m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/toneladas/qrt", new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Consulta QRT ejecutada correctamente.");
        var command = Assert.Single(connection.Commands);
        var sql = Db.Squash(command.CommandText);
        Assert.Contains("ROUND(SUM(VALOR)/6,4)ASVALOR", sql);
        Assert.Contains("FROMVAUCO_TONELADAS", sql);
        Assert.Contains("WHEREAPS=:1ANDTIPONOTIN('QA','TAFNA')AND(ANNO*12+MES)BETWEEN((:2*12+:3)-6)AND(:2*12+:3)", sql);
        Assert.Contains("GROUPBYAPS,EMPRESA,TIPOORDERBYEMPRESA,TIPO", sql);
        Assert.Equal(Db.Aps, command.Value("1"));
        Assert.Equal(Db.Anno, command.Value("2"));
        Assert.Equal(Db.Mes, command.Value("3"));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(7m, row.GetProperty("aps").GetDecimal());
        Assert.Equal(11m, row.GetProperty("empresa").GetDecimal());
        Assert.Equal("QBL", row.GetProperty("tipo").GetString());
        Assert.Equal(10.1234m, row.GetProperty("valor").GetDecimal());
    }

    // Legacy toneladas/routes.js:12-16 (POST /qa) and toneladas/controller.js:19-22: columns aps, empresa, anno, mes, valor;
    // tipo IN ('QA'), seven-month window; binds [aps, anno, mes]. Legacy had no ORDER BY (the new one only fixes the order).
    [Fact]
    public async Task QaRunsTheLegacyQaFilterAndReturnsEveryLegacyColumn()
    {
        var connection = new RecordingDbConnection(Db.Rows(("Aps", 7m), ("Empresa", 11m), ("Anno", 2024m), ("Mes", 12m), ("Valor", 3.5m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/toneladas/qa", new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Consulta QA ejecutada correctamente.");
        var command = Assert.Single(connection.Commands);
        var sql = Db.Squash(command.CommandText);
        Assert.Contains("FROMVAUCO_TONELADAS", sql);
        Assert.Contains("WHEREAPS=:1ANDTIPOIN('QA')AND(ANNO*12+MES)BETWEEN((:2*12+:3)-6)AND(:2*12+:3)", sql);
        Assert.Contains("VALORASVALOR", sql);
        Assert.DoesNotContain("ROUND(", sql);
        Assert.Equal(Db.Aps, command.Value("1"));
        Assert.Equal(Db.Anno, command.Value("2"));
        Assert.Equal(Db.Mes, command.Value("3"));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(7m, row.GetProperty("aps").GetDecimal());
        Assert.Equal(11m, row.GetProperty("empresa").GetDecimal());
        Assert.Equal(2024, row.GetProperty("anno").GetInt32());
        Assert.Equal(12, row.GetProperty("mes").GetInt32());
        Assert.Equal(3.5m, row.GetProperty("valor").GetDecimal());
    }

    // Legacy toneladas/routes.js:18-22 (POST /detalle) and toneladas/controller.js:28-32: SELECT * FROM vauco_toneladas,
    // tipo NOT IN ('TAFNA'), seven-month window; binds [aps, anno, mes]. The view has exactly 7 columns
    // (APS, EMPRESA, MPIO, ANNO, MES, TIPO, VALOR: backend/Veolia.Api/Database/Toneladas/create-view.sql,
    // doc migracion/modules/toneladas/toneladas.md:31), all of them returned.
    [Fact]
    public async Task DetalleRunsTheLegacySelectAndReturnsEveryViewColumn()
    {
        var connection = new RecordingDbConnection(Db.Rows(
            ("APS", 7m), ("EMPRESA", 11m), ("MPIO", 5001m), ("ANNO", 2025m), ("MES", 1m), ("TIPO", "QA"), ("VALOR", 8.25m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/toneladas/detalle", new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Consulta de detalle ejecutada correctamente.");
        var command = Assert.Single(connection.Commands);
        var sql = Db.Squash(command.CommandText);
        Assert.Contains("SELECT*FROMVAUCO_TONELADAS", sql);
        Assert.Contains("WHEREAPS=:1ANDTIPONOTIN('TAFNA')AND(ANNO*12+MES)BETWEEN((:2*12+:3)-6)AND(:2*12+:3)", sql);
        Assert.Equal(Db.Aps, command.Value("1"));
        Assert.Equal(Db.Anno, command.Value("2"));
        Assert.Equal(Db.Mes, command.Value("3"));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(7, row.EnumerateObject().Count());
        Assert.Equal(7m, row.GetProperty("aps").GetDecimal());
        Assert.Equal(11m, row.GetProperty("empresa").GetDecimal());
        Assert.Equal(5001m, row.GetProperty("mpio").GetDecimal());
        Assert.Equal(2025, row.GetProperty("anno").GetInt32());
        Assert.Equal(1, row.GetProperty("mes").GetInt32());
        Assert.Equal("QA", row.GetProperty("tipo").GetString());
        Assert.Equal(8.25m, row.GetProperty("valor").GetDecimal());
    }
}

public sealed class LegacyT1UsuariosGraficoContractTests
{
    // Legacy usuarios/routes.js:6-10 (POST /usuagraf, body {aps, anno, mes}) and usuarios/controller.js:5-13:
    // ROUND(SUM(valor)/6,4) AS valor FROM vauco_usuarios WHERE aps = :1 AND estado = 1 AND seven-month window
    // GROUP BY aps, empresa, tipo; binds [aps, anno, mes].
    [Fact]
    public async Task UsuagrafRunsTheLegacySixMonthAverage()
    {
        var connection = new RecordingDbConnection(Db.Rows(("Aps", 7m), ("Empresa", 11m), ("Tipo", "RESIDENCIAL"), ("Valor", 1500.5m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/usuarios/usuagraf", new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Consulta de usuarios promedio ejecutada correctamente.");
        var command = Assert.Single(connection.Commands);
        var sql = Db.Squash(command.CommandText);
        Assert.Contains("ROUND(SUM(VALOR)/6,4)ASVALOR", sql);
        Assert.Contains("FROMVAUCO_USUARIOS", sql);
        Assert.Contains("WHEREAPS=:1ANDESTADO=1AND(ANNO*12+MES)BETWEEN((:2*12+:3)-6)AND(:2*12+:3)GROUPBYAPS,EMPRESA,TIPO", sql);
        Assert.Equal(Db.Aps, command.Value("1"));
        Assert.Equal(Db.Anno, command.Value("2"));
        Assert.Equal(Db.Mes, command.Value("3"));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(7m, row.GetProperty("aps").GetDecimal());
        Assert.Equal(11m, row.GetProperty("empresa").GetDecimal());
        Assert.Equal("RESIDENCIAL", row.GetProperty("tipo").GetString());
        Assert.Equal(1500.5m, row.GetProperty("valor").GetDecimal());
    }

    // Legacy usuarios/routes.js:12-17 (POST /usuadeta) and usuarios/controller.js:16-23: SELECT * FROM vauco_usuarios
    // WHERE aps = :1 AND estado = 1 AND seven-month window; binds [aps, anno, mes]. The new query lists the columns
    // APS, EMPRESA, MPIO, ANNO, MES, TIPO, VALOR, ESTADO explicitly.
    [Fact]
    public async Task UsuadetaRunsTheLegacyFilterAndReturnsTheDetailColumns()
    {
        var connection = new RecordingDbConnection(Db.Rows(
            ("Aps", 7m), ("Empresa", 11m), ("Mpio", 5001m), ("Anno", 2025m), ("Mes", 2m), ("Tipo", "RESIDENCIAL"), ("Valor", 1500m), ("Estado", 1m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.PostAsJsonAsync("/api/v1/usuarios/usuadeta", new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Consulta de detalle de usuarios ejecutada correctamente.");
        var command = Assert.Single(connection.Commands);
        var sql = Db.Squash(command.CommandText);
        Assert.Contains("FROMVAUCO_USUARIOS", sql);
        Assert.Contains("WHEREAPS=:1ANDESTADO=1AND(ANNO*12+MES)BETWEEN((:2*12+:3)-6)AND(:2*12+:3)", sql);
        Assert.Equal(Db.Aps, command.Value("1"));
        Assert.Equal(Db.Anno, command.Value("2"));
        Assert.Equal(Db.Mes, command.Value("3"));
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(7m, row.GetProperty("aps").GetDecimal());
        Assert.Equal(11m, row.GetProperty("empresa").GetDecimal());
        Assert.Equal(5001m, row.GetProperty("mpio").GetDecimal());
        Assert.Equal(2025, row.GetProperty("anno").GetInt32());
        Assert.Equal(2, row.GetProperty("mes").GetInt32());
        Assert.Equal("RESIDENCIAL", row.GetProperty("tipo").GetString());
        Assert.Equal(1500m, row.GetProperty("valor").GetDecimal());
        Assert.Equal(1m, row.GetProperty("estado").GetDecimal());
    }
}

public sealed class LegacyT1GeneralContractTests
{
    // Legacy general/routes.js:6-9 (GET /consultauso, token) and general/controller.js:6-11: SELECT * FROM auco_clasesuso,
    // no binds; res.send(resultado) is the bare row array with the Oracle column names (no envelope, same in the new API).
    [Fact]
    public async Task ConsultaUsoReturnsTheBareClasesUsoRowsWithOracleColumnNames()
    {
        var connection = new RecordingDbConnection(Db.Rows(("CLUS_CLUS", 1m), ("CLUS_NOMBRE", "RESIDENCIAL")));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.GetAsync("/api/v1/general/consultauso");
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var command = Assert.Single(connection.Commands);
        Assert.Equal("SELECT*FROMAUCO_CLASESUSO", Db.Squash(command.CommandText));
        Assert.Empty(command.Parameters);
        var row = Assert.Single(body.EnumerateArray());
        Assert.Equal(1m, row.GetProperty("CLUS_CLUS").GetDecimal());
        Assert.Equal("RESIDENCIAL", row.GetProperty("CLUS_NOMBRE").GetString());
    }

    // Legacy general/routes.js:16-19 (GET /paracostos) and general/controller.js:23: SELECT PARA_PARA, PARA_NOMBRE
    // FROM AUGE_PARAMETROS WHERE CLAS_CLAS = 20010 AND PARA_ESTADO = 'A' ORDER BY PARA_NOMBRE; bare row array.
    [Fact]
    public async Task ParaCostosReturnsTheCostCatalogLikeLegacy()
    {
        var connection = new RecordingDbConnection(Db.Rows(("PARA_PARA", 1m), ("PARA_NOMBRE", "CBL")));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.GetAsync("/api/v1/general/paracostos");
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var command = Assert.Single(connection.Commands);
        Assert.Equal("SELECTPARA_PARA,PARA_NOMBREFROMAUGE_PARAMETROSWHERECLAS_CLAS=20010ANDPARA_ESTADO='A'ORDERBYPARA_NOMBRE", Db.Squash(command.CommandText));
        Assert.Empty(command.Parameters);
        var row = Assert.Single(body.EnumerateArray());
        Assert.Equal(2, row.EnumerateObject().Count());
        Assert.Equal(1m, row.GetProperty("PARA_PARA").GetDecimal());
        Assert.Equal("CBL", row.GetProperty("PARA_NOMBRE").GetString());
    }

    // Legacy general/routes.js:11-14 (GET /paraindices, consumed by front-tarificador/src/service/GeneralService.js:9
    // from views/suministros/Cra.vue:305) and general/controller.js:15: para_para, para_nombre, para_descri FROM auge_parametros
    // WHERE clas_clas = 20011 and para_estado = 'A'.
    [Fact(Skip = "PARITY-FINDING: GET /api/v1/general/paraindices is not migrated (404; GeneralController.cs comment redirects to /api/v1/indices/catalogo, which drops PARA_DESCRI); legacy general/routes.js:11 returned para_para, para_nombre, para_descri.")]
    public async Task ParaIndicesReturnsTheIndicesCatalogLikeLegacy()
    {
        var connection = new RecordingDbConnection(Db.Rows(("PARA_PARA", 1m), ("PARA_NOMBRE", "IPC"), ("PARA_DESCRI", "Indice de precios")));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.GetAsync("/api/v1/general/paraindices");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Db.Json(response);
        var command = Assert.Single(connection.Commands);
        Assert.Contains("PARA_PARA,PARA_NOMBRE,PARA_DESCRIFROMAUGE_PARAMETROSWHERECLAS_CLAS=20011ANDPARA_ESTADO='A'", Db.Squash(command.CommandText));
        var row = Assert.Single(body.EnumerateArray());
        Assert.Equal("Indice de precios", row.GetProperty("PARA_DESCRI").GetString());
    }
}

public sealed class LegacyT1InformesContractTests
{
    // Legacy informes/routes.js:14-19 (GET /costos?aps&anno&mes, tipo200 = 1) and informes/controller.js:7-10:
    // SELECT * FROM json_json WHERE apsa_id = :1 AND json_anno = :2 AND json_mes = :3 AND json_tipo200 = :4, binds
    // [aps, anno, mes, tipo200], JSON_DOCUMENT parsed. Legacy consumers only read resultado[0].JSON_DOCUMENT.semestre and
    // .dataset (front-tarificador views/procesos/Calculo.vue:553-554, views/sui/Suisui.vue:249-250); the new data is that
    // document inside the recorded envelope.
    [Fact]
    public async Task CostosQueriesJsonJsonTipo1AndReturnsTheParsedDocument()
    {
        var connection = new RecordingDbConnection(Db.Rows(
            ("APSA_ID", 7m), ("JSON_ANNO", 2025m), ("JSON_MES", 3m), ("JSON_TIPO200", 1m),
            ("JSON_DOCUMENT", """{"semestre":"Semestre 2024-2","dataset":[{"nombre":"QRT","columns":["EMPRESA","VALOR"],"data":[["11","10,5"]]}]}""")));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.GetAsync($"/api/v1/informes/costos?aps={Db.Aps}&anno={Db.Anno}&mes={Db.Mes}");
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Resumen de variables consultado correctamente.");
        var command = Assert.Single(connection.Commands);
        Assert.Contains("SELECT*FROMJSON_JSONWHEREAPSA_ID=:APSANDJSON_ANNO=:ANNOANDJSON_MES=:MESANDJSON_TIPO200=:TIPO200", Db.Squash(command.CommandText));
        Assert.Equal(new object?[] { Db.Aps, Db.Anno, Db.Mes, 1 }, command.Parameters.Select(p => p.Value).ToArray());
        var data = body.GetProperty("data");
        Assert.Equal("Semestre 2024-2", data.GetProperty("semestre").GetString());
        var table = Assert.Single(data.GetProperty("dataset").EnumerateArray());
        Assert.Equal("QRT", table.GetProperty("nombre").GetString());
        Assert.Equal(["EMPRESA", "VALOR"], table.GetProperty("columns").EnumerateArray().Select(c => c.GetString()));
        Assert.Equal("10,5", table.GetProperty("data")[0][1].GetString());
    }

    // Legacy informes/routes.js:6-12 (GET /clus, tipo200 = 2), same SQL and binds as /costos; consumer
    // views/procesos/Costos.vue:110-113 shows JSON_DOCUMENT.dataset[0] in GenericTable.
    [Fact]
    public async Task ClusQueriesJsonJsonTipo2AndReturnsTheParsedDocument()
    {
        var connection = new RecordingDbConnection(Db.Rows(
            ("APSA_ID", 7m), ("JSON_DOCUMENT", """{"semestre":"S1","dataset":[{"nombre":"CLUS","columns":["CLUS"],"data":[["1.234,5"]]}]}""")));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.GetAsync($"/api/v1/informes/clus?aps={Db.Aps}&anno={Db.Anno}&mes={Db.Mes}");
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Db.AssertEnvelope(body, "Componentes CLUS consultados correctamente.");
        var command = Assert.Single(connection.Commands);
        Assert.Contains("JSON_TIPO200=:TIPO200", Db.Squash(command.CommandText));
        Assert.Equal(new object?[] { Db.Aps, Db.Anno, Db.Mes, 2 }, command.Parameters.Select(p => p.Value).ToArray());
        var table = Assert.Single(body.GetProperty("data").GetProperty("dataset").EnumerateArray());
        Assert.Equal("CLUS", table.GetProperty("nombre").GetString());
        Assert.Equal("1.234,5", table.GetProperty("data")[0][0].GetString());
    }

    // Legacy informes/controller.js:8-16 returns 200 with an empty array when json_json has no row; consumers then fall
    // back to the charts (Costos.vue:112 `infoResponse.length > 0`). The new API keeps 200 and returns an empty document.
    [Fact]
    public async Task MissingDocumentIsStill200WithAnEmptyDocument()
    {
        var connection = new RecordingDbConnection(_ => new DataTable());
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.GetAsync($"/api/v1/informes/clus?aps={Db.Aps}&anno={Db.Anno}&mes={Db.Mes}");
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal("", body.GetProperty("data").GetProperty("semestre").GetString());
        Assert.Empty(body.GetProperty("data").GetProperty("dataset").EnumerateArray());
    }

    // Legacy informes/controller.js:10 passes JSON_DOCUMENT through untouched (JSON.parse), and the legacy table
    // component reads `nombre || grup` as the table legend (front-tarificador components/GenericTable.vue:86).
    [Fact(Skip = "PARITY-FINDING: informes deserializes JSON_DOCUMENT into InformeDatasetItem(Nombre, Columns, Data), dropping any other key such as `grup` (legacy GenericTable.vue:86 legend `nombre || grup`); legacy informes/controller.js:10 returned the document untouched.")]
    public async Task DocumentKeysArePassedThroughUntouchedLikeLegacy()
    {
        var connection = new RecordingDbConnection(Db.Rows(
            ("APSA_ID", 7m), ("JSON_DOCUMENT", """{"semestre":"S1","dataset":[{"grup":"CLUS","columns":["CLUS"],"data":[["1"]]}]}""")));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = Db.Client(factory);

        var response = await client.GetAsync($"/api/v1/informes/clus?aps={Db.Aps}&anno={Db.Anno}&mes={Db.Mes}");
        var body = await Db.Json(response);

        var table = Assert.Single(body.GetProperty("data").GetProperty("dataset").EnumerateArray());
        Assert.Equal("CLUS", table.GetProperty("grup").GetString());
    }
}

public sealed class LegacyT1DapperTokenTests
{
    // Legacy middlewares/authJwt.js:12-15: no x-access-token -> 403 {"message":"No existe token de verificacion"} and the
    // handler never runs. Every route in these groups was already behind authJwt.verificarToken in legacy
    // (trna/routes.js:6, tafna/routes.js:6, kilometros/routes.js:6, toneladas/routes.js:6-18, usuarios/routes.js:6-12,
    // general/routes.js:6-16, informes/routes.js:6-14).
    [Theory]
    [InlineData("POST", "/api/v1/trna/trna")]
    [InlineData("POST", "/api/v1/tafna/tafna")]
    [InlineData("POST", "/api/v1/kilometros/lbl")]
    [InlineData("POST", "/api/v1/toneladas/qrt")]
    [InlineData("POST", "/api/v1/toneladas/qa")]
    [InlineData("POST", "/api/v1/toneladas/detalle")]
    [InlineData("POST", "/api/v1/usuarios/usuagraf")]
    [InlineData("POST", "/api/v1/usuarios/usuadeta")]
    [InlineData("GET", "/api/v1/general/consultauso")]
    [InlineData("GET", "/api/v1/general/paracostos")]
    [InlineData("GET", "/api/v1/informes/costos?aps=7&anno=2025&mes=3")]
    [InlineData("GET", "/api/v1/informes/clus?aps=7&anno=2025&mes=3")]
    public async Task WithoutTokenTheLegacy403IsReturnedAndNoSqlRuns(string method, string url)
    {
        var connection = new RecordingDbConnection(Db.Rows(("X", 1m)));
        using var factory = new LegacyT1DapperApiFactory(connection);
        using var client = factory.CreateClient();

        using var request = new HttpRequestMessage(new HttpMethod(method), url);
        if (method == "POST") request.Content = JsonContent.Create(new { aps = Db.Aps, anno = Db.Anno, mes = Db.Mes });
        var response = await client.SendAsync(request);
        var body = await Db.Json(response);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("No existe token de verificacion", body.GetProperty("message").GetString());
        Assert.Empty(connection.Commands);
    }
}

file static class Db
{
    internal const int Aps = 7;
    internal const int Anno = 2025;
    internal const int Mes = 3;

    internal static HttpClient Client(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TestJwt.AdminSisuId, 1));
        return client;
    }

    internal static async Task<JsonElement> Json(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

    /// <summary>Uppercases the SQL and removes every whitespace so fragments compare independent of layout.</summary>
    internal static string Squash(string sql)
        => new string(sql.Where(c => !char.IsWhiteSpace(c)).ToArray()).ToUpperInvariant();

    internal static void AssertEnvelope(JsonElement body, string message)
    {
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.Equal(message, body.GetProperty("message").GetString());
        Assert.True(body.TryGetProperty("traceId", out _));
    }

    /// <summary>Answers every reader command with one row made of the given (column, value) pairs.</summary>
    internal static Func<RecordedCommand, object?> Rows(params (string Column, object Value)[] columns)
        => _ =>
        {
            var table = new DataTable();
            foreach (var (column, value) in columns) table.Columns.Add(column, value.GetType());
            table.Rows.Add(columns.Select(c => c.Value).ToArray());
            return table;
        };
}

file sealed class LegacyT1DapperApiFactory(RecordingDbConnection connection) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            // The token middleware keeps its own dead-token store; only the repositories see the recording connection.
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());

            var recording = new RecordingConnectionFactory(connection);
            services.RemoveAll<ITrnaRepository>();
            services.AddSingleton<ITrnaRepository>(new TrnaRepository(recording));
            services.RemoveAll<ITafnaRepository>();
            services.AddSingleton<ITafnaRepository>(new TafnaRepository(recording));
            services.RemoveAll<IKillometrosRepository>();
            services.AddSingleton<IKillometrosRepository>(new KillometrosRepository(recording));
            services.RemoveAll<IToneladasRepository>();
            services.AddSingleton<IToneladasRepository>(new ToneladasRepository(recording));
            services.RemoveAll<IUsuariosGraficoRepository>();
            services.AddSingleton<IUsuariosGraficoRepository>(new UsuariosGraficoRepository(recording));
            services.RemoveAll<IGeneralRepository>();
            services.AddSingleton<IGeneralRepository>(new GeneralRepository(recording));
            services.RemoveAll<IInformesRepository>();
            services.AddSingleton<IInformesRepository>(new InformesRepository(recording));
        });
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

    public object? Value(string name)
        => Parameters.Single(p => string.Equals(p.ParameterName.TrimStart(':', '@'), name, StringComparison.Ordinal)).Value;
}

/// <summary>In-memory ADO.NET connection that records every command and answers it through <c>respond</c>.</summary>
file sealed class RecordingDbConnection(Func<RecordedCommand, object?> respond) : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;

    public List<RecordedCommand> Commands { get; } = [];

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => "recording";
    public override string DataSource => "recording";
    public override string ServerVersion => "1";
    public override ConnectionState State => state;

    public override void ChangeDatabase(string databaseName) { }
    public override void Close() => state = ConnectionState.Closed;
    public override void Open() => state = ConnectionState.Open;

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) => throw new NotSupportedException();
    protected override DbCommand CreateDbCommand() => new RecordingCommand(this);

    internal object? Execute(RecordingCommand command)
    {
        var recorded = new RecordedCommand(command.CommandText, command.RecordedParameters.ToList());
        Commands.Add(recorded);
        return respond(recorded);
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
