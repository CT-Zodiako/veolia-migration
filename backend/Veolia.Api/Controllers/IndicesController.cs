using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Indices;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/indices")]
public sealed class IndicesController(IIndicesRepository repository) : ControllerBase
{
    [HttpPost("consulta")]
    public async Task<IActionResult> Consulta([FromBody] IndicesConsultaRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var rows = await repository.GetByPeriodAsync(request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        try
        {
            var rows = await repository.GetAllAsync(cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> ObtenerPorId(long id, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (id <= 0)
            return BadRequest(Envelope("error", Array.Empty<object>(), "id inválido."));

        try
        {
            var row = await repository.GetByIdAsync(id, cancellationToken);
            if (row is null)
                return NotFound(Envelope("error", Array.Empty<object>(), "Índice no encontrado."));

            return Ok(Envelope("success", row, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPost("crear")]
    public async Task<IActionResult> Crear([FromBody] IndicesCrearRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (!PayloadValido(request.Anno, request.Mes, request.Valores))
            return BadRequest(Envelope("error", Array.Empty<object>(), "Payload inválido para crear índices."));

        try
        {
            var id = await repository.CrearAsync(request, tokenContext.SisuId, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, Envelope("success", new { id }, "Índices creados."));
        }
        catch (InvalidOperationException ex) when (ex.Message == "DUPLICATE_PERIOD")
        {
            return Conflict(Envelope("error", Array.Empty<object>(), "Ya existen índices activos para ese período."));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpPut("editar")]
    public async Task<IActionResult> Editar([FromBody] IndicesEditarRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (!PayloadValido(request.Anno, request.Mes, request.Valores))
            return BadRequest(Envelope("error", Array.Empty<object>(), "Payload inválido para editar índices."));

        try
        {
            var updated = await repository.EditarAsync(request, cancellationToken);
            if (!updated)
                return NotFound(Envelope("error", Array.Empty<object>(), "Índices no encontrados para el período."));

            var rows = await repository.GetByPeriodAsync(request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "Índices actualizados."));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    [HttpDelete("eliminar/{id:long}")]
    public async Task<IActionResult> Eliminar(long id, [FromQuery] int anno, [FromQuery] int mes, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (id <= 0 || anno <= 0 || mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "id, anno y mes son obligatorios."));

        try
        {
            var deleted = await repository.EliminarAsync(id, anno, mes, cancellationToken);
            if (!deleted)
                return NotFound(Envelope("error", Array.Empty<object>(), "Índice no encontrado o ya eliminado."));

            return Ok(Envelope("success", new { id, deleted = true }, "Índice eliminado."));
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

    private static bool PayloadValido(int anno, int mes, List<IndiceValorDto>? valores)
        => anno > 0 && mes is >= 1 and <= 12 && valores is { Count: > 0 } && valores.All(v => v.Id > 0);

    private ApiEnvelopeResponse<T> Envelope<T>(string status, T data, string message)
        => new(status, data, message, HttpContext.TraceIdentifier, null);
}
