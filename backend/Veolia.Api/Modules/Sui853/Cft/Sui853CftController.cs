using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Sui853.Cft;

// Los 12 endpoints ejecutan el mismo SQL genérico
// (SELECT SUI.f_render_formato2(:codigo) AS json FROM dual), cambiando solo
// el código de formato SUI hardcodeado por endpoint (nunca provisto por el
// cliente). Ver doc migracion/modules/sui853/CFT.md para el contrato
// completo (código de formato, columnas, título legacy, fila de ejemplo)
// capturado en vivo del legacy.
[ApiController]
[Route("api/v1/sui853/cft")]
public sealed class Sui853CftController(ISui853CftRepository repository) : ControllerBase
{
    // cft.vue — /cft (SEG1) — F853S105 — "SG1 - CFT"
    [HttpPost("cft")]
    public async Task<IActionResult> Cft(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853S105", cancellationToken),
            "Consulta CFT ejecutada correctamente.");

    // cft.vue — /cft (SEG2) — F853S209 — "SG2 - CFT"
    [HttpPost("cft-seg2")]
    public async Task<IActionResult> CftSeg2(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853S209", cancellationToken),
            "Consulta CFT (SEG2) ejecutada correctamente.");

    // cft.vue — /cft (SEG3) — F853S306 — "SG3 - CFT"
    [HttpPost("cft-seg3")]
    public async Task<IActionResult> CftSeg3(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853S306", cancellationToken),
            "Consulta CFT (SEG3) ejecutada correctamente.");

    // cssAprovechamientoC.vue — /cssaprovechamiento (SEG1) — F853001 — "SG1 - CCS APROVECHAMIENTO"
    [HttpPost("css-aprovechamiento")]
    public async Task<IActionResult> CssAprovechamiento(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853001", cancellationToken),
            "Consulta CSS Aprovechamiento ejecutada correctamente.");

    // cssAprovechamientoC.vue — /cssaprovechamiento (SEG2) — F853S201 — "SG2 - CCS - APROVECHAMIENTO"
    [HttpPost("css-aprovechamiento-seg2")]
    public async Task<IActionResult> CssAprovechamientoSeg2(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853S201", cancellationToken),
            "Consulta CSS Aprovechamiento (SEG2) ejecutada correctamente.");

    // cssAprovechamientoC.vue — /cssaprovechamiento (SEG3) — F853S301 — "SG3 - CCS - APROVECHAMIENTO"
    [HttpPost("css-aprovechamiento-seg3")]
    public async Task<IActionResult> CssAprovechamientoSeg3(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853S301", cancellationToken),
            "Consulta CSS Aprovechamiento (SEG3) ejecutada correctamente.");

    // crlus.vue — /crlus — F853002 — "SG1 - CRLUS"
    [HttpPost("crlus")]
    public async Task<IActionResult> Crlus(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853002", cancellationToken),
            "Consulta CRLUS ejecutada correctamente.");

    // cbls.vue — /cbls — F853003 — "SG1 - CBLS"
    [HttpPost("cbls")]
    public async Task<IActionResult> Cbls(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853003", cancellationToken),
            "Consulta CBLS ejecutada correctamente.");

    // cblusMinimo.vue — /cblusMinimo — F853S202 — "SG2 - CBLUS MINIMO"
    [HttpPost("cblus-minimo")]
    public async Task<IActionResult> CblusMinimo(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853S202", cancellationToken),
            "Consulta CBLUS Mínimo ejecutada correctamente.");

    // cblusMaximo.vue — /cblusMaximo — F853S203 — "SG2 - CBLUS MAXIMO"
    [HttpPost("cblus-maximo")]
    public async Task<IActionResult> CblusMaximo(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853S203", cancellationToken),
            "Consulta CBLUS Máximo ejecutada correctamente.");

    // cblus.vue — /cblus — F853S204 — "SG2 - CBLUS"
    [HttpPost("cblus")]
    public async Task<IActionResult> Cblus(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853S204", cancellationToken),
            "Consulta CBLUS ejecutada correctamente.");

    // cbicsmaxmin.vue — /cbicsmaxmin (SEG3) — F853S208 — "SG3 - CBICS MINIMO Y MAXIMO"
    [HttpPost("cbics-maxmin")]
    public async Task<IActionResult> CbicsMaxMin(CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetFormatoAsync("F853S208", cancellationToken),
            "Consulta CBICS Mínimo y Máximo ejecutada correctamente.");

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private async Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, string successMessage)
    {
        if (!TryReadTokenContext(out _))
        {
            var unauthorized = new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null);
            return Unauthorized(unauthorized);
        }

        try
        {
            var data = await action();
            return Ok(new ApiEnvelopeResponse<T>("success", data, successMessage, HttpContext.TraceIdentifier, null));
        }
        catch (Oracle.ManagedDataAccess.Client.OracleException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, $"Oracle error: {ex.Message}", HttpContext.TraceIdentifier, $"ORA-{Math.Abs(ex.Number):D5}"));
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, "Ocurrió un error procesando la consulta de CFT.", HttpContext.TraceIdentifier, null));
        }
    }
}
