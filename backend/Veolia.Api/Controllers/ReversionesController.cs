using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/reversiones")]
public sealed class ReversionesController(IReversionesRepository reversionesRepository) : ControllerBase
{
    [HttpPost("crearAutorizacion")]
    public async Task<IActionResult> CrearAutorizacion([FromBody] ReversionesAutorizacionRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var resultado = await reversionesRepository.CrearAutorizacion(
                request.aps,
                request.anno,
                request.mes,
                request.descripcion,
                (int)tokenContext.SisuId,
                cancellationToken);

            return Ok(resultado);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpGet("detalladoAutorizacion")]
    public async Task<IActionResult> DetalladoAutorizacion(CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var data = await reversionesRepository.DetalladoAutorizacion((int)tokenContext.SisuId, cancellationToken);
            return Ok(data);
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

public sealed class ReversionesAutorizacionRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int aps { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int anno { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int mes { get; init; }

    [Required(ErrorMessage = "La descripción es obligatoria.")]
    [MinLength(3, ErrorMessage = "La descripción debe tener al menos 3 caracteres.")]
    [MaxLength(500, ErrorMessage = "La descripción no puede superar 500 caracteres.")]
    public string descripcion { get; init; } = string.Empty;
}
