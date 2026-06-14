using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Reliquidacion;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/reliqTarificador")]
public sealed class ReliqTarificadorController(IReliqTarificadorRepository repository) : ControllerBase
{
    [HttpPost("resumenUsuarios")]
    public Task<IActionResult> ResumenUsuarios([FromBody] AprobarReliquidacionRequestDto request, CancellationToken cancellationToken)
        => GetResumenAsync(request, repository.ResumenUsuariosAsync, cancellationToken);

    [HttpPost("resumenEmpresa")]
    public Task<IActionResult> ResumenEmpresa([FromBody] AprobarReliquidacionRequestDto request, CancellationToken cancellationToken)
        => GetResumenAsync(request, repository.ResumenEmpresaAsync, cancellationToken);

    [HttpPost("resumenAdicional")]
    public Task<IActionResult> ResumenAdicional([FromBody] AprobarReliquidacionRequestDto request, CancellationToken cancellationToken)
        => GetResumenAsync(request, repository.ResumenAdicionalAsync, cancellationToken);

    [HttpPost("resumenRelleno")]
    public Task<IActionResult> ResumenRelleno([FromBody] AprobarReliquidacionRequestDto request, CancellationToken cancellationToken)
        => GetResumenAsync(request, repository.ResumenRellenoAsync, cancellationToken);

    [HttpPost("resumenAPS")]
    public Task<IActionResult> ResumenAps([FromBody] AprobarReliquidacionRequestDto request, CancellationToken cancellationToken)
        => GetResumenAsync(request, repository.ResumenApsAsync, cancellationToken);

    [HttpPost("aprobarReliquidacion")]
    public async Task<IActionResult> AprobarReliquidacion([FromBody] AprobarReliquidacionRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.ReliqId <= 0)
            return UnprocessableEntity(Envelope("error", null, "reliqId es obligatorio."));

        try
        {
            var estado = await repository.EstadoReliquidacionAsync(request.ReliqId, cancellationToken);
            if (string.IsNullOrWhiteSpace(estado))
                return NotFound(Envelope("error", null, "RELIQ_NOT_FOUND"));

            var puedeAprobar = EsEstadoAprobable(estado);
            if (!puedeAprobar)
            {
                var estadoActual = new EstadoReliquidacionResponseDto
                {
                    Ok = true,
                    Estado = estado,
                    PuedeAprobar = false
                };

                return Conflict(Envelope("error", estadoActual, "RELIQ_ALREADY_APPLIED"));
            }

            var resultado = await repository.AprobarReliquidacionAsync(request.ReliqId, tokenContext.SisuId, cancellationToken);
            var data = new
            {
                ok = string.Equals(resultado, "STUB_OK", StringComparison.OrdinalIgnoreCase) || string.Equals(resultado, "OK", StringComparison.OrdinalIgnoreCase),
                resultado
            };

            return Ok(Envelope("ok", data, "Reliquidación aprobada."));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("estadoReliquidacion")]
    public async Task<IActionResult> EstadoReliquidacion([FromBody] AprobarReliquidacionRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.ReliqId <= 0)
            return UnprocessableEntity(Envelope("error", null, "reliqId es obligatorio."));

        try
        {
            var estado = await repository.EstadoReliquidacionAsync(request.ReliqId, cancellationToken);
            if (string.IsNullOrWhiteSpace(estado))
                return NotFound(Envelope("error", null, "RELIQ_NOT_FOUND"));

            var data = new EstadoReliquidacionResponseDto
            {
                Ok = true,
                Estado = estado,
                PuedeAprobar = EsEstadoAprobable(estado)
            };

            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    private async Task<IActionResult> GetResumenAsync(
        AprobarReliquidacionRequestDto request,
        Func<long, CancellationToken, Task<ResumenResponseDto?>> getResumen,
        CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.ReliqId <= 0)
            return UnprocessableEntity(Envelope("error", null, "reliqId es obligatorio."));

        try
        {
            var data = await getResumen(request.ReliqId, cancellationToken);
            if (data is null)
                return NotFound(Envelope("error", null, "RELIQ_NOT_FOUND"));

            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private object Envelope(string status, object? data, string message)
        => new { status, data, message, traceId = HttpContext.TraceIdentifier };

    private static bool EsEstadoAprobable(string estado)
        => string.Equals(estado, "1", StringComparison.OrdinalIgnoreCase)
           || string.Equals(estado, "CREADA", StringComparison.OrdinalIgnoreCase);
}
