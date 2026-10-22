using System.Data;
using System.Data.Common;
using System.Text;
using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.GoogleDrive;
using Veolia.Api.Modules.Sui853.Configuracion;

namespace Veolia.Api.Tests;

/// <summary>
/// SUI853 Drive loads 30004 (Cargue Residuos), 30005/30007 (Cargue Facturación [Mes]).
/// Legacy: back-tarificador/src/helpers/readFolder.js (harvest), sui853/configuracion/controller.js
/// postCargueResiduos / postCargueInformes. Google and Oracle are always stubbed here.
/// </summary>
public sealed class Sui853DriveLoadsTests
{
    private const string ResiduosTab = "Hoja SUI Recolección";

    // ---------------------------------------------------------------- harvest (readFolder.js)

    [Fact]
    public async Task HarvestFiltersRootSpreadsheetsByApsNameAndYearIgnoringCaseAndReadsTabByTitleIgnoringCase()
    {
        var drive = new FakeDrive();
        drive.Sheets["root"] = [new("f1", "Salamina-SUI Marzo 2024"), new("f2", "SALAMINA 2023"), new("f3", "Palmira 2024")];
        drive.Tabs["f1"] = ["Otra", "hoja sui recolección"];
        drive.Rows["f1|hoja sui recolección"] = [new() { ["NUAP"] = "N1" }];

        var files = await new GoogleDriveHarvestService(drive)
            .HarvestAsync(new DriveHarvestRequest("root", ResiduosTab, "salamina", "2024"), default);

        var file = Assert.Single(files);
        Assert.Null(file.MonthFolder);
        Assert.Equal("Salamina-SUI Marzo 2024", file.FileName);
        Assert.Null(file.Error);
        Assert.Equal("hoja sui recolección", file.Tab!.SheetTitle);
        Assert.Equal("N1", file.Tab.Rows[0]["NUAP"]);
        Assert.Equal(["f1|hoja sui recolección"], drive.Reads);
    }

    [Fact]
    public async Task HarvestWalksSubfoldersInSpanishNumericOrderWithoutReadingRootFiles()
    {
        var drive = new FakeDrive();
        drive.Folders["root"] = [new("d10", "10 Octubre"), new("d2", "2 Febrero"), new("d1", "1 Enero")];
        drive.Sheets["root"] = [new("root-file", "Salamina 2024")];
        foreach (var (folder, file) in new[] { ("d10", "x10"), ("d2", "x2"), ("d1", "x1") })
        {
            drive.Sheets[folder] = [new(file, "Salamina 2024")];
            drive.Tabs[file] = [ResiduosTab];
        }

        var files = await new GoogleDriveHarvestService(drive)
            .HarvestAsync(new DriveHarvestRequest("root", ResiduosTab, "Salamina", "2024"), default);

        Assert.Equal(["1 Enero", "2 Febrero", "10 Octubre"], files.Select(f => f.MonthFolder));
        Assert.DoesNotContain(files, f => f.FileId == "root-file");
    }

    // V3 (verifier): facturación folders are not necessarily named by month, so the month filter must
    // not skip subfolders; it applies to the file names only.
    [Fact]
    public async Task HarvestMonthFilterAppliesToFileNamesOnlyNotSubfolders()
    {
        var drive = new FakeDrive();
        drive.Folders["root"] = [new("d1", "Facturacion 2024"), new("d2", "Otros")];
        drive.Sheets["d1"] = [new("e1", "Salamina Enero 2024"), new("f1", "Salamina Febrero 2024")];
        drive.Sheets["d2"] = [new("f2", "Salamina 2024")];
        drive.Tabs["e1"] = drive.Tabs["f1"] = drive.Tabs["f2"] = [ResiduosTab];

        var files = await new GoogleDriveHarvestService(drive)
            .HarvestAsync(new DriveHarvestRequest("root", ResiduosTab, "Salamina", "2024", "febrero"), default);

        Assert.Equal(["f1"], files.Select(f => f.FileId));
    }

    [Fact]
    public async Task HarvestReportsMissingTabAndUnreadableFileWithoutAborting()
    {
        var drive = new FakeDrive();
        drive.Sheets["root"] = [new("ok", "Salamina 2024 a"), new("boom", "Salamina 2024 b")];
        drive.Tabs["ok"] = ["Otra"];
        drive.Failing.Add("boom");

        var files = await new GoogleDriveHarvestService(drive)
            .HarvestAsync(new DriveHarvestRequest("root", ResiduosTab, "Salamina", "2024"), default);

        Assert.Equal(2, files.Count);
        Assert.Equal($"Sheet \"{ResiduosTab}\" not found", files[0].Tab!.Error);
        Assert.Empty(files[0].Tab!.Rows);
        Assert.NotNull(files[1].Error);
        Assert.Null(files[1].Tab);
    }

    [Theory]
    [InlineData("root", "Tab", "", "2024")]
    [InlineData("root", "Tab", "Salamina", "")]
    [InlineData("root", "Tab", "Salamina", "dos mil")]
    [InlineData("", "Tab", "Salamina", "2024")]
    [InlineData("root", " ", "Salamina", "2024")]
    public async Task HarvestRejectsLegacyInvalidParameters(string folder, string tab, string name, string year)
        => await Assert.ThrowsAsync<ArgumentException>(() => new GoogleDriveHarvestService(new FakeDrive())
            .HarvestAsync(new DriveHarvestRequest(folder, tab, name, year), default));

