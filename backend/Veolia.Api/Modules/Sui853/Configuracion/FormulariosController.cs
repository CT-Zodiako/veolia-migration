using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Sui853.Configuracion;

[ApiController]
[Route("api/v1/sui853Configuracion")]
public sealed class FormulariosController(IFormulariosRepository repository, ILogger<FormulariosController> logger) : ControllerBase
{
    [HttpPost("getFormularios")]
    public Task<IActionResult> List(CancellationToken cancellationToken)
        => ExecuteAsync(async () => Ok(new { status = 200, data = await repository.ListAsync(cancellationToken) }), cancellationToken);

    [HttpPost("updateFormulario")]
    public Task<IActionResult> Update([FromBody] FormularioRow row, CancellationToken cancellationToken)
        => ExecuteAsync(async () =>
        {
            var saved = await repository.UpdateAsync(row, cancellationToken);
            return saved is null
                ? NotFound(new { status = 404, message = "No se encontró el registro." })
                : Ok(new { status = 200, data = saved });
        }, cancellationToken);

    private async Task<IActionResult> ExecuteAsync(Func<Task<IActionResult>> action, CancellationToken cancellationToken)
    {
        // Signature and expiry are checked by AuthJwtParityMiddleware before controller execution.
        if (!AuthTokenContextAccessor.TryRead(Request.Headers["x-access-token"].FirstOrDefault(), out var context))
            return Unauthorized(new { status = 401, message = "No autorizado." });
        if (context.IdSistema != 3)
            return StatusCode(403, new { status = 403, message = "Seleccione el sistema SUI 853." });
        try { return await action(); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError("Formularios operation failed ({ExceptionType}); trace {TraceId}", ex.GetType().Name, HttpContext.TraceIdentifier);
            return StatusCode(500, new { status = 500, message = "No se pudo completar la operación de formularios." });
        }
    }
}
