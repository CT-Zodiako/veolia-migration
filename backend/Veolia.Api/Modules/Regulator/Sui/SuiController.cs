using Microsoft.AspNetCore.Mvc;
using Oracle.ManagedDataAccess.Client;
using System.ComponentModel.DataAnnotations;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Regulator.Sui;

[ApiController]
[Route("api/v1/sui")]
public sealed class SuiController(ISuiRepository repository, ILogger<SuiController> logger) : ControllerBase
{
    [HttpPost("dashboard")]
    public async Task<IActionResult> Dashboard([FromBody] SuiDashboardRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            var unauthorized = new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null);
            return Unauthorized(unauthorized);
        }

        return await ExecuteAsync(
            async () => await repository.DashboardAsync(request.Anno, request.Mes, tokenContext.SisuId, cancellationToken),
            "Dashboard SUI consultado correctamente.");
    }

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

    [HttpPost("resumenF19")]
    public Task<IActionResult> ResumenF19([FromBody] SuiResumenRequest? request, CancellationToken cancellationToken)
        => ResumenFormatoAsync("F19", request, cancellationToken);

    [HttpPost("resumenF23")]
    public Task<IActionResult> ResumenF23([FromBody] SuiResumenRequest? request, CancellationToken cancellationToken)
        => ResumenFormatoAsync("F23", request, cancellationToken);

    [HttpPost("resumenF24")]
    public Task<IActionResult> ResumenF24([FromBody] SuiResumenRequest? request, CancellationToken cancellationToken)
        => ResumenFormatoAsync("F24", request, cancellationToken);

    [HttpPost("resumenF35")]
    public Task<IActionResult> ResumenF35([FromBody] SuiResumenRequest? request, CancellationToken cancellationToken)
        => ResumenFormatoAsync("F35", request, cancellationToken);

    [HttpPost("resumenF36")]
    public Task<IActionResult> ResumenF36([FromBody] SuiResumenRequest? request, CancellationToken cancellationToken)
        => ResumenFormatoAsync("F36", request, cancellationToken);

    [HttpPost("getcanCertificate")]
    public async Task<IActionResult> GetcanCertificate([FromBody] SuiConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.GetCanCertificateAsync(request.Aps, request.Mes, request.Anno, cancellationToken),
            "Prevalidación SUI ejecutada correctamente.");

    // Legacy sui/routes.js passes req.SISU_ID (the token user), never a body field.
    [HttpPost("Procesar")]
    public async Task<IActionResult> Procesar([FromBody] SuiProcesarRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async usuario =>
            {
                logger.LogInformation("Intento de proceso SUI. usuario={Usuario} aps={Aps} mes={Mes} anno={Anno} traceId={TraceId}", usuario, request.Aps, request.Mes, request.Anno, HttpContext.TraceIdentifier);
                return await repository.ProcesarAsync(request, usuario, cancellationToken);
            },
            "Proceso SUI ejecutado correctamente.");

    [HttpPost("setCargueInfComplemento")]
    public async Task<IActionResult> SetCargueInfComplemento([FromBody] SuiComplementoRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async usuario => await repository.GuardarComplementoAsync(request, usuario, cancellationToken),
            "Complemento SUI guardado correctamente.");

    [HttpPost("existenArchivosGenerados")]
    public async Task<IActionResult> ExistenArchivosGenerados([FromBody] SuiConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.ExistenArchivosGeneradosAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Verificación de archivos generados ejecutada correctamente.");

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

    private async Task<IActionResult> ResumenFormatoAsync(string formato, SuiResumenRequest? request, CancellationToken cancellationToken)
    {
        if (request is null || request.Aps <= 0)
        {
            var envelope = new ApiEnvelopeResponse<object>("error", new { }, "El APS es obligatorio.", HttpContext.TraceIdentifier, null);
            return BadRequest(envelope);
        }

        return await ExecuteAsync(
            async () =>
            {
                var filas = await repository.ResumenFormatosAsync(formato, request.Aps, cancellationToken);
                return new SuiResumenFormatosResponse(formato, filas);
            },
            $"Resumen {formato} ejecutado correctamente.");
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, string successMessage)
        => ExecuteAsync(_ => action(), successMessage);

    /// <summary>Runs <paramref name="action"/> with the token user (SISU_ID) after validating the token.</summary>
    private async Task<IActionResult> ExecuteAsync<T>(Func<long, Task<T>> action, string successMessage)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            var unauthorized = new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null);
            return Unauthorized(unauthorized);
        }

        try
        {
            var data = await action(tokenContext.SisuId);
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
        // PK_SUI raises ORA-20001/20002 for the apsa_solorell rules, but the package source in the repo
        // (Database/Fase3IntegracionSui/PK_SUI.sql) carries no readable text for them, so these keep their messages.
        catch (Exception ex) when (ReglaSui(ex) is { } regla)
        {
            logger.LogError(ex, "Regla SUI rechazada {OraCode} usuario={Usuario} endpoint={Endpoint} traceId={TraceId}",
                regla.OraCode, tokenContext.SisuId, $"{Request.Method} {Request.Path}", HttpContext.TraceIdentifier);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, regla.Mensaje, HttpContext.TraceIdentifier, regla.OraCode));
        }
    }

    private static (string OraCode, string Mensaje)? ReglaSui(Exception ex)
    {
        var number = ex switch
        {
            OracleException oracle => oracle.Number,
            OracleOperationException wrapped => wrapped.OraNumber,
            _ => 0
        };

        return Math.Abs(number) switch
        {
            20001 => ("ORA-20001", "Formato no aplicable para esta APS según regla apsa_solorell."),
            20002 => ("ORA-20002", "La APS requiere información de relleno para F35/F36 y no está disponible."),
            _ => null
        };
    }
}