    [Fact]
    public void OptionsDefaultToLegacyFoldersAndTabs()
    {
        var options = new GoogleDriveOptions();
        Assert.Equal("1X28TgHTNi4DxiA1LYEMnQlo9xqA8KV9s", options.ResiduosFolderId);
        Assert.Equal("Hoja SUI Recolección", options.ResiduosSheetTitle);
        Assert.Equal("1vZpbi42JtUrRJwMBMN2ujgX2ZS40qbxN", options.FacturacionFolderId);
        Assert.Equal("sui-facturacion", options.FacturacionSheetTitle);
    }

    // ---------------------------------------------------------------- column maps

    [Fact]
    public void ResiduosTargetKeepsLegacyColumnsAndServerSideAuditValues()
    {
        Assert.Equal("TGEN_RESGENERADOS", DriveLoadTarget.Residuos.Table);
        Assert.Equal(["APS", "NOMAPS", "ANNO", "MES", "NUAP", "TIP_SITIO", "NRO_SITIO", "PLACA", "FEC_ENTRADA",
            "HOR_ENTRADA", "HOR_SALIDA", "NUM_MICRO", "TON_RBU", "TON_RBR", "TON_RSOU", "TON_RSOR", "SIS_MEDICION"],
            DriveLoadTarget.Residuos.Columns);
        Assert.Equal(new[]
        {
            ("VLR_PEAJES", "0"), ("FEC_REGIST", "SYSDATE"), ("USU_REG", "SYS_CONTEXT('USERENV','SESSION_USER')")
        }, DriveLoadTarget.Residuos.Constants);
    }

    [Fact]
    public void ResiduosRowsMapLegacyHeadersWithParsedDateAndMonthFromDate()
    {
        var rows = Sui853DriveLoadMapper.MapResiduos(7, "Salamina", 2024, [File("Salamina 2024", ResiduosTab, ResiduoRow())]);

        var row = Assert.Single(rows);
        Assert.Equal(new DriveLoadPeriod(7, 2024, 3), row.Period);
        Assert.Equal(2, row.RowNumber);
        var expected = new Dictionary<string, object?>
        {
            ["APS"] = 7L, ["NOMAPS"] = "Salamina", ["ANNO"] = 2024, ["MES"] = 3, ["NUAP"] = "N1", ["TIP_SITIO"] = "Relleno",
            ["NRO_SITIO"] = "S1", ["PLACA"] = "ABC123", ["FEC_ENTRADA"] = new DateTime(2024, 3, 15), ["HOR_ENTRADA"] = "07:00",
            ["HOR_SALIDA"] = "08:30", ["NUM_MICRO"] = "1001", ["TON_RBU"] = 1.5m, ["TON_RBR"] = 2m, ["TON_RSOU"] = 3.25m,
            ["TON_RSOR"] = 0m, ["SIS_MEDICION"] = 1m
        };
        foreach (var (column, value) in expected) Assert.Equal(value, Value(DriveLoadTarget.Residuos, row, column));
    }

    [Fact]
    public void ResiduosRowWithoutDateKeepsLegacyNullDateAndMonthZero()
    {
        var source = ResiduoRow(); source["FECHA ENTRADA"] = "";
        var row = Assert.Single(Sui853DriveLoadMapper.MapResiduos(7, "Salamina", 2024, [File("Salamina 2024", ResiduosTab, source)]));
        Assert.Null(Value(DriveLoadTarget.Residuos, row, "FEC_ENTRADA"));
        Assert.Equal(new DriveLoadPeriod(7, 2024, 0), row.Period);
    }

    [Theory]
    [InlineData("15-03-2024", 2024, 3, 15)]
    [InlineData("5-3-2024", 2024, 3, 5)]
    [InlineData("15/03/2024", 2024, 3, 15)]
    public void DatesAcceptLegacyDayMonthYearText(string text, int year, int month, int day)
        => Assert.Equal(new DateTime(year, month, day), Sui853DriveLoadMapper.ParseDate(text, Context("FECHA ENTRADA", "FEC_ENTRADA")));

    [Fact]
    public void DatesAcceptSheetsSerialNumbers()
        => Assert.Equal(new DateTime(2025, 1, 1), Sui853DriveLoadMapper.ParseDate(45658L, Context("FECHA ENTRADA", "FEC_ENTRADA")));

    [Fact]
    public void InvalidDateIsAValidationErrorNamingFieldAndRow()
    {
        var source = ResiduoRow(); source["FECHA ENTRADA"] = "2024-13-45";
        var ex = Assert.Throws<DriveLoadValidationException>(() =>
            Sui853DriveLoadMapper.MapResiduos(7, "Salamina", 2024, [File("Salamina 2024", ResiduosTab, ResiduoRow(), source)]));
        Assert.Equal(("FECHA ENTRADA", "FEC_ENTRADA", 3), (ex.Campo, ex.Columna, ex.RowNumber));
    }

