using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.GoogleDrive;
using Veolia.Api.Modules.Sui853.Configuracion;

namespace Veolia.Api.Tests.Legacy.T4;

/// <summary>
/// SUI853 Configuración (30003 Formularios, 30006 Carga genérica) through the real Program pipeline,
/// with expectations taken from legacy back-tarificador/src/modules/sui853/configuracion/{routes.js,controller.js}.
/// Oracle and Google Sheets are stubbed; tokens are signed for system 3 (SUI 853).
/// </summary>
public sealed class LegacyT4ConfiguracionContractTests
{
    private const string Base = "/api/v1/sui853Configuracion/";

    // ---------------------------------------------------------------- tablasSui

    // Legacy configuracion/routes.js:53-57 + controller.js:218-238: POST tablasSui (no body) lists the SUI tables
    // as { status: 200, data: rows }. The row shape ({"OWNER||'.'||TABLE_NAME": "SUI.X"}) became a plain
    // table-name list consumed by the new carga-generica screen (internal contract, see parent clarification).
    [Fact]
    public async Task TablasSui_ListsSuiTablesInLegacyEnvelope()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "tablasSui", Json("{}"));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, body.GetProperty("status").GetInt32());
        Assert.Equal(["TGEN_A", "TGEN_B"], body.GetProperty("data").EnumerateArray().Select(e => e.GetString()));
        Assert.Equal(["Tables"], factory.Repository.Calls);
    }

    // ---------------------------------------------------------------- listarHojasDrive

    // Legacy controller.js:1442-1504 (+ helpers/drivehelper.js:71-80): POST listarHojasDrive { sheetId } →
    // 200 { status: 200, data: { ok: true, source: "DRIVE_SHEETS", sheets: [{ sheetId, title, index, rowCount, columnCount }] } }.
    [Fact]
    public async Task ListarHojasDrive_ReturnsLegacySheetMetadata()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "listarHojasDrive", Json("""{"sheetId":"abc_123-XYZ"}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, body.GetProperty("status").GetInt32());
        var data = body.GetProperty("data");
        Assert.True(data.GetProperty("ok").GetBoolean());
        Assert.Equal("DRIVE_SHEETS", data.GetProperty("source").GetString());
        var sheet = Assert.Single(data.GetProperty("sheets").EnumerateArray());
        Assert.Equal(7, sheet.GetProperty("sheetId").GetInt32());
        Assert.Equal("Hoja 1", sheet.GetProperty("title").GetString());
        Assert.Equal(0, sheet.GetProperty("index").GetInt32());
        Assert.Equal(120, sheet.GetProperty("rowCount").GetInt32());
        Assert.Equal(26, sheet.GetProperty("columnCount").GetInt32());
        Assert.Equal(["ListMetadata:abc_123-XYZ"], factory.Sheets.Calls);
    }

    // Legacy controller.js:1446-1463: a missing sheetId is a 400 and Drive is never queried.
    [Fact]
    public async Task ListarHojasDrive_MissingSheetId_Returns400WithoutDriveAccess()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "listarHojasDrive", Json("""{"sheetId":""}"""));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.Sheets.Calls);
    }

    // Legacy controller.js:1450-1463: the 400 body is { status: 400, data: { ok: false, source: "DRIVE_SHEETS",
    // code: "VALIDATION_ERROR", message: "Errores de validación en listarHojasDrive", errors: ["sheetId es requerido"] } }.
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, validation payload shape): the new API answers
    // { ok: false, code: "INVALID_PARAMS", message: "sheetId inválido." } without source/errors.
    [Fact]
    public async Task ListarHojasDrive_MissingSheetId_UsesTheNewValidationPayload()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "listarHojasDrive", Json("""{"sheetId":""}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(400, body.GetProperty("status").GetInt32());
        var data = body.GetProperty("data");
        Assert.False(data.GetProperty("ok").GetBoolean());
        Assert.Equal("INVALID_PARAMS", data.GetProperty("code").GetString());
        Assert.Equal("sheetId inválido.", data.GetProperty("message").GetString());
        Assert.False(data.TryGetProperty("errors", out _));
        Assert.Empty(factory.Sheets.Calls);
    }

    // Legacy controller.js:1467-1477: a spreadsheet without tabs answers 404 { status: 404, data: { ok: false,
    // source: "DRIVE_SHEETS", code: "NO_SHEETS_FOUND", message: "El archivo no tiene hojas o no se encontraron." } }.
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, API-only response shape): cargueGenerico.vue:onBuscarHojas
    // never showed that message (axios threw and it printed the raw "Request failed with status code 404"); the new API
    // answers 200 { ok: true, sheets: [] } and the screen explains that the document has no tabs.
    [Fact]
    public async Task ListarHojasDrive_NoSheets_ReturnsAnEmptySheetList()
    {
        using var factory = new ConfiguracionFactory();
        factory.Sheets.Metadata = [];
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "listarHojasDrive", Json("""{"sheetId":"abc"}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, body.GetProperty("status").GetInt32());
        var data = body.GetProperty("data");
        Assert.True(data.GetProperty("ok").GetBoolean());
        Assert.Equal("DRIVE_SHEETS", data.GetProperty("source").GetString());
        Assert.Empty(data.GetProperty("sheets").EnumerateArray());
        Assert.Equal(["ListMetadata:abc"], factory.Sheets.Calls);
    }

    // ---------------------------------------------------------------- cargaDriveDinamica (preview)

    // Legacy controller.js:1049-1186 (previewOnly): reads ALL_TAB_COLUMNS for OWNER/TABLE, reads only the header
    // row, and answers { ok: true, source: "PREVIEW", mode: "PREVIEW", driveHeaders (trimmed, upper-cased),
    // tableColumns (COLUMN_ID, COLUMN_NAME, DATA_TYPE), commonColumns } without inserting anything.
    [Fact]
    public async Task CargaDriveDinamica_Preview_ReturnsLegacyHeaderMapping()
    {
        using var factory = new ConfiguracionFactory();
        factory.Sheets.Headers = [" id ", "valor", "extra"];
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"Hoja 1","owner":"SUI","tableName":"TGEN_A","previewOnly":true}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, body.GetProperty("status").GetInt32());
        var data = body.GetProperty("data");
        Assert.True(data.GetProperty("ok").GetBoolean());
        Assert.Equal("PREVIEW", data.GetProperty("source").GetString());
        Assert.Equal("PREVIEW", data.GetProperty("mode").GetString());
        Assert.Equal(["ID", "VALOR", "EXTRA"], Strings(data.GetProperty("driveHeaders")));
        Assert.Equal(["ID", "VALOR"], Strings(data.GetProperty("commonColumns")));
        var columns = data.GetProperty("tableColumns").EnumerateArray().ToArray();
        Assert.Equal(["ID", "VALOR", "NOTA"], columns.Select(c => c.GetProperty("COLUMN_NAME").GetString()));
        Assert.Equal(["NUMBER", "NUMBER", "VARCHAR2"], columns.Select(c => c.GetProperty("DATA_TYPE").GetString()));
        Assert.Equal([1, 2, 3], columns.Select(c => c.GetProperty("COLUMN_ID").GetInt32()));
        Assert.Equal(["Columns:TGEN_A"], factory.Repository.Calls);
        Assert.Equal(["ReadHeaders:abc:Hoja 1"], factory.Sheets.Calls);
    }

    // Legacy controller.js:1158-1170: any header text is accepted; headers that are not table columns are simply
    // listed in driveHeaders and left out of commonColumns (the screen marks them "No existe ⚠").
    [Fact]
    public async Task CargaDriveDinamica_Preview_ListsNonIdentifierHeadersAsNotMatching()
    {
        using var factory = new ConfiguracionFactory();
        factory.Sheets.Headers = ["ID", "Nombre APS"];
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"Hoja 1","owner":"SUI","tableName":"TGEN_A","previewOnly":true}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["ID", "NOMBRE APS"], Strings(body.GetProperty("data").GetProperty("driveHeaders")));
        Assert.Equal(["ID"], Strings(body.GetProperty("data").GetProperty("commonColumns")));
    }

    // ---------------------------------------------------------------- cargaDriveDinamica (load)

    // Legacy controller.js:1188-1395: values of the selected columns are taken in column order; empty cells → null,
    // NUMBER cells "12,5" → 12.5 (comma → dot), text cells trimmed; answers { ok: true, source: "DB_INSERT",
    // driveSummary.sheetTitle/processedDataRows, tableSummary.owner/tableName/columnsUsed, insertResult { ok, code: "OK", inserted } }.
    // Intentional (parity-review-all T8): the whole load is one transaction.
    [Fact]
    public async Task CargaDriveDinamica_Load_InsertsSelectedColumnsWithLegacyValueRules()
    {
        using var factory = new ConfiguracionFactory();
        factory.Sheets.Headers = ["ID", "VALOR", "NOTA"];
        factory.Sheets.Rows =
        [
            new() { ["ID"] = "1", ["VALOR"] = "12,5", ["NOTA"] = "  texto  " },
            new() { ["ID"] = "2", ["VALOR"] = "", ["NOTA"] = "otro" }
        ];
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"Hoja 1","owner":"SUI","tableName":"TGEN_A","previewOnly":false,"selectedColumns":["valor","id","nota"]}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, body.GetProperty("status").GetInt32());
        var data = body.GetProperty("data");
        Assert.True(data.GetProperty("ok").GetBoolean());
        Assert.Equal("DB_INSERT", data.GetProperty("source").GetString());
        Assert.Equal("Hoja 1", data.GetProperty("driveSummary").GetProperty("sheetTitle").GetString());
        Assert.Equal(2, data.GetProperty("driveSummary").GetProperty("processedDataRows").GetInt32());
        Assert.Equal("SUI", data.GetProperty("tableSummary").GetProperty("owner").GetString());
        Assert.Equal("TGEN_A", data.GetProperty("tableSummary").GetProperty("tableName").GetString());
        Assert.Equal(["VALOR", "ID", "NOTA"], Strings(data.GetProperty("tableSummary").GetProperty("columnsUsed")));
        Assert.True(data.GetProperty("insertResult").GetProperty("ok").GetBoolean());
        Assert.Equal("OK", data.GetProperty("insertResult").GetProperty("code").GetString());
        Assert.Equal(2, data.GetProperty("insertResult").GetProperty("inserted").GetInt32());

        var insert = Assert.Single(factory.Repository.Inserts);
        Assert.Equal("TGEN_A", insert.Table);
        Assert.Equal(["VALOR", "ID", "NOTA"], insert.Columns);
        Assert.Equal(new object?[] { 12.5m, 1m, "texto" }, insert.Rows[0]);
        Assert.Equal(new object?[] { null, 2m, "otro" }, insert.Rows[1]);
    }

    // Legacy cargueGenerico.vue:onSubmit sends { sheetId, sheetTitle, owner, tableName, selectedColumns } with no
    // previewOnly; legacy controller.js:1131 treats the missing flag as "load".
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, request field consumed consistently by the new
    // screen, which always sends previewOnly): without the flag the new API only previews and inserts nothing.
    [Fact]
    public async Task CargaDriveDinamica_WithoutPreviewOnly_OnlyPreviews()
    {
        using var factory = new ConfiguracionFactory();
        factory.Sheets.Headers = ["ID"];
        factory.Sheets.Rows = [new() { ["ID"] = "1" }];
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"Hoja 1","owner":"SUI","tableName":"TGEN_A","selectedColumns":["ID"]}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("PREVIEW", body.GetProperty("data").GetProperty("source").GetString());
        Assert.Equal("PREVIEW", body.GetProperty("data").GetProperty("mode").GetString());
        Assert.Empty(factory.Repository.Inserts);
    }

    // Legacy controller.js:1373-1395: the load summary echoes driveSummary.totalRowsMeta/chunkSize (5000)/batchSize
    // (2000), tableSummary.useExecuteMany (database.js exports executeMany → true) and insertResult.message
    // "Carga completada con insert masivo (executeMany)."; cargueGenerico.vue shows the whole JSON under
    // "Detalle de respuesta (backend completo)".
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, load summary shape): the new API loads in one
    // transaction, so it reports no chunk/batch sizes, useExecuteMany=false and insertResult.message "Carga completada.".
    [Fact]
    public async Task CargaDriveDinamica_Load_ReportsTheNewSummaryFields()
    {
        using var factory = new ConfiguracionFactory();
        factory.Sheets.Headers = ["ID"];
        factory.Sheets.Rows = [new() { ["ID"] = "1" }];
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"Hoja 1","owner":"SUI","tableName":"TGEN_A","previewOnly":false}"""));
        var data = (await Read(response)).GetProperty("data");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(data.GetProperty("driveSummary").TryGetProperty("chunkSize", out _));
        Assert.False(data.GetProperty("driveSummary").TryGetProperty("batchSize", out _));
        Assert.False(data.GetProperty("driveSummary").TryGetProperty("totalRowsMeta", out _));
        Assert.Equal(1, data.GetProperty("driveSummary").GetProperty("processedDataRows").GetInt32());
        Assert.False(data.GetProperty("tableSummary").GetProperty("useExecuteMany").GetBoolean());
        Assert.Equal("Carga completada.", data.GetProperty("insertResult").GetProperty("message").GetString());
        Assert.Single(factory.Repository.Inserts);
    }

    // Legacy controller.js:1222-1226: selectedColumns not present in both sheet and table are silently dropped and
    // the remaining columns are loaded (the legacy screen lets the user tick "No existe ⚠" headers).
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, stricter input validation): the API rejects a
    // non-common selected column with 400 and inserts nothing; the new screen only sends the common ones.
    [Fact]
    public async Task CargaDriveDinamica_Load_RejectsNonCommonSelectedColumns()
    {
        using var factory = new ConfiguracionFactory();
        factory.Sheets.Headers = ["ID", "EXTRA"];
        factory.Sheets.Rows = [new() { ["ID"] = "1", ["EXTRA"] = "x" }];
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"Hoja 1","owner":"SUI","tableName":"TGEN_A","previewOnly":false,"selectedColumns":["ID","EXTRA"]}"""));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("INVALID_PARAMS", (await Read(response)).GetProperty("data").GetProperty("code").GetString());
        Assert.Empty(factory.Repository.Inserts);
    }

    // Intentional deviation (parity-review-all T8, 30006 "strict numbers"): legacy controller.js:1307-1311 stored an
    // unparseable NUMBER cell as null; the new API rejects the load and inserts nothing.
    [Fact]
    public async Task CargaDriveDinamica_Load_InvalidNumberIsRejectedWithoutInsert()
    {
        using var factory = new ConfiguracionFactory();
        factory.Sheets.Headers = ["ID"];
        factory.Sheets.Rows = [new() { ["ID"] = "uno" }];
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"Hoja 1","owner":"SUI","tableName":"TGEN_A","previewOnly":false}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(400, body.GetProperty("status").GetInt32());
        Assert.False(body.GetProperty("data").GetProperty("ok").GetBoolean());
        Assert.Equal("INVALID_PARAMS", body.GetProperty("data").GetProperty("code").GetString());
        Assert.Empty(factory.Repository.Inserts);
    }

    // Intentional deviation (parity-review-all T8, 30006 "SUI-only"): legacy accepted any owner (controller.js:1074);
    // the new API only loads into the SUI schema and never reads columns of another schema.
    [Fact]
    public async Task CargaDriveDinamica_OwnerOtherThanSui_IsRejectedBeforeDataAccess()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"Hoja 1","owner":"RELIQ","tableName":"TGEN_A","previewOnly":true}"""));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.Repository.Calls);
        Assert.Empty(factory.Sheets.Calls);
    }

    // Legacy controller.js:1052-1072: missing sheetTitle → 400 and nothing is read.
    [Fact]
    public async Task CargaDriveDinamica_MissingSheetTitle_Returns400WithoutDataAccess()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"","owner":"SUI","tableName":"TGEN_A","previewOnly":true}"""));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.Repository.Calls);
        Assert.Empty(factory.Sheets.Calls);
    }

    // Legacy controller.js:1061-1072: the 400 body is { status: 400, data: { ok: false, source: "PARAMS",
    // code: "INVALID_PARAMS", message: "Parámetros inválidos para cargaDriveDinamica.", errors: ["sheetTitle es obligatorio."] } }.
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, validation payload shape): the new API answers
    // { ok: false, code: "INVALID_PARAMS", message: "sheetTitle es obligatorio." } without source/errors.
    [Fact]
    public async Task CargaDriveDinamica_MissingSheetTitle_UsesTheNewValidationPayload()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "cargaDriveDinamica",
            Json("""{"sheetId":"abc","sheetTitle":"","owner":"SUI","tableName":"TGEN_A","previewOnly":true}"""));
        var data = (await Read(response)).GetProperty("data");

        Assert.False(data.GetProperty("ok").GetBoolean());
        Assert.Equal("INVALID_PARAMS", data.GetProperty("code").GetString());
        Assert.Equal("sheetTitle es obligatorio.", data.GetProperty("message").GetString());
        Assert.False(data.TryGetProperty("errors", out _));
    }

    // ---------------------------------------------------------------- truncateTable

    // Legacy configuracion/routes.js:6-9 + controller.js:6-59: TRUNCATE TABLE OWNER.TABLE (upper-cased) →
    // { status: 200, data: { ok: true, ... } }; cargueGenerico.vue checks data.ok === true before loading.
    [Fact]
    public async Task TruncateTable_TruncatesTheSuiTable()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "truncateTable", Json("""{"owner":"sui","tableName":"tgen_a","confirm":true}"""));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, body.GetProperty("status").GetInt32());
        Assert.True(body.GetProperty("data").GetProperty("ok").GetBoolean());
        Assert.Equal(["Truncate:TGEN_A"], factory.Repository.Calls);
    }

    // Legacy controller.js:36-46: success message "Tabla truncada correctamente: SUI.TGEN_A" (shown in the
    // "Detalle de respuesta" JSON block of cargueGenerico.vue).
    // Accepted deviation: legacy-characterization-tests S8/S9 (group D, API-only payload): cargueGenerico.vue:onSubmit
    // overwrote rawBackend with the insert response right after truncating, so the message was never on screen; the
    // new payload is { ok: true, source: "DB_TRUNCATE", owner: "SUI", tableName }.
    [Fact]
    public async Task TruncateTable_ReturnsTheNewSuccessPayload()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "truncateTable", Json("""{"owner":"SUI","tableName":"TGEN_A","confirm":true}"""));
        var data = (await Read(response)).GetProperty("data");

        Assert.True(data.GetProperty("ok").GetBoolean());
        Assert.Equal("DB_TRUNCATE", data.GetProperty("source").GetString());
        Assert.Equal("SUI", data.GetProperty("owner").GetString());
        Assert.Equal("TGEN_A", data.GetProperty("tableName").GetString());
        Assert.False(data.TryGetProperty("message", out _));
    }

    // Legacy configuracionService.js:9-20 sends only { owner, tableName } and controller.js:6-59 truncates.
    // Accepted deviation: odd/tasks/sui853-carga-generica.md (group E, "truncate requires explicit confirmation"):
    // without confirm:true the API answers 400 and truncates nothing.
    [Fact]
    public async Task TruncateTable_LegacyPayloadWithoutConfirm_IsRejected()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "truncateTable", Json("""{"owner":"SUI","tableName":"TGEN_A"}"""));
        var data = (await Read(response)).GetProperty("data");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Se requiere confirmación explícita para vaciar la tabla.", data.GetProperty("message").GetString());
        Assert.Empty(factory.Repository.Calls);
    }

    // Legacy controller.js:11-33: missing owner/tableName or names outside [A-Z0-9_] → 400 and nothing is truncated.
    [Theory]
    [InlineData("""{"owner":"SUI","tableName":"","confirm":true}""")]
    [InlineData("""{"owner":"SUI","tableName":"TGEN_A; DROP TABLE X","confirm":true}""")]
    public async Task TruncateTable_InvalidNames_Return400WithoutTruncate(string json)
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "truncateTable", Json(json));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.Repository.Calls);
    }

    // ---------------------------------------------------------------- getFormularios / updateFormulario

    // Legacy controller.js:160-178: SELECT of the 14 SUI.CFG_COLUMNA columns → { status: 200, data: rows } with the
    // Oracle column names as JSON keys (formularios.vue binds field="FORMATO" ... field="ORDEN_DATA").
    [Fact]
    public async Task GetFormularios_ReturnsTheFourteenUppercaseColumns()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "getFormularios", Json("{}"));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, body.GetProperty("status").GetInt32());
        var row = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(
            ["FORMATO", "SECCION", "FIELD", "HEADER_TXT", "BACKGROUND_COLOR", "FILTER_FLAG", "FORMATO_DATO", "DECIMALES",
             "ALINEACION", "TOOLTIP", "MOSTRAR_HEADER", "INCLUIR_DATA", "ORDEN_HEADER", "ORDEN_DATA"],
            row.EnumerateObject().Select(p => p.Name));
        Assert.Equal("F853S105", row.GetProperty("FORMATO").GetString());
        Assert.Equal(2, row.GetProperty("DECIMALES").GetInt32());
        Assert.Equal(["List"], factory.Formularios.Calls);
    }

    // Legacy controller.js:65-158: updateFormulario receives the row with its legacy keys, updates by
    // FORMATO/SECCION/FIELD and answers { status: 200, data: <reloaded row> }.
    [Fact]
    public async Task UpdateFormulario_PassesTheLegacyRowAndReturnsTheReloadedRow()
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "updateFormulario", Json("""
            {"FORMATO":"F853S105","SECCION":"SIN_MOVIMIENTO","FIELD":"VALOR","HEADER_TXT":"Valor nuevo","BACKGROUND_COLOR":"R",
             "FILTER_FLAG":"N","FORMATO_DATO":"numero","DECIMALES":3,"ALINEACION":"der","TOOLTIP":"Ayuda","MOSTRAR_HEADER":"S",
             "INCLUIR_DATA":"N","ORDEN_HEADER":4,"ORDEN_DATA":5}
            """));
        var body = await Read(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(200, body.GetProperty("status").GetInt32());
        Assert.Equal("Valor nuevo", body.GetProperty("data").GetProperty("HEADER_TXT").GetString());
        Assert.Equal(3, body.GetProperty("data").GetProperty("DECIMALES").GetInt32());
        var submitted = Assert.Single(factory.Formularios.Updates);
        Assert.Equal(("F853S105", "SIN_MOVIMIENTO", "VALOR"), (submitted.FORMATO, submitted.SECCION, submitted.FIELD));
        Assert.Equal(("Valor nuevo", "R", "N", "numero", 3), (submitted.HEADER_TXT, submitted.BACKGROUND_COLOR, submitted.FILTER_FLAG, submitted.FORMATO_DATO, submitted.DECIMALES));
        Assert.Equal(("der", "Ayuda", "S", "N", 4, 5), (submitted.ALINEACION, submitted.TOOLTIP, submitted.MOSTRAR_HEADER, submitted.INCLUIR_DATA, submitted.ORDEN_HEADER, submitted.ORDEN_DATA));
    }

    // Legacy controller.js:129-131: rowsAffected === 0 → HTTP 404.
    [Fact]
    public async Task UpdateFormulario_UnknownRow_Returns404()
    {
        using var factory = new ConfiguracionFactory();
        factory.Formularios.Found = false;
        using var client = factory.Client();

        var response = await client.PostAsync(Base + "updateFormulario", Json("""
            {"FORMATO":"X","SECCION":"Y","FIELD":"Z","HEADER_TXT":"H","BACKGROUND_COLOR":"G","FILTER_FLAG":"S","FORMATO_DATO":"texto",
             "DECIMALES":null,"ALINEACION":"izq","TOOLTIP":null,"MOSTRAR_HEADER":"S","INCLUIR_DATA":"S","ORDEN_HEADER":0,"ORDEN_DATA":0}
            """));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(404, (await Read(response)).GetProperty("status").GetInt32());
        Assert.Single(factory.Formularios.Updates);
    }

    // Legacy routes.js had no system check (every SUI853 route was anonymous). Token required is an approved
    // deviation (S10); restricting these screens' APIs to tokens of system 3 is not recorded for 30003/30006.
    [Theory]
    [InlineData("getFormularios")]
    [InlineData("tablasSui")]
    public async Task ValidTokenOfAnotherSystem_IsServedLikeLegacy(string route)
    {
        using var factory = new ConfiguracionFactory();
        using var client = factory.Client(idSistema: 10);

        var response = await client.PostAsync(Base + route, Json("{}"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static StringContent Json(string json) => new(json, Encoding.UTF8, "application/json");

    private static string[] Strings(JsonElement array) => array.EnumerateArray().Select(e => e.GetString()!).ToArray();

    private static async Task<JsonElement> Read(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
}

file sealed class ConfiguracionFactory : WebApplicationFactory<Program>
{
    public StubCargaRepository Repository { get; } = new();
    public StubSheets Sheets { get; } = new();
    public StubFormularios Formularios { get; } = new();

    public HttpClient Client(int idSistema = 3)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(TestJwt.AdminSisuId, idSistema));
        return client;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<ICargaGenericaRepository>();
            services.AddSingleton<ICargaGenericaRepository>(Repository);
            services.RemoveAll<IGoogleSheetsService>();
            services.AddSingleton<IGoogleSheetsService>(Sheets);
            services.RemoveAll<IFormulariosRepository>();
            services.AddSingleton<IFormulariosRepository>(Formularios);
        });
    }
}

file sealed record InsertCall(string Table, string[] Columns, IReadOnlyList<object?[]> Rows);

file sealed class StubCargaRepository : ICargaGenericaRepository
{
    public List<string> Calls { get; } = [];
    public List<InsertCall> Inserts { get; } = [];

    public Task<IReadOnlyList<string>> TablesAsync(CancellationToken ct)
    {
        Calls.Add("Tables");
        return Task.FromResult<IReadOnlyList<string>>(["TGEN_A", "TGEN_B"]);
    }

    public Task<IReadOnlyList<CargaColumn>> ColumnsAsync(string table, CancellationToken ct)
    {
        Calls.Add("Columns:" + table);
        return Task.FromResult<IReadOnlyList<CargaColumn>>(
            [new("ID", "NUMBER", 1), new("VALOR", "NUMBER", 2), new("NOTA", "VARCHAR2", 3)]);
    }

    public Task<int> InsertAsync(string table, IReadOnlyList<CargaColumn> columns, IReadOnlyList<object?[]> rows, CancellationToken ct)
    {
        Calls.Add("Insert:" + table);
        Inserts.Add(new InsertCall(table, columns.Select(c => c.COLUMN_NAME).ToArray(), rows));
        return Task.FromResult(rows.Count);
    }

    public Task TruncateAsync(string table, CancellationToken ct)
    {
        Calls.Add("Truncate:" + table);
        return Task.CompletedTask;
    }
}

file sealed class StubSheets : IGoogleSheetsService
{
    public List<string> Calls { get; } = [];
    public IReadOnlyList<GoogleSheetMetadata> Metadata { get; set; } = [new(7, "Hoja 1", 0, 120, 26)];
    public IReadOnlyList<string> Headers { get; set; } = ["ID"];
    public IReadOnlyList<Dictionary<string, object?>> Rows { get; set; } = [];

    public Task<IReadOnlyList<GoogleSheetMetadata>> ListMetadataAsync(string spreadsheetId, CancellationToken cancellationToken)
    {
        Calls.Add("ListMetadata:" + spreadsheetId);
        return Task.FromResult(Metadata);
    }

    public Task<IReadOnlyList<string>> ReadHeadersAsync(string spreadsheetId, string tabTitle, CancellationToken cancellationToken)
    {
        Calls.Add($"ReadHeaders:{spreadsheetId}:{tabTitle}");
        return Task.FromResult(Headers);
    }

    public Task<IReadOnlyList<string>> ListTabTitlesAsync(string spreadsheetId, CancellationToken cancellationToken)
        => throw new InvalidOperationException("Not used by carga genérica.");

    public Task<GoogleSheetTabData> ReadTabAsync(string spreadsheetId, string tabTitle, CancellationToken cancellationToken)
    {
        Calls.Add($"ReadTab:{spreadsheetId}:{tabTitle}");
        return Task.FromResult(new GoogleSheetTabData { SheetTitle = tabTitle, Columns = Headers, Rows = Rows });
    }
}

file sealed class StubFormularios : IFormulariosRepository
{
    public List<string> Calls { get; } = [];
    public List<FormularioRow> Updates { get; } = [];
    public bool Found { get; set; } = true;

    public Task<IReadOnlyList<FormularioRow>> ListAsync(CancellationToken cancellationToken)
    {
        Calls.Add("List");
        return Task.FromResult<IReadOnlyList<FormularioRow>>([new FormularioRow
        {
            FORMATO = "F853S105", SECCION = "SIN_MOVIMIENTO", FIELD = "VALOR", HEADER_TXT = "Valor", BACKGROUND_COLOR = "G",
            FILTER_FLAG = "S", FORMATO_DATO = "numero", DECIMALES = 2, ALINEACION = "der", TOOLTIP = null,
            MOSTRAR_HEADER = "S", INCLUIR_DATA = "S", ORDEN_HEADER = 1, ORDEN_DATA = 1
        }]);
    }

    public Task<FormularioRow?> UpdateAsync(FormularioRow row, CancellationToken cancellationToken)
    {
        Calls.Add("Update");
        Updates.Add(row);
        return Task.FromResult(Found ? row : null);
    }
}
