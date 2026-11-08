using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Regulator.Costos;

[ApiController]
[Route("api/v1/costos")]
public sealed class CostosController(ICostosRepository repository) : ControllerBase
{
    [HttpPost("validapreactualiza")]
    public async Task<IActionResult> Validapreactualiza([FromBody] ValidapreactualizaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async usuario => await repository.ValidapreactualizaAsync(request.Aps, request.Mes, request.Anno, usuario, cancellationToken),
            "Validación previa ejecutada correctamente.");

    [HttpPost("calculartarifas")]
    public async Task<IActionResult> Calculartarifas([FromBody] CalculartarifasRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async usuario => await repository.CalculartarifasAsync(request.Aps, request.Mes, request.Anno, usuario, cancellationToken),
            "Cálculo de tarifas ejecutado correctamente.");

    [HttpPost("prechecks")]
    public async Task<IActionResult> RunPrechecks([FromBody] ValidapreactualizaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async usuario => await repository.RunPrechecksAsync(request.Aps, request.Mes, request.Anno, usuario, cancellationToken),
            "Prechecks ejecutados correctamente.");

    [HttpPost("certificarTarifas")]
    public async Task<IActionResult> CertificarTarifas([FromBody] CertificarTarifasRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async usuario => await repository.CertificarTarifasAsync(request.Aps, request.Mes, request.Anno, usuario, cancellationToken),
            "Tarifas certificadas correctamente.");

    [HttpPost("consultar")]
    public async Task<IActionResult> ConsultarCostos([FromBody] CostoConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async _ => await repository.ConsultarCostosAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Costos consultados correctamente.");

    [HttpPost("cosclus")]
    public async Task<IActionResult> ConsultarCostosClus([FromBody] CostoConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async _ => await repository.ConsultarCostosClusAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Costos por clúster consultados correctamente.");

    [HttpPost("comportaclus")]
    public async Task<IActionResult> ConsultarComportaClus([FromBody] CostoConsultaRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(
            async _ => await repository.ConsultarComportaClusAsync(request.Aps, request.Anno, request.Mes, cancellationToken),
            "Comportamiento histórico de clústeres consultado correctamente.");

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    // Legacy costos routes take the user from the token (req.SISU_ID), never from the body.
    private async Task<IActionResult> ExecuteAsync<T>(Func<int, Task<T>> action, string successMessage)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            var unauthorized = new ApiEnvelopeResponse<object>("error", new { }, "No autorizado.", HttpContext.TraceIdentifier, null);
            return Unauthorized(unauthorized);
        }

        try
        {
            var data = await action((int)tokenContext.SisuId);
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
