using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/tarifas")]
public sealed class TarifasController(ITarifasRepository tarifasRepository) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> ConsultaTarifa([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var data = await tarifasRepository.ConsultaTarifaAsync(request.aps, request.anno, request.mes, cancellationToken);
            return Ok(data);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError());
        }
    }

    [HttpPost("consultageneral")]
    public async Task<IActionResult> ConsultaGeneral([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var data = await tarifasRepository.ConsultaGeneralAsync(request.anno, request.mes, cancellationToken);
            return Ok(data);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError());
        }
    }

    [HttpPost("tarxcom")]
    public async Task<IActionResult> TarifaPorComponente([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var data = await tarifasRepository.TarifaPorComponenteAsync(request.aps, request.anno, request.mes, cancellationToken);
            return Ok(data);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError());
        }
    }

    [HttpPost("tarxcomgeneral")]
    public async Task<IActionResult> TarifaPorComponenteGeneral([FromBody] TarifasPeriodoRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var data = await tarifasRepository.TarifaPorComponenteGeneralAsync(request.anno, request.mes, cancellationToken);
            return Ok(data);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError());
        }
    }

    private static object MapLegacyError() => new { data = "Error" };
}

public sealed record TarifasApsPeriodoRequest(long aps, int anno, int mes);

public sealed record TarifasPeriodoRequest(int anno, int mes);
