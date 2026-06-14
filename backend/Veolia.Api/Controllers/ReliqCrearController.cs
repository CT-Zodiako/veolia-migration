using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Reliquidacion;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/reliqCrear")]
public sealed class ReliqCrearController(IReliqCrearRepository repository) : ControllerBase
{
    [HttpPost("crear")]
    public async Task<IActionResult> Crear([FromBody] CrearReliquidacionRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.ApsaId <= 0)
            return UnprocessableEntity(Envelope("error", null, "apsaId es obligatorio."));

        var relqNombre = (string.IsNullOrWhiteSpace(request.RelqNombre) ? request.Nombre : request.RelqNombre) ?? string.Empty;
        var relqDescripcion = request.RelqDescripcion ?? request.Descripcion;
        var relqDesde = (string.IsNullOrWhiteSpace(request.RelqDesde) ? request.Desde : request.RelqDesde) ?? string.Empty;
        var relqHasta = (string.IsNullOrWhiteSpace(request.RelqHasta) ? request.Hasta : request.RelqHasta) ?? string.Empty;

        if (string.IsNullOrWhiteSpace(relqNombre))
            return UnprocessableEntity(Envelope("error", null, "relqNombre es obligatorio."));

        if (!PeriodoValido(relqDesde) || !PeriodoValido(relqHasta) || string.CompareOrdinal(relqDesde, relqHasta) > 0)
            return UnprocessableEntity(Envelope("error", null, "RANGO_PERIODO_INVALIDO"));

        request.RelqNombre = relqNombre;
        request.RelqDescripcion = relqDescripcion;
        request.RelqDesde = relqDesde;
        request.RelqHasta = relqHasta;

        try
        {
            var created = await repository.CrearAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("ok", created, "Reliquidación creada correctamente."));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("getReliquidaciones")]
    public async Task<IActionResult> GetReliquidaciones([FromBody] ApsPayload payload, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (payload.ApsaId <= 0)
            return UnprocessableEntity(Envelope("error", null, "apsaId es obligatorio."));

        try
        {
            var data = await repository.GetReliquidacionesAsync(payload.ApsaId, cancellationToken);
            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("getReliquidacionByAps")]
    public async Task<IActionResult> GetReliquidacionByAps([FromBody] ApsPayload payload, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (payload.ApsaId <= 0)
            return UnprocessableEntity(Envelope("error", null, "apsaId es obligatorio."));

        try
        {
            var data = await repository.GetReliquidacionByApsAsync(payload.ApsaId, cancellationToken);
            if (data is null)
                return NotFound(Envelope("error", null, "No se encontró reliquidación para el APS."));

            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] ActualizarReliquidacionRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.RelqId <= 0 || request.ApsaId <= 0)
            return UnprocessableEntity(Envelope("error", null, "relqId y apsaId son obligatorios."));

        var relqNombre = (string.IsNullOrWhiteSpace(request.RelqNombre) ? request.Nombre : request.RelqNombre) ?? string.Empty;
        var relqDescripcion = request.RelqDescripcion ?? request.Descripcion;
        var relqDesde = (string.IsNullOrWhiteSpace(request.RelqDesde) ? request.Desde : request.RelqDesde) ?? string.Empty;
        var relqHasta = (string.IsNullOrWhiteSpace(request.RelqHasta) ? request.Hasta : request.RelqHasta) ?? string.Empty;

        if (string.IsNullOrWhiteSpace(relqNombre))
            return UnprocessableEntity(Envelope("error", null, "relqNombre es obligatorio."));

        if (!PeriodoValido(relqDesde) || !PeriodoValido(relqHasta) || string.CompareOrdinal(relqDesde, relqHasta) > 0)
            return UnprocessableEntity(Envelope("error", null, "RANGO_PERIODO_INVALIDO"));

        request.RelqNombre = relqNombre;
        request.RelqDescripcion = relqDescripcion;
        request.RelqDesde = relqDesde;
        request.RelqHasta = relqHasta;

        try
        {
            var updated = await repository.ActualizarAsync(request, tokenContext.SisuId, cancellationToken);
            if (!updated)
                return NotFound(Envelope("error", null, "No se encontró la reliquidación."));

            return Ok(Envelope("ok", new { request.RelqId }, "Reliquidación actualizada correctamente."));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] RelqPayload payload, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (payload.RelqId <= 0)
            return UnprocessableEntity(Envelope("error", null, "relqId es obligatorio."));

        try
        {
            var deleted = await repository.EliminarAsync(payload.RelqId, cancellationToken);
            if (!deleted)
                return NotFound(Envelope("error", null, "No se encontró la reliquidación."));

            return Ok(Envelope("ok", new { payload.RelqId }, "Reliquidación eliminada correctamente."));
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

    private static bool PeriodoValido(string periodo)
        => !string.IsNullOrWhiteSpace(periodo)
           && periodo.Length == 6
           && int.TryParse(periodo[..4], out _)
           && int.TryParse(periodo[4..], out var mes)
           && mes is >= 1 and <= 12;

    public sealed class ApsPayload
    {
        public long ApsaId { get; set; }
    }

    public sealed class RelqPayload
    {
        public long RelqId { get; set; }
    }
}
