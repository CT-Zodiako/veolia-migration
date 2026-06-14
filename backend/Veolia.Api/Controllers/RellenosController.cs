using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/rellenos")]
public sealed class RellenosController(IRellenosRepository rellenosRepository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var data = await rellenosRepository.ListarAsync(cancellationToken);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = $"Error: {ex.Message} | {ex.StackTrace}" });
        }
    }

    [HttpPost("consultarrelleno")]
    public async Task<IActionResult> Consultar([FromBody] RellenoRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var data = await rellenosRepository.ConsultarAsync(request, cancellationToken);
            return Ok(data);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("crear")]
    public async Task<IActionResult> Crear([FromBody] CrearRellenoRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await rellenosRepository.CrearAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(result);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPut("editar/{id:long}")]
    public async Task<IActionResult> Editar(long id, [FromBody] EditarRellenoRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await rellenosRepository.EditarAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpDelete("eliminar/{id:long}")]
    public async Task<IActionResult> Eliminar(long id, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await rellenosRepository.EliminarAsync(id, cancellationToken);
            return Ok(result);
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
