using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/informes")]
public sealed class InformesController(IInformesRepository repository, ILogger<InformesController> logger) : ControllerBase
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
                return resultado ?? new InformeCostosResponse(string.Empty, []);
            },
            "Resumen de variables consultado correctamente.");
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
        catch (Oracle.ManagedDataAccess.Client.OracleException ex)
        {
            var friendly = ex.Number switch
            {
                1 => "Conflicto de datos en Oracle durante la consulta de informes.",
                1400 => "Faltan datos obligatorios para completar la consulta de informes.",
                2291 => "No existe información relacionada para la consulta solicitada.",
                _ => "Oracle devolvió un error durante la consulta de informes."
            };

            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, friendly, HttpContext.TraceIdentifier, $"ORA-{Math.Abs(ex.Number):D5}"));
        }
        catch (Exception ex)
        {
            var oraCode = ex.Message.Contains("ORA-") ? ExtractOraCode(ex.Message) : "ORA-00000";
            logger.LogError(ex, "Error consultando resumen de variables.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, "Ocurrió un error consultando el resumen de variables.", HttpContext.TraceIdentifier, oraCode));
        }
    }

    private static string? ExtractOraCode(string message)
    {
        var match = System.Text.RegularExpressions.Regex.Match(message, @"ORA-\d+");
        return match.Success ? match.Value : null;
    }
}
