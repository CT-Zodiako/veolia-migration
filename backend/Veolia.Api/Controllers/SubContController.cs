using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.SubCont;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/subcon")]
public sealed class SubContController(ISubContRepository repository) : ControllerBase
{
    [HttpPost("consulta")]
    public async Task<IActionResult> Consultar([FromBody] SubContConsultaRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(new { message = "No Autorizado!" });

        try
        {
            var data = await repository.ConsultarAsync(request.Aps, request.Anno, request.Mes, cancellationToken);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = $"Error: {ex.Message}" });
        }
    }

    [HttpPost("crear")]
    public async Task<IActionResult> Crear([FromBody] SubContCrearRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(new { message = "No Autorizado!" });

        try
        {
            var result = await repository.CrearAsync(
                request.Aps, request.Anno, request.Mes, request.Valores, tokenContext.SisuId, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = $"Error: {ex.Message}" });
        }
    }

    [HttpPut("editar")]
    public async Task<IActionResult> Editar([FromBody] SubContEditarRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(new { message = "No Autorizado!" });

        try
        {
            var result = await repository.EditarAsync(
                request.Aps, request.Anno, request.Mes, request.Valores, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = $"Error: {ex.Message}" });
        }
    }

    [HttpGet]
    public async Task<IActionResult> ListarAps(CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(new { message = "No Autorizado!" });

        try
        {
            var data = await repository.ListarApsAsync(cancellationToken);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = $"Error: {ex.Message}" });
        }
    }

    [HttpDelete("eliminar/{id:long}")]
    public async Task<IActionResult> Eliminar(long id, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(new { message = "No Autorizado!" });

        try
        {
            var result = await repository.EliminarAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = $"Error: {ex.Message}" });
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }
}
