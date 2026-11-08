using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Regulator.Killometros;

[ApiController]
[Route("api/v1/kilometros")]
public sealed class KillometrosController(IKillometrosRepository repository) : ControllerBase
{
    [HttpPost("lbl")]
    public async Task<IActionResult> Lbl([FromBody] KilometrosRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetLblAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Consulta LBL ejecutada correctamente.");

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

        var data = await action();
        return Ok(new ApiEnvelopeResponse<T>("success", data, successMessage, HttpContext.TraceIdentifier, null));
    }
}
