using System.Data.Common;
using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.GoogleDrive;

namespace Veolia.Api.Modules.Sui853.Configuracion;

/// <summary>
/// SUI853 Configuración Drive loads: 30004 Cargue Residuos (SUI.TGEN_RESGENERADOS) and 30005/30007 Cargue Facturación [Mes]
/// (SUI.TGEN_COMERCIAL). Legacy split this into sui853CVA/drive/harvest[Facturacion] + sui853Configuracion/postResuidos|postInformes;
/// here the server harvests and loads in one call so the client cannot alter the harvested rows.
/// Legacy defects corrected by user decision: replace-by-period in one transaction, bound dates, real EMPRESA, month filter forwarded.
/// </summary>
[ApiController]
[Route("api/v1/sui853Configuracion")]
public sealed class Sui853DriveLoadsController(ISui853DriveLoadsRepository repository, IGoogleDriveHarvestService harvest,
    IOptions<GoogleDriveOptions> options, ILogger<Sui853DriveLoadsController> logger) : ControllerBase
{
    private const string NothingApplied = "no se aplicó ningún cambio";

    [HttpPost("cargueResiduos")]
    public Task<IActionResult> CargueResiduos([FromBody] CargueResiduosRequest request, CancellationToken ct) => ExecuteAsync(async () =>
    {
        ValidateYear(request.Anno);
        var aps = await FindApsAsync(request.ApsId, ct);
        var settings = options.Value;
        var files = await HarvestAsync(new DriveHarvestRequest(settings.ResiduosFolderId, settings.ResiduosSheetTitle, aps.Nombre,
            request.Anno.ToString(CultureInfo.InvariantCulture)), ct);
        EnsureFilesFound(files, aps.Nombre, request.Anno.ToString(CultureInfo.InvariantCulture));
        var rows = Sui853DriveLoadMapper.MapResiduos(aps.ApsId, aps.Nombre, request.Anno, files);
        return await LoadAsync(DriveLoadTarget.Residuos, files, rows, "Carga completada correctamente", ct);
    }, ct);

    [HttpPost("cargueFacturacion")]
    public Task<IActionResult> CargueFacturacion([FromBody] CargueFacturacionRequest request, CancellationToken ct) => ExecuteAsync(async () =>
    {
        ValidateYear(request.Anno);
        var month = Sui853DriveLoadMapper.NormalizeMonth(request.Mes);
        var aps = await FindApsAsync(request.ApsId, ct);
        // Legacy sent EMPRESA = "Test"; the real company comes from SUI.VCFGAPSEMPRESA.
        var empresa = aps.Empresas.Count switch
        {
            0 => throw new ArgumentException($"La APS '{aps.Nombre}' no tiene una empresa asociada en SUI.VCFGAPSEMPRESA; no se puede cargar la facturación."),
            1 => aps.Empresas[0],
            _ => throw new ArgumentException($"La APS '{aps.Nombre}' tiene más de una empresa en SUI.VCFGAPSEMPRESA; no se puede determinar la empresa de la facturación.")
        };
        var settings = options.Value;
        var files = await HarvestAsync(new DriveHarvestRequest(settings.FacturacionFolderId, settings.FacturacionSheetTitle, aps.Nombre,
            request.Anno.ToString(CultureInfo.InvariantCulture), month), ct);
        if (month is not null)
        {
            // A month load may only replace that month: keep files whose name parses to the requested month.
            var mes = Array.IndexOf(Sui853DriveLoadMapper.MonthNames, month) + 1;
            files = files.Where(f => Sui853DriveLoadMapper.ParseFileName(f.FileName).Mes == mes).ToList();
            EnsureFilesFound(files, aps.Nombre, $"{month} {request.Anno}");
        }
        EnsureFilesFound(files, aps.Nombre, request.Anno.ToString(CultureInfo.InvariantCulture));
        var rows = Sui853DriveLoadMapper.MapComercial(aps.ApsId, aps.Nombre, empresa, request.Anno, files);
        return await LoadAsync(DriveLoadTarget.Comercial, files, rows, "Carga comercial completada correctamente", ct);
    }, ct);

    /// <summary>Legacy answered "completada" with zero files; an empty harvest is now rejected and nothing is deleted.</summary>
    private static void EnsureFilesFound(IReadOnlyList<DriveHarvestFile> files, string apsName, string periodo)
    {
        if (files.Count == 0)
            throw new ArgumentException($"No se encontraron archivos de '{apsName}' para {periodo} en Google Drive; {NothingApplied}.");
    }

    private static void ValidateYear(int anno)
    {
        if (anno is < 1900 or > 2100) throw new ArgumentException("Año inválido.");
    }

    private async Task<Sui853ApsInfo> FindApsAsync(long apsId, CancellationToken ct)
    {
        if (apsId <= 0) throw new ArgumentException("Seleccione una APS.");
        return await repository.FindApsAsync(apsId, ct) ?? throw new ArgumentException("La APS seleccionada no existe en SUI.TCFG_APS.");
    }

    private async Task<IReadOnlyList<DriveHarvestFile>> HarvestAsync(DriveHarvestRequest request, CancellationToken ct)
    {
        IReadOnlyList<DriveHarvestFile> files;
        try { files = await harvest.HarvestAsync(request, ct); }
        catch (Exception ex) when (ex is not ArgumentException && !(ex is OperationCanceledException && ct.IsCancellationRequested))
        {
            throw new HarvestFailedException(null, ex);
        }
        // Legacy loaded the readable files and silently skipped the rest; a partial harvest is now rejected.
        var failed = files.FirstOrDefault(f => f.Error is not null);
        if (failed is not null) throw new HarvestFailedException(failed.FileName, null);
        return files;
    }

    private async Task<IActionResult> LoadAsync(DriveLoadTarget target, IReadOnlyList<DriveHarvestFile> files,
        IReadOnlyList<DriveLoadRow> rows, string message, CancellationToken ct)
    {
        var periods = rows.Select(r => r.Period).Distinct().ToList();
        var outcome = new DriveLoadOutcome(0, 0);
        if (rows.Count > 0)
        {
            try
            {
                outcome = await repository.ReplaceAsync(target, periods, rows.Select(r => r.Values).ToList(), ct);
            }
            catch (DriveLoadRowException ex) when (ex.RowIndex >= 0 && ex.RowIndex < rows.Count)
            {
                var row = rows[ex.RowIndex];
                logger.LogError("Drive load into {Table} failed at row {Row} ({ExceptionType}); trace {TraceId}",
                    target.Table, row.RowNumber, ex.InnerException?.GetType().Name, HttpContext.TraceIdentifier);
                return StatusCode(500, new
                {
                    status = 500,
                    data = new
                    {
                        ok = false, type = "DB_ERROR",
                        message = $"No se pudo guardar la fila {row.RowNumber} del archivo {row.FileName}, hoja {row.SheetTitle}; {NothingApplied}.",
                        fileName = row.FileName, sheetTitle = row.SheetTitle, rowNumber = row.RowNumber, row = row.Source,
                        oracle = ex.InnerException is DbException db ? new { message = db.Message } : null
                    }
                });
            }
        }

        return Ok(new
        {
            status = 200,
            data = new
            {
                ok = true, message, count = files.Count, inserted = outcome.Inserted, deleted = outcome.Deleted,
                periods = periods.Select(p => new { aps = p.Aps, anno = p.Anno, mes = p.Mes }),
                files = files.Select(f => new
                {
                    monthFolder = f.MonthFolder, fileName = f.FileName, sheetTitle = f.Tab?.SheetTitle,
                    rows = f.Tab?.Rows.Count ?? 0, warning = f.Tab?.Error
                })
            }
        });
    }

    private async Task<IActionResult> ExecuteAsync(Func<Task<IActionResult>> action, CancellationToken ct)
    {
        // Signature and revocation are checked by AuthJwtParityMiddleware before controller execution.
        if (!AuthTokenContextAccessor.TryRead(Request.Headers["x-access-token"].FirstOrDefault(), out var context))
            return Unauthorized(new { status = 401, data = new { ok = false, code = "UNAUTHORIZED", message = "No autorizado." } });
        if (context.IdSistema != 3)
            return StatusCode(403, new { status = 403, data = new { ok = false, code = "WRONG_SYSTEM", message = "Seleccione el sistema SUI 853." } });
        try { return await action(); }
        catch (DriveLoadValidationException ex)
        {
            return BadRequest(new
            {
                status = 400,
                data = new
                {
                    ok = false, type = "VALIDATION_ERROR", message = ex.Message, fileName = ex.FileName, sheetTitle = ex.SheetTitle,
                    rowNumber = ex.RowNumber, row = ex.Row, validation = new { campo = ex.Campo, columna = ex.Columna, valor = ex.Valor }
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { status = 400, data = new { ok = false, type = "INVALID_PARAMS", message = ex.Message } });
        }
        catch (HarvestFailedException ex)
        {
            logger.LogError("Drive harvest failed ({ExceptionType}); trace {TraceId}", ex.InnerException?.GetType().Name, HttpContext.TraceIdentifier);
            var where = ex.FileName is null ? "Google Drive" : $"el archivo '{ex.FileName}' de Google Drive";
            return StatusCode(502, new
            {
                status = 502,
                data = new { ok = false, type = "HARVEST_ERROR", message = $"No se pudo leer {where}; {NothingApplied}.", fileName = ex.FileName }
            });
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError("Drive load failed ({ExceptionType}); trace {TraceId}", ex.GetType().Name, HttpContext.TraceIdentifier);
            return StatusCode(500, new
            {
                status = 500,
                data = new { ok = false, type = "DB_ERROR", message = $"No se pudo completar la carga; {NothingApplied}." }
            });
        }
    }

    private sealed class HarvestFailedException(string? fileName, Exception? inner) : Exception("Drive harvest failed.", inner)
    {
        public string? FileName { get; } = fileName;
    }
}
