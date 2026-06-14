using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/sui")]
public sealed class SuiController(ISuiRepository repository, ILogger<SuiController> logger) : ControllerBase
{
    [HttpPost("consuformu19")]
    public Task<IActionResult> Consuformu19([FromBody] SuiConsultaRequest request, CancellationToken cancellationToken)
        => ConsultarFormatoAsync("F19", request, cancellationToken);

    [HttpPost("consuformu23")]
    public Task<IActionResult> Consuformu23([FromBody] SuiConsultaRequest request, CancellationToken cancellationToken)
        => ConsultarFormatoAsync("F23", request, cancellationToken);

    [HttpPost("consuforma24")]
    public Task<IActionResult> Consuforma24([FromBody] SuiConsultaRequest request, CancellationToken cancellationToken)
        => ConsultarFormatoAsync("F24", request, cancellationToken);

    [HttpPost("consuforma35")]
    public Task<IActionResult> Consuforma35([FromBody] SuiConsultaRequest request, CancellationToken cancellationToken)
        => ConsultarFormatoAsync("F35", request, cancellationToken);

    [HttpPost("consuforma36")]
    public Task<IActionResult> Consuforma36([FromBody] SuiConsultaRequest request, CancellationToken cancellationToken)
        => ConsultarFormatoAsync("F36", request, cancellationToken);

    [HttpPost("getcanCertificate")]
    public async Task<IActionResult> GetcanCertificate([FromBody] SuiConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetCanCertificateAsync(request.Aps, request.Mes, request.Anno, cancellationToken),
            "Prevalidación SUI ejecutada correctamente.");

    [HttpPost("Procesar")]
    public async Task<IActionResult> Procesar([FromBody] SuiProcesarRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () =>
            {
                logger.LogInformation("Intento de proceso SUI. usuario={Usuario} aps={Aps} mes={Mes} anno={Anno} traceId={TraceId}", request.Usuario, request.Aps, request.Mes, request.Anno, HttpContext.TraceIdentifier);
                return await repository.ProcesarAsync(request, cancellationToken);
            },
            "Proceso SUI ejecutado correctamente.");

    [HttpPost("setCargueInfComplemento")]
    public async Task<IActionResult> SetCargueInfComplemento([FromBody] SuiComplementoRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GuardarComplementoAsync(request, cancellationToken),
            "Complemento SUI guardado correctamente.");

    private async Task<IActionResult> ConsultarFormatoAsync(string formato, SuiConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () =>
            {
                var filas = await repository.ConsultarFormatoAsync(formato, request.Aps, request.Mes, request.Anno, cancellationToken);
                var normalizadas = filas
                    .Select(f => f as IDictionary<string, object?> ?? new Dictionary<string, object?>())
                    .ToList();
                return new SuiFormatoResponse(formato, normalizadas);
            },
            $"Consulta {formato} ejecutada correctamente.");

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
        catch (OracleTimeoutException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, "ORA-03135"));
        }
        catch (Oracle.ManagedDataAccess.Client.OracleException ex)
        {
            var friendly = ex.Number switch
            {
                1 => "Conflicto de datos en Oracle durante la operación SUI.",
                1400 => "Faltan datos obligatorios para completar la operación SUI.",
                2291 => "No existe información relacionada para la operación solicitada.",
                20001 => "Formato no aplicable para esta APS según regla apsa_solorell.",
                20002 => "La APS requiere información de relleno para F35/F36 y no está disponible.",
                _ => "Oracle devolvió un error durante la operación SUI."
            };

            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, friendly, HttpContext.TraceIdentifier, $"ORA-{Math.Abs(ex.Number):D5}"));
        }
        catch (Exception ex)
        {
            var oraCode = ex.Message.Contains("ORA-") ? ExtractOraCode(ex.Message) : "ORA-00000";
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, "Ocurrió un error procesando la solicitud SUI.", HttpContext.TraceIdentifier, oraCode));
        }
    }

    private static string? ExtractOraCode(string message)
    {
        var match = System.Text.RegularExpressions.Regex.Match(message, @"ORA-\d+");
        return match.Success ? match.Value : null;
    }
}
