using Microsoft.AspNetCore.Mvc;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Contracts.InfoGerencial;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/infogerencial")]
public sealed class InfoGerencialController(IInfoGerencialRepository repository) : ControllerBase
{
    [HttpPost("detcostos")]
    public async Task<IActionResult> GetDetalleCostos([FromBody] PeriodoRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var rows = await repository.GetDetalleCostosAsync(request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (OracleException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Oracle error: {ex.Message}"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("detsubaporte")]
    public async Task<IActionResult> GetDetalleSubAporte([FromBody] PeriodoRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var rows = await repository.GetDetalleSubAporteAsync(request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (OracleException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Oracle error: {ex.Message}"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("infoapsemprdivi")]
    public async Task<IActionResult> GetInfoApsEmprDivi([FromBody] ApsPeriodoRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var rows = await repository.GetInfoApsEmprDiviAsync(request.Aps, request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (OracleException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Oracle error: {ex.Message}"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("infoemprdivi")]
    public async Task<IActionResult> GetInfoEmprDivi([FromBody] ApsPeriodoRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var rows = await repository.GetInfoEmprDiviAsync(request.Aps, request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (OracleException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Oracle error: {ex.Message}"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("infoapsrelleno")]
    public async Task<IActionResult> GetInfoApsRelleno([FromBody] ApsPeriodoRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var rows = await repository.GetInfoApsRellenoAsync(request.Aps, request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (OracleException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Oracle error: {ex.Message}"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("getDashBoardGerencial")]
    public async Task<IActionResult> GetDashBoardGerencial([FromBody] PeriodoRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var rows = await repository.GetDashBoardGerencialAsync(request.Anno, request.Mes, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (OracleException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Oracle error: {ex.Message}"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("costoPoda")]
    public async Task<IActionResult> GetCostoPoda([FromBody] ApsRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Aps <= 0)
            return BadRequest(Envelope("error", Array.Empty<object>(), "aps es obligatorio."));

        try
        {
            var rows = await repository.GetCostoPodaAsync(request.Aps, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (OracleException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Oracle error: {ex.Message}"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private ApiEnvelopeResponse<T> Envelope<T>(string status, T data, string message)
        => new(status, data, message, HttpContext.TraceIdentifier, null);
}
