using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Aprovechamiento;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/aprovechamiento")]
public sealed class AprovechamientoController(IAprovechamientoRepository repository) : ControllerBase
{
    [HttpPost("consulta")]
    public async Task<IActionResult> Consulta([FromBody] AprovechamientoConsultaRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", (object?)null, "No autorizado."));

        if (!PeriodoValido(request.Aps, request.Anno, request.Mes))
            return BadRequest(Envelope("error", (object?)null, "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var row = await repository.ConsultarAsync(request.Aps, request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", row, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", (object?)null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("actualizar")]
    public async Task<IActionResult> Actualizar([FromBody] AprovechamientoActualizarRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", (object?)null, "No autorizado."));

        if (!PeriodoValido(request.Aps, request.Anno, request.Mes))
            return BadRequest(Envelope("error", (object?)null, "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            await repository.ActualizarAsync(request.Aps, request.Anno, request.Mes, request.Activar, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("success", (object?)null, "Estado de aprovechamiento actualizado."));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", (object?)null, $"Error: {ex.Message}"));
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private static bool PeriodoValido(int aps, int anno, int mes)
        => aps > 0 && anno > 0 && mes is >= 1 and <= 12;

    private ApiEnvelopeResponse<T> Envelope<T>(string status, T data, string message)
        => new(status, data, message, HttpContext.TraceIdentifier, null);
}
