using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/facturacion")]
public sealed class FacturacionController(IFacturacionRepository repository, ILogger<FacturacionController> logger) : ControllerBase
{
    [HttpPost("facturacion")]
    public Task<IActionResult> Facturacion([FromBody] FacturacionRequest request, CancellationToken cancellationToken)
        => ConsultarAsync("facturacion", request, cancellationToken, rows => new FacturacionResponse(BuildMeta(request), rows), "Consulta de facturación ejecutada correctamente.");

    [HttpPost("detafacturacion")]
    public Task<IActionResult> DetaFacturacion([FromBody] FacturacionRequest request, CancellationToken cancellationToken)
        => ConsultarAsync("detafacturacion", request, cancellationToken, rows => new DetaFacturacionResponse(BuildMeta(request), rows), "Consulta de detalle de facturación ejecutada correctamente.");

    [HttpPost("facturacionclus")]
    public Task<IActionResult> FacturacionClus([FromBody] FacturacionRequest request, CancellationToken cancellationToken)
        => ConsultarAsync("facturacionclus", request, cancellationToken, rows => new FacturacionClusResponse(BuildMeta(request), rows), "Consulta de facturación clúster ejecutada correctamente.");

    [HttpPost("facturaciondinc")]
    public Task<IActionResult> FacturacionDinc([FromBody] FacturacionRequest request, CancellationToken cancellationToken)
        => ConsultarAsync("facturaciondinc", request, cancellationToken, rows => new FacturacionDincResponse(BuildMeta(request), rows), "Consulta de facturación DINC ejecutada correctamente.");

    [HttpPost("facturacionelectronica")]
    public Task<IActionResult> FacturacionElectronica([FromBody] FacturacionRequest request, CancellationToken cancellationToken)
        => ConsultarAsync("facturacionelectronica", request, cancellationToken, rows => new FacturacionElectronicaResponse(BuildMeta(request), rows), "Consulta de factura electrónica ejecutada correctamente.");

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private async Task<IActionResult> ConsultarAsync<T>(string vista, FacturacionRequest request, CancellationToken cancellationToken, Func<IReadOnlyList<IDictionary<string, object?>>, T> projector, string successMessage)
        => await ExecuteAsync(async () =>
        {
            var rows = await repository.ConsultarAsync(vista, request.Aps, request.Anno, request.Mes, cancellationToken);
            return projector(rows);
        }, successMessage);

    private async Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, string successMessage)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null));
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
        catch (Oracle.ManagedDataAccess.Client.OracleException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, "Oracle devolvió un error durante la consulta de facturación.", HttpContext.TraceIdentifier, $"ORA-{Math.Abs(ex.Number):D5}"));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error procesando consulta de facturación. TraceId: {TraceId}", HttpContext.TraceIdentifier);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, "Ocurrió un error procesando la consulta de facturación.", HttpContext.TraceIdentifier, null));
        }
    }

    private static FacturacionConsultaMeta BuildMeta(FacturacionRequest request)
    {
        var (queryAnno, queryMes) = FacturacionRepository.ResolvePeriodoAnterior(request.Anno, request.Mes);
        return new FacturacionConsultaMeta(request.Aps, request.Anno, request.Mes, queryAnno, queryMes);
    }
}
