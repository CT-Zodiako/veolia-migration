using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Sui853.Comercial;

[ApiController]
[Route("api/v1/sui853/comercial")]
public sealed class ComercialController(IComercialRepository repository, ILogger<ComercialController> logger) : ControllerBase
{
    [HttpPost("residuosGeneradosInforme")]
    public Task<IActionResult> Detail([FromBody] ComercialRequest request, CancellationToken cancellationToken)
        => ExecuteAsync(() => repository.GetDetailAsync(request, cancellationToken), cancellationToken);

    [HttpPost("resumenResiduosGenerados")]
    public Task<IActionResult> Summary(CancellationToken cancellationToken)
        => ExecuteAsync(() => repository.GetSummaryAsync(cancellationToken), cancellationToken);

    private async Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken)
    {
        if (!AuthTokenContextAccessor.TryRead(Request.Headers["x-access-token"].FirstOrDefault(), out _))
            return Unauthorized(new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null));
        try
        {
            return Ok(new ApiEnvelopeResponse<T>("success", await action(), "Consulta ejecutada correctamente.", HttpContext.TraceIdentifier, null));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError("Comercial query failed ({ExceptionType}); trace {TraceId}", ex.GetType().Name, HttpContext.TraceIdentifier);
            return StatusCode(500, new ApiEnvelopeResponse<object>("error", new { }, "No se pudo consultar Comercial.", HttpContext.TraceIdentifier, null));
        }
    }
}
