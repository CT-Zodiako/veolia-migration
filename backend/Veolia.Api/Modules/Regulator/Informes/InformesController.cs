using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Regulator.Informes;

[ApiController]
[Route("api/v1/informes")]
public sealed class InformesController(IInformesRepository repository) : ControllerBase
{
    [HttpGet("costos")]
    public async Task<IActionResult> Costos([FromQuery] int aps, [FromQuery] int anno, [FromQuery] int mes, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            var unauthorized = new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null);
            return Unauthorized(unauthorized);
        }

        return await ExecuteAsync(
            async () =>
            {
                var resultado = await repository.GetResumenVariablesAsync(aps, anno, mes, cancellationToken);
                return resultado ?? InformeDocument.Empty();
            },
            "Resumen de variables consultado correctamente.");
    }

    [HttpGet("clus")]
    public async Task<IActionResult> Clus([FromQuery] int aps, [FromQuery] int anno, [FromQuery] int mes, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            var unauthorized = new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null);
            return Unauthorized(unauthorized);
        }

        return await ExecuteAsync(
            async () =>
            {
                var resultado = await repository.GetClusJsonAsync(aps, anno, mes, cancellationToken);
                return resultado ?? InformeDocument.Empty();
            },
            "Componentes CLUS consultados correctamente.");
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private async Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, string successMessage)
    {
        if (!TryReadTokenContext(out _))
        {
            var unauthorized = new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null);
            return Unauthorized(unauthorized);
        }

        try
        {
            var data = await action();
            return Ok(new ApiEnvelopeResponse<T>("success", data, successMessage, HttpContext.TraceIdentifier, null));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, null));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, null));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, null));
        }
        catch (ConflictException ex)
        {
            return StatusCode(StatusCodes.Status409Conflict, new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, null));
        }
        catch (PreconditionFailedException ex)
        {
            return StatusCode(StatusCodes.Status412PreconditionFailed, new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, null));
        }
    }
}
