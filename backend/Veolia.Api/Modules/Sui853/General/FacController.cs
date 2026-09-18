using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Sui853.General;

[ApiController]
[Route("api/v1/sui853/general")]
public sealed class FacController(IFacRepository repository, ILogger<FacController> logger) : ControllerBase
{
    [HttpPost("fac")]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        if (!AuthTokenContextAccessor.TryRead(Request.Headers["x-access-token"].FirstOrDefault(), out _))
            return Unauthorized(new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null));
        try
        {
            var payload = await repository.GetAsync(cancellationToken);
            return Ok(new ApiEnvelopeResponse<object>("success", payload, "Consulta ejecutada correctamente.", HttpContext.TraceIdentifier, null));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError("FAC query failed ({ExceptionType}); trace {TraceId}", ex.GetType().Name, HttpContext.TraceIdentifier);
            return StatusCode(500, new ApiEnvelopeResponse<object>("error", new { }, "No se pudo consultar FAC.", HttpContext.TraceIdentifier, null));
        }
    }
}
