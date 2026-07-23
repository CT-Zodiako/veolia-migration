using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Proyecciones;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/proyecciones")]
public sealed class ProyeccionesController(
    IProyeccionRepository repository,
    ILineaTiempoRepository lineaTiempoRepository,
    ICrecimientoRepository crecimientoRepository,
    ISubcontProyRepository subcontProyRepository,
    IEjecucionProyeccionRepository ejecucionProyeccionRepository) : ControllerBase
{
    [HttpPost("consulta")]
    public async Task<IActionResult> Consulta([FromBody] ProyeccionConsultaRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var data = await repository.ConsultaAsync(request.ApsaId, cancellationToken);
            return Ok(Envelope(true, data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("consultageneral")]
    public async Task<IActionResult> ConsultaGeneral([FromBody] ProyeccionConsultaRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var data = await repository.ConsultaGeneralAsync(request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope(true, data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("consultaproy")]
    public async Task<IActionResult> ConsultaProy([FromBody] IdPayload payload, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var data = await repository.ConsultaProyAsync(payload.Id, cancellationToken);
            if (data is null)
                return NotFound(Envelope(false, null, "No se encontró la proyección."));

            return Ok(Envelope(true, data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("crear")]
    public async Task<IActionResult> Crear([FromBody] ProyeccionCreateRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        if (string.IsNullOrWhiteSpace(request.ProyNombre))
            return BadRequest(Envelope(false, null, "El nombre de la proyección es obligatorio."));

        if (request.ProyAnnoDes > request.ProyAnnoHas || (request.ProyAnnoDes == request.ProyAnnoHas && request.ProyMesDes > request.ProyMesHas))
            return BadRequest(Envelope(false, null, "El período inicial no puede ser posterior al período final."));

        try
        {
            var result = await repository.CrearAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope(result.Success, result, result.Message ?? "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPut("editar/{id:long}")]
    public async Task<IActionResult> Editar(long id, [FromBody] ProyeccionUpdateRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var result = await repository.EditarAsync(id, request, cancellationToken);
            return Ok(Envelope(result.Success, result, result.Message ?? "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpDelete("eliminar/{id:long}")]
    public async Task<IActionResult> Eliminar(long id, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var result = await repository.EliminarAsync(id, cancellationToken);
            return Ok(Envelope(result.Success, result, result.Message ?? "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("ultimastarifas")]
    public async Task<IActionResult> UltimasTarifas([FromBody] ApsPayload payload, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var data = await repository.UltimasTarifasAsync(payload.ApsaId, cancellationToken);
            return Ok(Envelope(true, data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("consultabyid")]
    public async Task<IActionResult> ConsultaById([FromBody] IdPayload payload, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var data = await lineaTiempoRepository.GetByProyeccionAsync(payload.Id, cancellationToken);
            return Ok(Envelope(true, data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("registrarlineatiempo")]
    public async Task<IActionResult> RegistrarLineaTiempo([FromBody] LineaTiempoUpsertRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        if (request.ProyId <= 0)
            return BadRequest(Envelope(false, null, "El ID de proyección es obligatorio."));

        if (request.Rows == null || request.Rows.Count == 0)
            return BadRequest(Envelope(false, null, "Debe proporcionar al menos una fila de línea de tiempo."));

        try
        {
            var result = await lineaTiempoRepository.UpsertAsync(request, cancellationToken);
            return Ok(Envelope(result.Success, result, result.Message ?? "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("consultarcrecimiento")]
    public async Task<IActionResult> ConsultarCrecimiento([FromBody] CrecimientoConsultaRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var data = await crecimientoRepository.ConsultarAsync(request.ProyId, cancellationToken);
            return Ok(Envelope(true, data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("registrarcrecimientousuarios")]
    public async Task<IActionResult> RegistrarCrecimientoUsuarios([FromBody] CrecimientoUsuariosRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var result = await crecimientoRepository.RegistrarUsuariosAsync(request, cancellationToken);
            return Ok(Envelope(result.Success, result, result.Message ?? "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("registrarcrecimientoinfpropia")]
    public async Task<IActionResult> RegistrarCrecimientoPropia([FromBody] CrecimientoPropiaRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var result = await crecimientoRepository.RegistrarPropiaAsync(request, cancellationToken);
            return Ok(Envelope(result.Success, result, result.Message ?? "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("registrarcrecimientoinfterceros")]
    public async Task<IActionResult> RegistrarCrecimientoTerceros([FromBody] CrecimientoTercerosRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var result = await crecimientoRepository.RegistrarTercerosAsync(request, cancellationToken);
            return Ok(Envelope(result.Success, result, result.Message ?? "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("registrardescuento")]
    public async Task<IActionResult> RegistrarDescuento([FromBody] DescuentosRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var result = await crecimientoRepository.RegistrarDescuentosAsync(request, cancellationToken);
            return Ok(Envelope(result.Success, result, result.Message ?? "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("consultasubcont")]
    public async Task<IActionResult> ConsultaSubcont([FromBody] SubcontConsultaRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var data = await subcontProyRepository.GetSubcontAsync(request, cancellationToken);
            return Ok(Envelope(true, data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("editarPorcSubCon")]
    public async Task<IActionResult> EditarPorcSubCon([FromBody] SubcontUpsertRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        try
        {
            var result = await subcontProyRepository.UpsertSubcontAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope(result.Success, result, result.Message ?? "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("ejecutarproyectar")]
    public async Task<IActionResult> EjecutarProyectar([FromBody] EjecutarProyeccionRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope(false, null, "No Autorizado!"));

        if (request.ProyId <= 0)
            return BadRequest(Envelope(false, null, "El ID de proyección es obligatorio."));

        if (request.ApsaId <= 0)
            return BadRequest(Envelope(false, null, "El ID de APS es obligatorio."));

        try
        {
            var resultado = await ejecucionProyeccionRepository.EjecutarProyectarAsync(request.ProyId, request.ApsaId, tokenContext.SisuId, cancellationToken);
            var response = new EjecutarProyeccionResponse
            {
                Success = string.Equals(resultado, "STUB_OK", StringComparison.OrdinalIgnoreCase),
                Resultado = resultado
            };

            return Ok(Envelope(response.Success, response, response.Success ? "OK" : "Ejecución finalizada con observaciones."));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope(false, null, $"Error: {ex.Message}"));
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private object Envelope(bool status, object? data, string message)
        => new { status, data, message, traceId = HttpContext.TraceIdentifier };

    public sealed class IdPayload
    {
        public long Id { get; set; }
    }

    public sealed class ApsPayload
    {
        public long ApsaId { get; set; }
    }
}
