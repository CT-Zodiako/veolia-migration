using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Veolia.Api.Contracts.Pgirs;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/pgirs")]
public sealed class PgirsController(IPgirsRepository repository, ILogger<PgirsController> logger) : ControllerBase
{
    // ========== CANONICAL ENDPOINTS (correct semantics) ==========

    [HttpPost("resumen")]
    public async Task<IActionResult> GetResumen([FromBody] ApsRequestDto request)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.ApsId <= 0)
            return BadRequest(Envelope("error", Array.Empty<object>(), "aps es obligatorio."));

        try
        {
            var rows = await repository.GetResumenAsync(request.ApsId);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("informe-variables")]
    public async Task<IActionResult> GetInformeVariables([FromBody] ApsRequestDto request)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.ApsId <= 0)
            return BadRequest(Envelope("error", Array.Empty<object>(), "aps es obligatorio."));

        try
        {
            var rows = await repository.GetInformeVariablesAsync(request.ApsId);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("barrido")]
    public async Task<IActionResult> GetBarrido([FromBody] ApsRequestDto request)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.ApsId <= 0)
            return BadRequest(Envelope("error", Array.Empty<object>(), "aps es obligatorio."));

        try
        {
            var rows = await repository.GetBarridoAsync(request.ApsId);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("variables")]
    public async Task<IActionResult> GetVariables([FromBody] VariablesQueryRequestDto request)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.ApsId <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var rows = await repository.GetVariablesAsync(request.ApsId, request.Anno, request.Mes);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("actualizar-variable")]
    public async Task<IActionResult> ActualizarVariables([FromBody] EditarVariablesRequestDto request)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Variables == null || request.Variables.Count == 0)
            return BadRequest(Envelope("error", Array.Empty<object>(), "datatable es obligatorio."));

        try
        {
            var success = await repository.EditarVariablesAsync(request.Variables, tokenContext.SisuId);
            return Ok(Envelope("success", success, success ? "Variables actualizadas" : "Error"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("guardar")]
    public async Task<IActionResult> GuardarVariables([FromBody] NuevoVariablesRequestDto request)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.ApsId <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios."));

        try
        {
            var success = await repository.NuevoVariablesAsync(request, tokenContext.SisuId);
            return Ok(Envelope("success", success, success ? "Variables creadas" : "Error"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    // ========== LEGACY ALIASES (temporary backward compatibility) ==========

    [HttpPost("infoPgirs")]
    public Task<IActionResult> LegacyInfoPgirs([FromBody] ApsRequestDto request)
    {
        logger.LogWarning("Deprecated endpoint {Endpoint} called. Use {Canonical} instead.", "infoPgirs", "resumen");
        return GetResumen(request);
    }

    [HttpPost("informePgirs")]
    public Task<IActionResult> LegacyInformePgirs([FromBody] ApsRequestDto request)
    {
        logger.LogWarning("Deprecated endpoint {Endpoint} called. Use {Canonical} instead.", "informePgirs", "informe-variables");
        return GetInformeVariables(request);
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private ApiEnvelopeResponse<T> Envelope<T>(string status, T data, string message)
        => new(status, data, message, HttpContext.TraceIdentifier, null);
}
