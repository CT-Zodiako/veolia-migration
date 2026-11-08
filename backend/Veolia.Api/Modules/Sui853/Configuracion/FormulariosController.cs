using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Sui853.Configuracion;

[ApiController]
[Route("api/v1/sui853Configuracion")]
public sealed class FormulariosController(IFormulariosRepository repository) : ControllerBase
{
    [HttpPost("getFormularios")]
    public Task<IActionResult> List(CancellationToken cancellationToken)
        => ExecuteAsync(async () => Ok(new { status = 200, data = await repository.ListAsync(cancellationToken) }));

    [HttpPost("updateFormulario")]
    public Task<IActionResult> Update([FromBody] FormularioRow row, CancellationToken cancellationToken)
        => ExecuteAsync(async () =>
        {
            var saved = await repository.UpdateAsync(row, cancellationToken);
            return saved is null
                ? NotFound(new { status = 404, message = "No se encontró el registro." })
                : Ok(new { status = 200, data = saved });
        });

    // Legacy routes.js:22-31 served getFormularios and updateFormulario to any system's token (user decision,
    // legacy-characterization-tests S11); a valid token is still required.
    private async Task<IActionResult> ExecuteAsync(Func<Task<IActionResult>> action)
    {
        // Signature and expiry are checked by AuthJwtParityMiddleware before controller execution.
        if (!AuthTokenContextAccessor.TryRead(Request.Headers["x-access-token"].FirstOrDefault(), out _))
            return Unauthorized(new { status = 401, message = "No autorizado." });
        return await action();
    }
}