    [Fact]
    public void ComercialTargetMapsAll59LegacyColumnsIncludingDuplicatedDcsdfSource()
    {
        var columns = DriveLoadTarget.Comercial.Columns;
        Assert.Equal("TGEN_COMERCIAL", DriveLoadTarget.Comercial.Table);
        Assert.Equal(59, columns.Count);
        Assert.Empty(DriveLoadTarget.Comercial.Constants);
        Assert.Equal(["APS", "NOMAPS", "EMPRESA", "ANNO", "MES"], columns.Take(5));

        var source = new Dictionary<string, object?>();
        foreach (var (_, header) in ComercialTextMap) source[header] = "v_" + header;
        var n = 1;
        foreach (var (_, header) in ComercialNumberMap) source[header] = n++;
        source["F_EMISION"] = "05-01-2024";
        source["FINIPER"] = "1/12/2023";

        var row = Assert.Single(Sui853DriveLoadMapper.MapComercial(7, "Salamina", "Veolia Aseo Salamina", 2024,
            [File("Salamina-SUI Diciembre 2023", "sui-facturacion", source)]));

        Assert.Equal(new DriveLoadPeriod(7, 2023, 12), row.Period);
        Assert.Equal(7L, Value(DriveLoadTarget.Comercial, row, "APS"));
        Assert.Equal("Salamina", Value(DriveLoadTarget.Comercial, row, "NOMAPS"));
        Assert.Equal("Veolia Aseo Salamina", Value(DriveLoadTarget.Comercial, row, "EMPRESA"));
        Assert.Equal(2023, Value(DriveLoadTarget.Comercial, row, "ANNO"));
        Assert.Equal(12, Value(DriveLoadTarget.Comercial, row, "MES"));
        Assert.Equal(new DateTime(2024, 1, 5), Value(DriveLoadTarget.Comercial, row, "FECHAEXA"));
        Assert.Equal(new DateTime(2023, 12, 1), Value(DriveLoadTarget.Comercial, row, "FECHAINI"));
        foreach (var (column, header) in ComercialTextMap)
            Assert.Equal("v_" + header, Value(DriveLoadTarget.Comercial, row, column));
        foreach (var (column, header) in ComercialNumberMap)
            Assert.Equal(Convert.ToDecimal(source[header]), Value(DriveLoadTarget.Comercial, row, column));
        // Legacy quirk kept on purpose: DEVFEXCOE and DTOXCOMP both read D_CSDF.
        Assert.Equal(Value(DriveLoadTarget.Comercial, row, "DTOXCOMP"), Value(DriveLoadTarget.Comercial, row, "DEVFEXCOE"));
        var mapped = new[] { "APS", "NOMAPS", "EMPRESA", "ANNO", "MES", "FECHAEXA", "FECHAINI" }
            .Concat(ComercialTextMap.Select(m => m.Column)).Concat(ComercialNumberMap.Select(m => m.Column));
        Assert.Equal(columns.OrderBy(c => c), mapped.OrderBy(c => c));
    }

    [Theory]
    [InlineData("Salamina-SUI Diciembre 2024", 2024, 12)]
    [InlineData("Salamina SUI Septiembre 2023", 2023, 9)]
    [InlineData("Salamina SUI Setiembre 2023", 2023, 9)]
    [InlineData("Salamina SUI ABRIL 2022", 2022, 4)]
    [InlineData("Salamina SUI Mayo", null, null)]
    [InlineData("Salamina facturacion 2024", 2024, null)]
    public void FileNameProvidesLegacyYearAndMonth(string fileName, int? year, int? month)
        => Assert.Equal((year, month), Sui853DriveLoadMapper.ParseFileName(fileName));

    [Fact]
    public void ComercialFallsBackToRequestedYearAndMonthZeroWhenFileNameHasNoPeriod()
    {
        var row = Assert.Single(Sui853DriveLoadMapper.MapComercial(7, "Salamina", "Veolia", 2024,
            [File("Salamina facturacion", "sui-facturacion", new Dictionary<string, object?>())]));
        Assert.Equal(new DriveLoadPeriod(7, 2024, 0), row.Period);
    }

    [Theory]
    [InlineData(null, 0)]
    [InlineData("", 0)]
    [InlineData("   ", 0)]
    [InlineData("12.5", 12.5)]
    [InlineData(" 7 ", 7)]
    [InlineData(true, 1)]
    [InlineData(3L, 3)]
    [InlineData(2.25d, 2.25)]
    public void SafeNumberKeepsLegacyBlankAsZeroRule(object? value, double expected)
        => Assert.Equal((decimal)expected, Sui853DriveLoadMapper.SafeNumber(value, Context("TRLU", "TRLU")));

    [Theory]
    [InlineData("12,5")]
    [InlineData("abc")]
    public void SafeNumberRejectsNonNumericValuesNamingFieldAndRow(string value)
    {
        var source = new Dictionary<string, object?> { ["TRLU"] = value };
        var ex = Assert.Throws<DriveLoadValidationException>(() => Sui853DriveLoadMapper.MapComercial(7, "Salamina", "Veolia", 2024,
            [File("Salamina Enero 2024", "sui-facturacion", new Dictionary<string, object?>(), source)]));
        Assert.Equal("TRLU", ex.Campo);
        Assert.Equal("TRLU", ex.Columna);
        Assert.Equal(value, ex.Valor);
        Assert.Equal(3, ex.RowNumber);
        Assert.Equal("Salamina Enero 2024", ex.FileName);
        Assert.Equal("sui-facturacion", ex.SheetTitle);
        Assert.Equal($"Valor no numérico en 'TRLU' ({value}) en archivo Salamina Enero 2024, hoja sui-facturacion, fila 3.", ex.Message);
    }

    // ---------------------------------------------------------------- controller

