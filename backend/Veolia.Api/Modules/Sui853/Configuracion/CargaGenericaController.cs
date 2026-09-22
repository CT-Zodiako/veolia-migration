using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.GoogleDrive;

namespace Veolia.Api.Modules.Sui853.Configuracion;

// Controller-scoped middleware avoids exposing new endpoints outside Program's legacy route allowlist.
public sealed class CargaGenericaAuthentication
{
    public void Configure(IApplicationBuilder app) => app.UseMiddleware<AuthJwtParityMiddleware>();
}

[ApiController]
[Route("api/v1/sui853Configuracion")]
[MiddlewareFilter(typeof(CargaGenericaAuthentication))]
public sealed class CargaGenericaController(ICargaGenericaRepository repository, IGoogleSheetsService sheets,
    ILogger<CargaGenericaController> logger) : ControllerBase
{
    [HttpPost("tablasSui")]
    public Task<IActionResult> Tables(CancellationToken ct) => Execute(async () =>
        (object)await repository.TablesAsync(ct), ct);

    [HttpPost("listarHojasDrive")]
    public Task<IActionResult> Sheets(SheetRequest request, CancellationToken ct) => Execute(async () =>
    {
        CargaGenericaValidation.Sheet(request.SheetId);
        return new { ok = true, source = "DRIVE_SHEETS", sheets = await sheets.ListMetadataAsync(request.SheetId, ct) };
    }, ct);

    [HttpPost("cargaDriveDinamica")]
    public Task<IActionResult> Load(CargaGenericaRequest request, CancellationToken ct) => Execute(async () =>
    {
        var table = CargaGenericaValidation.Destination(request.Owner, request.TableName);
        CargaGenericaValidation.Sheet(request.SheetId, request.SheetTitle ?? "");
        var metadata = await repository.ColumnsAsync(table, ct);
        var rawHeaders = await sheets.ReadHeadersAsync(request.SheetId, request.SheetTitle!, ct);
        var headers = CargaGenericaValidation.Headers(rawHeaders);
        var common = headers.Intersect(metadata.Select(c => c.COLUMN_NAME)).ToArray();
        if (request.PreviewOnly)
            return new { ok = true, source = "PREVIEW", mode = "PREVIEW", driveHeaders = headers, tableColumns = metadata, commonColumns = common };

        var names = CargaGenericaValidation.Columns(headers, metadata, request.SelectedColumns);
        var columns = names.Select(n => metadata.Single(c => c.COLUMN_NAME == n)).ToArray();
        var data = await sheets.ReadTabAsync(request.SheetId, request.SheetTitle!, ct);
        if (data.Error is not null) throw new InvalidOperationException("Google Sheets read failed.");
        if (!headers.SequenceEqual(CargaGenericaValidation.Headers(data.Columns)))
            throw new ArgumentException("Los encabezados cambiaron; vuelva a consultar la vista previa.");
        if (data.Rows.Count == 0) throw new ArgumentException("La hoja no tiene filas de datos.");
        // Convert all values before beginning the transaction; never silently discard invalid numbers.
        var rows = data.Rows.Select(row => columns.Select(column =>
        {
            var key = data.Columns[Array.IndexOf(headers, column.COLUMN_NAME)];
            row.TryGetValue(key, out var value);
            return CargaGenericaValidation.Value(value, column.DATA_TYPE);
        }).ToArray()).ToArray();
        var inserted = await repository.InsertAsync(table, columns, rows, ct);
        return new
        {
            ok = true, source = "DB_INSERT",
            driveSummary = new { sheetTitle = request.SheetTitle, processedDataRows = rows.Length },
            tableSummary = new { owner = "SUI", tableName = table, columnsUsed = names, useExecuteMany = false },
            insertResult = new { ok = true, code = "OK", message = "Carga completada.", inserted }
        };
    }, ct);

    [HttpPost("truncateTable")]
    public Task<IActionResult> Truncate(TruncateRequest request, CancellationToken ct) => Execute(async () =>
    {
        var table = CargaGenericaValidation.Destination(request.Owner, request.TableName);
        if (!request.Confirm) throw new ArgumentException("Se requiere confirmación explícita para vaciar la tabla.");
        await repository.TruncateAsync(table, ct);
        return new { ok = true, source = "DB_TRUNCATE", owner = "SUI", tableName = table };
    }, ct);

    private async Task<IActionResult> Execute(Func<Task<object>> action, CancellationToken ct)
    {
        // Signature and revocation are checked by the controller-scoped middleware.
        if (!AuthTokenContextAccessor.TryRead(Request.Headers["x-access-token"].FirstOrDefault(), out var context))
            return Unauthorized(new { status = 401, data = new { ok = false, code = "UNAUTHORIZED" } });
        if (context.IdSistema != 3)
            return StatusCode(403, new { status = 403, data = new { ok = false, code = "WRONG_SYSTEM" } });
        try { return Ok(new { status = 200, data = await action() }); }
        catch (ArgumentException ex)
        {
            return BadRequest(new { status = 400, data = new { ok = false, code = "INVALID_PARAMS", message = ex.Message } });
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError("Carga generica failed ({ExceptionType}); trace {TraceId}", ex.GetType().Name, HttpContext.TraceIdentifier);
            return StatusCode(500, new { status = 500, data = new { ok = false, code = "OPERATION_FAILED", message = "No se pudo completar la operación." } });
        }
    }
}
