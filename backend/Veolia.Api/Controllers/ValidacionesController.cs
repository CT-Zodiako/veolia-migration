using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Validaciones;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/validaciones")]
public sealed class ValidacionesController(IValidacionesRepository validacionesRepository) : ControllerBase
{
    [HttpPost("certificarfauco_existarifa")]
    public Task<IActionResult> FaucoExistarifa([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync("fauco_generasui", request, cancellationToken);

    [HttpPost("certificarFauco_cpsuivsfact")]
    public Task<IActionResult> FaucoCpsuivsfact([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync("fauco_cpsuivsfact", request, cancellationToken);

    [HttpPost("certificarFauco_cpproductividad")]
    public Task<IActionResult> FaucoCpproductividad([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync("fauco_cpproductividad", request, cancellationToken);

    [HttpPost("certificarFauco_cpenero")]
    public Task<IActionResult> FaucoCpenero([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync("fauco_cpenero", request, cancellationToken);

    [HttpPost("certificarFauco_integracion")]
    public Task<IActionResult> FaucoIntegracion([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync("fauco_integracion", request, cancellationToken);

    [HttpPost("certificarfauco_existerelleno")]
    public Task<IActionResult> FaucoExisterelleno([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync("fauco_existerelleno", request, cancellationToken);

    [HttpPost("certificarfauco_existarifacert")]
    public Task<IActionResult> FaucoExistarifacert([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync("fauco_tarifacert", request, cancellationToken);

    private async Task<IActionResult> ExecuteAsync(string functionName, ValidacionRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var raw = await validacionesRepository.ExecuteAsync(functionName, request.aps, request.anno, request.mes, cancellationToken);
            var normalized = Normalize(raw);
            return Ok(normalized);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new ValidacionResponse(false, $"Error técnico: {ex.Message}"));
        }
    }

    private static ValidacionResponse Normalize(string? raw)
    {
        if (string.Equals(raw, "0", StringComparison.Ordinal) ||
            string.Equals(raw, "1", StringComparison.Ordinal))
        {
            return new ValidacionResponse(true, null);
        }

        return new ValidacionResponse(false, raw);
    }
}