    [Fact]
    public async Task CargueResiduosHarvestsConfiguredFolderAndReplacesExactPeriods()
    {
        var repo = new SpyRepository(); var harvest = new StubHarvest();
        var second = ResiduoRow(); second["FECHA ENTRADA"] = "02-04-2024";
        harvest.Files = [File("Salamina 2024", ResiduosTab, ResiduoRow(), ResiduoRow(), second)];

        var result = Assert.IsType<OkObjectResult>(await Controller(repo, harvest).CargueResiduos(new(7, 2024), default));

        Assert.Equal(new DriveHarvestRequest("1X28TgHTNi4DxiA1LYEMnQlo9xqA8KV9s", ResiduosTab, "Salamina", "2024", null), harvest.Request);
        Assert.Same(DriveLoadTarget.Residuos, repo.Target);
        Assert.Equal([new DriveLoadPeriod(7, 2024, 3), new DriveLoadPeriod(7, 2024, 4)], repo.Periods);
        Assert.Equal(3, repo.Rows!.Count);
        var data = Json(result).GetProperty("data");
        Assert.True(data.GetProperty("ok").GetBoolean());
        Assert.Equal(1, data.GetProperty("count").GetInt32());
        Assert.Equal(3, data.GetProperty("inserted").GetInt32());
        Assert.Equal(3, data.GetProperty("files")[0].GetProperty("rows").GetInt32());
    }

    [Fact]
    public async Task CargueFacturacionForwardsMonthFilterAndUsesRealCompany()
    {
        var repo = new SpyRepository(); var harvest = new StubHarvest();
        harvest.Files = [File("Salamina-SUI Abril 2024", "sui-facturacion", new Dictionary<string, object?> { ["TRLU"] = 1 })];

        Assert.IsType<OkObjectResult>(await Controller(repo, harvest).CargueFacturacion(new(7, 2024, "abril"), default));

        Assert.Equal(new DriveHarvestRequest("1vZpbi42JtUrRJwMBMN2ujgX2ZS40qbxN", "sui-facturacion", "Salamina", "2024", "Abril"), harvest.Request);
        Assert.Same(DriveLoadTarget.Comercial, repo.Target);
        Assert.Equal([new DriveLoadPeriod(7, 2024, 4)], repo.Periods);
        Assert.Equal("Veolia Aseo Salamina", repo.Rows![0][DriveLoadTarget.Comercial.Columns.ToList().IndexOf("EMPRESA")]);
    }

    [Fact]
    public async Task CargueFacturacionWithoutMonthHarvestsTheWholeYear()
    {
        var repo = new SpyRepository(); var harvest = new StubHarvest();
        harvest.Files = [File("Salamina-SUI Abril 2024", "sui-facturacion", new Dictionary<string, object?> { ["TRLU"] = 1 })];
        Assert.IsType<OkObjectResult>(await Controller(repo, harvest).CargueFacturacion(new(7, 2024), default));
        Assert.Null(harvest.Request!.Month);
    }

    // V3 safety net: a month load (30007) can only replace the requested month, whatever the harvest returns.
    [Fact]
    public async Task MonthLoadOnlyReplacesRequestedMonth()
    {
        var repo = new SpyRepository(); var harvest = new StubHarvest();
        harvest.Files =
        [
            File("Salamina-SUI Mayo 2024", "sui-facturacion", new Dictionary<string, object?> { ["TRLU"] = 1 }),
            File("Salamina-SUI Junio 2024", "sui-facturacion", new Dictionary<string, object?> { ["TRLU"] = 2 }),
            File("Salamina-SUI 2024", "sui-facturacion", new Dictionary<string, object?> { ["TRLU"] = 3 })
        ];

        var result = Assert.IsType<OkObjectResult>(await Controller(repo, harvest).CargueFacturacion(new(7, 2024, "Mayo"), default));

        Assert.Equal([new DriveLoadPeriod(7, 2024, 5)], repo.Periods);
        Assert.Single(repo.Rows!);
        Assert.Equal(1, Json(result).GetProperty("data").GetProperty("count").GetInt32());
    }

    // V3: nothing found must not report "completada"; it is rejected and nothing is deleted.
    [Fact]
    public async Task LoadWithNoMatchingFilesIsRejectedAndDeletesNothing()
    {
        var repo = new SpyRepository(); var harvest = new StubHarvest();

        var facturacion = Assert.IsType<BadRequestObjectResult>(await Controller(repo, harvest).CargueFacturacion(new(7, 2024, "Mayo"), default));
        var residuos = Assert.IsType<BadRequestObjectResult>(await Controller(repo, harvest).CargueResiduos(new(7, 2024), default));

        Assert.Null(repo.Target);
        Assert.Contains("No se encontraron archivos", Json(facturacion).GetProperty("data").GetProperty("message").GetString());
        Assert.Contains("No se encontraron archivos", Json(residuos).GetProperty("data").GetProperty("message").GetString());
    }

    [Theory]
    [InlineData(new string[0], "no tiene una empresa")]
    [InlineData(new[] { "A", "B" }, "más de una empresa")]
    public async Task CargueFacturacionRejectsApsWithoutSingleCompanyBeforeHarvesting(string[] companies, string message)
    {
        var repo = new SpyRepository { Aps = new Sui853ApsInfo(7, "Salamina", companies) }; var harvest = new StubHarvest();
        var result = Assert.IsType<BadRequestObjectResult>(await Controller(repo, harvest).CargueFacturacion(new(7, 2024), default));
        Assert.Contains(message, Json(result).GetProperty("data").GetProperty("message").GetString());
        Assert.Null(harvest.Request); Assert.Null(repo.Target);
    }

