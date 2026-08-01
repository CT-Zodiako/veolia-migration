using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Regulator.Trna;

[ApiController]
[Route("api/v1/trna")]
public sealed class TrnaController(ITrnaRepository repository) : ControllerBase
{
    [HttpPost("trna")]
    public async Task<IActionResult> Trna([FromBody] TrnaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetTrnaAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Consulta TRNA ejecutada correctamente.");

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
                new ApiEnvelopeResponse<object>("error", new { }, "Ocurrió un error procesando la consulta de TRNA.", HttpContext.TraceIdentifier, null));
        }
    }
}
