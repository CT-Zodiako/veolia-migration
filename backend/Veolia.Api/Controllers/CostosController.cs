using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/costos")]
public sealed class CostosController(ICostosRepository repository) : ControllerBase
{
    [HttpPost("validapreactualiza")]
    public async Task<IActionResult> Validapreactualiza([FromBody] ValidapreactualizaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.ValidapreactualizaAsync(request.Aps, request.Mes, request.Anno, request.Usuario, cancellationToken),
            "Validación previa ejecutada correctamente.");

    [HttpPost("calculartarifas")]
    public async Task<IActionResult> Calculartarifas([FromBody] CalculartarifasRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.CalculartarifasAsync(request.Aps, request.Mes, request.Anno, request.Usuario, cancellationToken),
            request.Aps == 1031
                ? "Cálculo de tarifas ejecutado correctamente. Advertencia: APS=1031 omite el paso 5 por regla de negocio."
                : "Cálculo de tarifas ejecutado correctamente.");

    [HttpPost("prechecks")]
    public async Task<IActionResult> RunPrechecks([FromBody] ValidapreactualizaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.RunPrechecksAsync(request.Aps, request.Mes, request.Anno, request.Usuario, cancellationToken),
            "Prechecks ejecutados correctamente.");

    [HttpPost("certificarTarifas")]
    public async Task<IActionResult> CertificarTarifas([FromBody] CertificarTarifasRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.CertificarTarifasAsync(request.Aps, request.Mes, request.Anno, request.Usuario, cancellationToken),
            "Tarifas certificadas correctamente.");

    [HttpPost("consultar")]
    public async Task<IActionResult> ConsultarCostos([FromBody] CostoConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.ConsultarCostosAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Costos consultados correctamente.");

    [HttpPost("cosclus")]
    public async Task<IActionResult> ConsultarCostosClus([FromBody] CostoConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.ConsultarCostosClusAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Costos por clúster consultados correctamente.");

    [HttpPost("comportaclus")]
    public async Task<IActionResult> ConsultarComportaClus([FromBody] CostoConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async () => await repository.ConsultarComportaClusAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Comportamiento histórico de clústeres consultado correctamente.");

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
                1 => "Conflicto de datos en Oracle. Verificá si el período ya está certificado.",
                1400 => "Faltan datos obligatorios para completar la operación en Oracle.",
                2291 => "No existe información relacionada para la operación solicitada.",
                _ => $"Oracle error: {ex.Message}"
            };

            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, friendly, HttpContext.TraceIdentifier, $"ORA-{Math.Abs(ex.Number):D5}"));
        }
        catch (Exception ex)
        {
            var oraCode = ex.Message.Contains("ORA-") ? ExtractOraCode(ex.Message) : "ORA-00000";
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiEnvelopeResponse<object>("error", new { }, "Ocurrió un error procesando la solicitud.", HttpContext.TraceIdentifier, oraCode));
        }
    }

    private static string? ExtractOraCode(string message)
    {
        var match = System.Text.RegularExpressions.Regex.Match(message, @"ORA-\d+");
        return match.Success ? match.Value : null;
    }
}