    [Fact]
    public async Task UnknownApsInvalidYearAndInvalidMonthAreRejectedBeforeHarvesting()
    {
        var repo = new SpyRepository { Aps = null }; var harvest = new StubHarvest();
        Assert.IsType<BadRequestObjectResult>(await Controller(repo, harvest).CargueResiduos(new(99, 2024), default));
        repo.Aps = new Sui853ApsInfo(7, "Salamina", ["Veolia"]);
        Assert.IsType<BadRequestObjectResult>(await Controller(repo, harvest).CargueResiduos(new(7, 0), default));
        Assert.IsType<BadRequestObjectResult>(await Controller(repo, harvest).CargueFacturacion(new(7, 2024, "Foo"), default));
        Assert.Null(harvest.Request); Assert.Null(repo.Target);
    }

    [Fact]
    public async Task ValidationErrorReturnsLegacyDetailShapeAndWritesNothing()
    {
        var repo = new SpyRepository(); var harvest = new StubHarvest();
        var bad = ResiduoRow(); bad["SISTEMA DE MEDICION"] = "abc";
        harvest.Files = [File("Salamina 2024", ResiduosTab, ResiduoRow(), bad)];

        var result = Assert.IsType<BadRequestObjectResult>(await Controller(repo, harvest).CargueResiduos(new(7, 2024), default));

        var data = Json(result).GetProperty("data");
        Assert.Equal("VALIDATION_ERROR", data.GetProperty("type").GetString());
        Assert.Equal("Salamina 2024", data.GetProperty("fileName").GetString());
        Assert.Equal(ResiduosTab, data.GetProperty("sheetTitle").GetString());
        Assert.Equal(3, data.GetProperty("rowNumber").GetInt32());
        Assert.Equal("abc", data.GetProperty("row").GetProperty("SISTEMA DE MEDICION").GetString());
        Assert.Equal("SISTEMA DE MEDICION", data.GetProperty("validation").GetProperty("campo").GetString());
        Assert.Equal("SIS_MEDICION", data.GetProperty("validation").GetProperty("columna").GetString());
        Assert.Equal("abc", data.GetProperty("validation").GetProperty("valor").GetString());
        Assert.Contains("fila 3", data.GetProperty("message").GetString());
        Assert.Null(repo.Target);
    }

    [Fact]
    public async Task UnreadableDriveFileAbortsTheLoadWithoutWriting()
    {
        var repo = new SpyRepository(); var harvest = new StubHarvest();
        harvest.Files = [File("Salamina 2024", ResiduosTab, ResiduoRow()), new DriveHarvestFile(null, "x", "Salamina 2024 b", null, "boom")];
        var result = Assert.IsType<ObjectResult>(await Controller(repo, harvest).CargueResiduos(new(7, 2024), default));
        Assert.Equal(502, result.StatusCode);
        var data = Json(result).GetProperty("data");
        Assert.Equal("HARVEST_ERROR", data.GetProperty("type").GetString());
        Assert.Equal("Salamina 2024 b", data.GetProperty("fileName").GetString());
        Assert.Null(repo.Target);
    }

    [Fact]
    public async Task DatabaseFailureReportsFailingRowAndThatNothingWasApplied()
    {
        var repo = new SpyRepository { Failure = new DriveLoadRowException(1, new InvalidOperationException("ORA-12899: value too large")) };
        var harvest = new StubHarvest();
        var second = ResiduoRow(); second["NUAP"] = "N2";
        harvest.Files = [File("Salamina 2024", ResiduosTab, ResiduoRow(), second)];

        var result = Assert.IsType<ObjectResult>(await Controller(repo, harvest).CargueResiduos(new(7, 2024), default));

        Assert.Equal(500, result.StatusCode);
        var data = Json(result).GetProperty("data");
        Assert.Equal("DB_ERROR", data.GetProperty("type").GetString());
        Assert.Equal(3, data.GetProperty("rowNumber").GetInt32());
        Assert.Equal("N2", data.GetProperty("row").GetProperty("NUAP").GetString());
        Assert.Contains("no se aplicó ningún cambio", data.GetProperty("message").GetString());
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData(2, 403)]
    public async Task RequiresAuthenticatedSui853Context(int? system, int expected)
    {
        var repo = new SpyRepository(); var harvest = new StubHarvest();
        var controller = Controller(repo, harvest, system);
        Assert.Equal(expected, Assert.IsAssignableFrom<ObjectResult>(await controller.CargueResiduos(new(7, 2024), default)).StatusCode);
        Assert.Equal(expected, Assert.IsAssignableFrom<ObjectResult>(await controller.CargueFacturacion(new(7, 2024, "Enero"), default)).StatusCode);
        Assert.False(repo.Called); Assert.Null(harvest.Request);
    }

    // ---------------------------------------------------------------- repository (SQLite stand-in for Oracle)

