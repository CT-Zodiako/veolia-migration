using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/toneladas")]
public sealed class ToneladasController(IToneladasRepository repository) : ControllerBase
{
    [HttpPost("qrt")]
    public async Task<IActionResult> Qrt([FromBody] ToneladasRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetQrtAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Consulta QRT ejecutada correctamente.");

    [HttpPost("qa")]
    public async Task<IActionResult> Qa([FromBody] ToneladasRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetQaAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Consulta QA ejecutada correctamente.");

    [HttpPost("detalle")]
    public async Task<IActionResult> Detalle([FromBody] ToneladasRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetDetalleAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Consulta de detalle ejecutada correctamente.");

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
                new ApiEnvelopeResponse<object>("error", new { }, "Ocurrió un error procesando la consulta de toneladas.", HttpContext.TraceIdentifier, null));
        }
    }
}
