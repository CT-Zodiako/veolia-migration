using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Sui853.Cdft;

// cdft.vue — /cdft — consulta directa contra SUI.TCDFT_QRT_ANUAL por año
// fiscal (no usa SUI.f_render_formato2 como el resto de SUI853/CFT).
[ApiController]
[Route("api/v1/sui853/cdft")]
public sealed class CdftController(ICdftRepository repository) : ControllerBase
{
    [HttpPost("cdft")]
    public async Task<IActionResult> Cdft([FromBody] CdftRequestDto request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetByAnnoAsync(request.Anno, cancellationToken),
            "Consulta CDFT ejecutada correctamente.");

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