    [Fact]
    public async Task RepositoryDeletesExactPeriodsThenInsertsWithBoundParametersOnly()
    {
        using var db = new DriveLoadsDatabase();
        db.Seed(7, 2024, 3, "old-march"); db.Seed(7, 2024, 5, "may"); db.Seed(8, 2024, 3, "other-aps");
        var rows = Sui853DriveLoadMapper.MapResiduos(7, "Salamina'); DROP TABLE X; --", 2024,
            [File("Salamina 2024", ResiduosTab, ResiduoRow(), ResiduoRow())]);
        db.Statements.Clear();

        var outcome = await new Sui853DriveLoadsRepository(db).ReplaceAsync(DriveLoadTarget.Residuos,
            [new DriveLoadPeriod(7, 2024, 3)], rows.Select(r => r.Values).ToList(), default);
        var statements = db.Statements.ToList();

        Assert.Equal(new DriveLoadOutcome(1, 2), outcome);
        Assert.Equal(["may", "other-aps", "N1", "N1"], db.Anchor.Query<string>("SELECT NUAP FROM SUI.TGEN_RESGENERADOS ORDER BY rowid"));
        Assert.Equal("Salamina'); DROP TABLE X; --", db.Anchor.QueryFirst<string>("SELECT NOMAPS FROM SUI.TGEN_RESGENERADOS WHERE NUAP = 'N1'"));
        Assert.Equal("TEST_USER", db.Anchor.QueryFirst<string>("SELECT USU_REG FROM SUI.TGEN_RESGENERADOS WHERE NUAP = 'N1'"));
        Assert.Contains(statements, s => s.StartsWith("DELETE FROM SUI.TGEN_RESGENERADOS WHERE APS = :aps AND ANNO = :anno AND MES = :mes"));
        Assert.Contains(statements, s => s.StartsWith("INSERT INTO SUI.TGEN_RESGENERADOS (APS, NOMAPS, ANNO, MES,") && s.Contains(":p8"));
        Assert.All(statements, s => Assert.DoesNotContain("Salamina", s));
        Assert.All(statements, s => Assert.DoesNotContain("TO_DATE", s));
        Assert.All(statements, s => Assert.DoesNotContain("2024", s));
    }

    [Fact]
    public async Task RepositoryRollsBackDeletesAndInsertsWhenAnyRowFails()
    {
        using var db = new DriveLoadsDatabase();
        db.Seed(7, 2024, 3, "old-march");
        var bad = ResiduoRow(); bad["NUAP"] = "BOOM";
        var rows = Sui853DriveLoadMapper.MapResiduos(7, "Salamina", 2024, [File("Salamina 2024", ResiduosTab, ResiduoRow(), bad)]);

        var ex = await Assert.ThrowsAsync<DriveLoadRowException>(() => new Sui853DriveLoadsRepository(db).ReplaceAsync(
            DriveLoadTarget.Residuos, [new DriveLoadPeriod(7, 2024, 3)], rows.Select(r => r.Values).ToList(), default));

        Assert.Equal(1, ex.RowIndex);
        Assert.Equal(["old-march"], db.Anchor.Query<string>("SELECT NUAP FROM SUI.TGEN_RESGENERADOS"));
    }

    [Fact]
    public async Task RepositoryInsertsAll59ComercialColumns()
    {
        using var db = new DriveLoadsDatabase();
        var rows = Sui853DriveLoadMapper.MapComercial(7, "Salamina", "Veolia", 2024,
            [File("Salamina Enero 2024", "sui-facturacion", new Dictionary<string, object?> { ["NUIS_ASEO"] = "U1", ["D_CSDF"] = 4 })]);

        var outcome = await new Sui853DriveLoadsRepository(db).ReplaceAsync(DriveLoadTarget.Comercial,
            [new DriveLoadPeriod(7, 2024, 1)], rows.Select(r => r.Values).ToList(), default);

        Assert.Equal(new DriveLoadOutcome(0, 1), outcome);
        var stored = (IDictionary<string, object>)db.Anchor.QuerySingle("SELECT * FROM SUI.TGEN_COMERCIAL");
        Assert.Equal(("U1", "Veolia", 4L, 4L), ((string)stored["NUID"], (string)stored["EMPRESA"], (long)stored["DTOXCOMP"], (long)stored["DEVFEXCOE"]));
    }

    [Fact]
    public async Task RepositoryResolvesApsNameAndDistinctCompanies()
    {
        using var db = new DriveLoadsDatabase();
        db.Anchor.Execute("""
            INSERT INTO SUI.TCFG_APS VALUES (7, 'Salamina');
            INSERT INTO SUI.VCFGAPSEMPRESA VALUES (7, 'Veolia Aseo'), (7, 'Veolia Aseo'), (7, NULL), (8, 'Otra');
            """);
        var repository = new Sui853DriveLoadsRepository(db);

        var aps = await repository.FindApsAsync(7, default);

        Assert.Equal(7, aps!.ApsId);
        Assert.Equal("Salamina", aps.Nombre);
        Assert.Equal(["Veolia Aseo"], aps.Empresas);
        Assert.Null(await repository.FindApsAsync(99, default));
    }

    // ---------------------------------------------------------------- helpers

