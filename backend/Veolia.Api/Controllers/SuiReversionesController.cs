using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Sui;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/sui")]
public sealed class SuiReversionesController(ISuiReversionesRepository repository) : ControllerBase
{
    [HttpPost("reversionesF19")]
    public Task<IActionResult> ReversionesF19([FromBody] SuiReversionesRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync(request, repository.GetReversionesF19, cancellationToken);

    [HttpPost("reversionesF23")]
    public Task<IActionResult> ReversionesF23([FromBody] SuiReversionesRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync(request, repository.GetReversionesF23, cancellationToken);

    [HttpPost("reversionesF24")]
    public Task<IActionResult> ReversionesF24([FromBody] SuiReversionesRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync(request, repository.GetReversionesF24, cancellationToken);

    [HttpPost("reversionesF35")]
    public Task<IActionResult> ReversionesF35([FromBody] SuiReversionesRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync(request, repository.GetReversionesF35, cancellationToken);

    [HttpPost("reversionesF36")]
    public Task<IActionResult> ReversionesF36([FromBody] SuiReversionesRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync(request, repository.GetReversionesF36, cancellationToken);

    private async Task<IActionResult> ExecuteAsync(
        SuiReversionesRequest request,
        Func<int, CancellationToken, Task<IReadOnlyList<object>>> action,
        CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        if (request is null || request.aps <= 0)
        {
            return BadRequest(new { message = "El campo aps es requerido y debe ser mayor a cero" });
        }

        try
        {
            var resultado = await action(request.aps, cancellationToken);
            return Ok(resultado);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }
}
