using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Sui853.Operaciones;

public sealed class OperacionesAuthentication
{
    public void Configure(IApplicationBuilder app) => app.UseMiddleware<AuthJwtParityMiddleware>();
}

[ApiController]
[Route("api/v1/sui853/operaciones")]
[MiddlewareFilter(typeof(OperacionesAuthentication))]
public sealed class ResiduosGeneradosController(IResiduosGeneradosRepository repository,
    ILogger<ResiduosGeneradosController> logger) : ControllerBase
{
    [HttpPost("residuosGenerados")]
    public Task<IActionResult> Detail([FromBody] ResiduosGeneradosRequest request, CancellationToken cancellationToken)
        => ExecuteAsync(() => repository.GetDetailAsync(request, cancellationToken), cancellationToken);

    [HttpPost("resumenResiduosGenerados")]
    public Task<IActionResult> Summary(CancellationToken cancellationToken)
        => ExecuteAsync(() => repository.GetSummaryAsync(cancellationToken), cancellationToken);

    private async Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken)
    {
        // The scoped middleware verifies signature/revocation before claims are read here.
        if (!AuthTokenContextAccessor.TryRead(Request.Headers["x-access-token"].FirstOrDefault(), out var context))
            return Unauthorized(new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null));
        if (context.IdSistema != 3)
            return StatusCode(403, new ApiEnvelopeResponse<object>("error", new { }, "Sistema no autorizado.", HttpContext.TraceIdentifier, null));
        try
        {
            return Ok(new ApiEnvelopeResponse<T>("success", await action(), "Consulta ejecutada correctamente.", HttpContext.TraceIdentifier, null));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError("Residuos Generados query failed ({ExceptionType}); trace {TraceId}", ex.GetType().Name, HttpContext.TraceIdentifier);
            return StatusCode(500, new ApiEnvelopeResponse<object>("error", new { }, "No se pudo consultar Residuos Generados.", HttpContext.TraceIdentifier, null));
        }
    }
}