    internal static Dictionary<string, object?> ResiduoRow() => new()
    {
        ["TIPO DE SITIO"] = "Relleno", ["NUSD"] = "S1", ["NUAP"] = "N1", ["PLACA"] = "ABC123",
        ["FECHA ENTRADA"] = "15-03-2024", ["HORA DE ENTRADA"] = "07:00", ["HORA DE SALIDA"] = "08:30", ["NUMICRO"] = 1001L,
        ["TONELADAS RECOGIDAS BARRIDO URBANO"] = 1.5d, ["TONELADAS RECOGIDAS BARRIDO RURAL"] = "2",
        ["TONELADAS RECOGIDAS SERVICIO ORDINARIO URBANO"] = "3.25", ["TONELADAS RECOGIDAS SERVICIO ORDINARIO RURAL"] = "",
        ["SISTEMA DE MEDICION"] = 1L
    };

    private static readonly (string Column, string Header)[] ComercialTextMap =
    [
        ("NUID", "NUIS_ASEO"), ("CUENTA", "NUIS_SERVICIO"), ("DEPTO", "DANE_DD"), ("MUNI", "DANE_MM"), ("POBLADO", "DANE_CCC"),
        ("INF_PREDIAL", "INFPREDIAL"), ("NUMPRED", "NPREDIAL"), ("DIRECCION", "DIRECCION"), ("METODOL", "METOAPLI"),
        ("NUAP", "NUAP"), ("NUMFAC", "NO_FACTURA"), ("MULTIUSU", "CODMULTI"), ("CAUSALREFA", "CAUSALREFAT"),
        ("FACTREF", "FACTREFACT"), ("UBICACION", "UBICA"), ("CODIGOCLAS", "CLASE_USO"), ("TIPOAFORO", "TIPOAFO"),
        ("RECOL", "RECOL_SPP"), ("CODPRODUC", "CODPROD"), ("FACPRODUC", "FPS"), ("INQUILINA", "INQUILINATO"),
        ("PRIORIT", "VIS_VIP"), ("HCOMUN", "HOGAR")
    ];

    private static readonly (string Column, string Header)[] ComercialNumberMap =
    [
        ("DIASFAC", "DIASFACT"), ("PRODUCCION", "TRNA"), ("TRLU", "TRLU"), ("TRBL", "TRBL"), ("TRA", "TRA"), ("TRRA", "TRRA"),
        ("FACTCONJUN", "F_CONJUNTA"), ("TFC", "V_TC"), ("TLU", "V_TLU"), ("TBL", "V_TBL"), ("TRT", "V_TRT"), ("TTE", "V_TTE"),
        ("TDT", "V_TDF"), ("TTL", "V_TTL"), ("TA", "V_TA"), ("FACTORSUBC", "FCS"), ("VLRSUB", "V_SUBCONTRI"),
        ("VLTARIF", "V_TFS"), ("VLRMORA", "MORA"), ("VLRMINOR", "INT_MORA"), ("DTOXCAL", "D_CTR"), ("DTOXRECL", "D_RC"),
        ("DTOXCOMP", "D_CSDF"), ("DEVFEXCOE", "D_CSDF"), ("DEVEPENXCOE", "DV_ECNA"), ("DEVEPENXOTR", "DV_PCNA"),
        ("DEVFEXOTR", "DV_OTROS"), ("VLRTOTAL", "V_TOTAL"), ("PAGOSUSUC", "V_PAGO")
    ];

    private static DriveLoadFieldContext Context(string campo, string columna)
        => new("Archivo", "Hoja", 2, campo, columna, new Dictionary<string, object?>());

    internal static DriveHarvestFile File(string name, string sheetTitle, params Dictionary<string, object?>[] rows)
        => new(null, "id-" + name, name, new GoogleSheetTabData { SheetTitle = sheetTitle, Columns = rows.FirstOrDefault()?.Keys.ToList() ?? [], Rows = rows }, null);

    private static object? Value(DriveLoadTarget target, DriveLoadRow row, string column)
        => row.Values[target.Columns.ToList().IndexOf(column)];

    private static JsonElement Json(ObjectResult result) => JsonSerializer.SerializeToElement(result.Value);

    private static Sui853DriveLoadsController Controller(SpyRepository repository, StubHarvest harvest, int? system = 3)
    {
        var http = new DefaultHttpContext();
        if (system.HasValue) http.Request.Headers["x-access-token"] = "test." + Convert.ToBase64String(Encoding.UTF8.GetBytes(
            JsonSerializer.Serialize(new { SISU_ID = 1, idSistema = system.Value }))) + ".test";
        return new(repository, harvest, Options.Create(new GoogleDriveOptions()), NullLogger<Sui853DriveLoadsController>.Instance)
        { ControllerContext = new ControllerContext { HttpContext = http } };
    }

    internal sealed class SpyRepository : ISui853DriveLoadsRepository
    {
        public Sui853ApsInfo? Aps = new(7, "Salamina", ["Veolia Aseo Salamina"]);
        public bool Called;
        public Exception? Failure;
        public DriveLoadTarget? Target;
        public IReadOnlyList<DriveLoadPeriod>? Periods;
        public IReadOnlyList<object?[]>? Rows;

        public Task<Sui853ApsInfo?> FindApsAsync(long apsId, CancellationToken ct)
        { Called = true; return Task.FromResult(Aps?.ApsId == apsId ? Aps : null); }

        public Task<DriveLoadOutcome> ReplaceAsync(DriveLoadTarget target, IReadOnlyList<DriveLoadPeriod> periods,
            IReadOnlyList<object?[]> rows, CancellationToken ct)
        {
            Called = true;
            if (Failure is not null) throw Failure;
            Target = target; Periods = periods; Rows = rows;
            return Task.FromResult(new DriveLoadOutcome(0, rows.Count));
        }
    }

