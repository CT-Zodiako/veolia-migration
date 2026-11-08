using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Regulator.UsuariosGrafico;

[ApiController]
[Route("api/v1/usuarios")]
public sealed class UsuariosGraficoController(IUsuariosGraficoRepository repository) : ControllerBase
{
    [HttpPost("usuagraf")]
    public async Task<IActionResult> Usuagraf([FromBody] UsuariosGraficoRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetUsuagrafAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Consulta de usuarios promedio ejecutada correctamente.");

    [HttpPost("usuadeta")]
    public async Task<IActionResult> Usuadeta([FromBody] UsuariosGraficoRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetUsuadetaAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Consulta de detalle de usuarios ejecutada correctamente.");

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