    internal sealed class StubHarvest : IGoogleDriveHarvestService
    {
        public DriveHarvestRequest? Request;
        public IReadOnlyList<DriveHarvestFile> Files = [];
        public Task<IReadOnlyList<DriveHarvestFile>> HarvestAsync(DriveHarvestRequest request, CancellationToken ct)
        { Request = request; return Task.FromResult(Files); }
    }

    private sealed class FakeDrive : IGoogleDriveClient
    {
        public Dictionary<string, List<GoogleDriveItem>> Folders = [];
        public Dictionary<string, List<GoogleDriveItem>> Sheets = [];
        public Dictionary<string, List<string>> Tabs = [];
        public Dictionary<string, List<Dictionary<string, object?>>> Rows = [];
        public HashSet<string> Failing = [];
        public List<string> Reads = [];

        public Task<IReadOnlyList<GoogleDriveItem>> ListSubfoldersAsync(string folderId, CancellationToken ct)
            => Task.FromResult<IReadOnlyList<GoogleDriveItem>>(Folders.GetValueOrDefault(folderId) ?? []);
        public Task<IReadOnlyList<GoogleDriveItem>> ListSpreadsheetsAsync(string folderId, CancellationToken ct)
            => Task.FromResult<IReadOnlyList<GoogleDriveItem>>(Sheets.GetValueOrDefault(folderId) ?? []);
        public Task<IReadOnlyList<string>> ListTabTitlesAsync(string spreadsheetId, CancellationToken ct)
            => Failing.Contains(spreadsheetId) ? throw new IOException("Drive unavailable")
                : Task.FromResult<IReadOnlyList<string>>(Tabs.GetValueOrDefault(spreadsheetId) ?? []);
        public Task<GoogleSheetTabData> ReadTabAsync(string spreadsheetId, string tabTitle, CancellationToken ct)
        {
            Reads.Add($"{spreadsheetId}|{tabTitle}");
            var rows = Rows.GetValueOrDefault($"{spreadsheetId}|{tabTitle}") ?? [];
            return Task.FromResult(new GoogleSheetTabData { SheetTitle = tabTitle, Columns = rows.FirstOrDefault()?.Keys.ToList() ?? [], Rows = rows });
        }
    }

    /// <summary>
    /// Shared in-memory SQLite database attached as schema SUI. Commands are recorded and the Oracle-only
    /// SYSDATE / SYS_CONTEXT audit expressions are emulated so the real repository SQL runs unchanged.
    /// </summary>
    private sealed class DriveLoadsDatabase : IOracleConnectionFactory, IDisposable
    {
        private readonly string name = "driveloads" + Guid.NewGuid().ToString("N");
        public List<string> Statements { get; } = [];
        public SqliteConnection Anchor { get; }

        public DriveLoadsDatabase()
        {
            Anchor = (SqliteConnection)CreateConnection();
            Anchor.Open();
            var residuos = DriveLoadTarget.Residuos.Columns.Select(c => c == "NUAP" ? "NUAP TEXT CHECK (NUAP <> 'BOOM')" : c)
                .Concat(DriveLoadTarget.Residuos.Constants.Select(c => c.Column));
            Anchor.Execute($"""
                CREATE TABLE SUI.TGEN_RESGENERADOS ({string.Join(", ", residuos)});
                CREATE TABLE SUI.TGEN_COMERCIAL ({string.Join(", ", DriveLoadTarget.Comercial.Columns.Select(c => c + " NUMERIC"))});
                CREATE TABLE SUI.TCFG_APS (TCFG_APS_ID INTEGER, NOMBRE_APS TEXT);
                CREATE TABLE SUI.VCFGAPSEMPRESA (TCFG_APS_ID INTEGER, EMPRESA TEXT);
                """);
            Statements.Clear();
        }

        public void Seed(long aps, int anno, int mes, string nuap)
            => Anchor.Execute("INSERT INTO SUI.TGEN_RESGENERADOS (APS, ANNO, MES, NUAP) VALUES (@aps, @anno, @mes, @nuap)",
                new { aps, anno, mes, nuap });

        public IDbConnection CreateConnection()
        {
            var connection = new RecordingConnection($"Data Source={name};Mode=Memory;Cache=Shared", Statements);
            connection.StateChange += (_, args) =>
            {
                if (args.CurrentState != ConnectionState.Open) return;
                connection.CreateFunction("SYS_CONTEXT", (string _, string _) => "TEST_USER");
                using var attach = new SqliteCommand($"ATTACH DATABASE 'file:{name}sui?mode=memory&cache=shared' AS SUI", connection);
                attach.ExecuteNonQuery();
            };
            return connection;
        }

        public void Dispose() => Anchor.Dispose();
    }

    private sealed class RecordingConnection(string connectionString, List<string> log) : SqliteConnection(connectionString)
    {
        protected override DbCommand CreateDbCommand() => new RecordingCommand(log) { Connection = this };
    }

    private sealed class RecordingCommand(List<string> log) : SqliteCommand
    {
#pragma warning disable CS8765
        public override string CommandText
        {
            get => base.CommandText;
            set
            {
                lock (log) log.Add(value);
                base.CommandText = value.Replace("SYSDATE", "CURRENT_TIMESTAMP", StringComparison.Ordinal);
            }
        }
#pragma warning restore CS8765
    }
}
