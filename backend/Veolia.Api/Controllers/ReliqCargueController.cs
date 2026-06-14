using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Reliquidacion;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/reliqCargue")]
public sealed class ReliqCargueController(IReliqCargueRepository repository) : ControllerBase
{
    [HttpPost("compararCostos")]
    public async Task<IActionResult> CompararCostos([FromBody] CompararRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.Reliq <= 0)
            return UnprocessableEntity(Envelope("error", null, "reliq es obligatorio."));

        try
        {
            var data = await repository.CompararCostosAsync(request.Reliq, cancellationToken);
            if (data.Count == 0)
                return NotFound(Envelope("error", null, "RELIQ_NOT_FOUND"));

            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("compararCostosCargue")]
    public async Task<IActionResult> CompararCostosCargue([FromBody] CompararCostosCargueRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.Reliq <= 0 || request.ApsaId <= 0)
            return UnprocessableEntity(Envelope("error", null, "reliq y apsaId son obligatorios."));

        try
        {
            var result = await repository.CompararCostosCargueAsync(request.Reliq, request.ApsaId, cancellationToken);
            return Ok(Envelope("ok", new { resultado = result }, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("compararTarifas")]
    public async Task<IActionResult> CompararTarifas([FromBody] CompararRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.Reliq <= 0)
            return UnprocessableEntity(Envelope("error", null, "reliq es obligatorio."));

        try
        {
            var data = await repository.CompararTarifasAsync(request.Reliq, cancellationToken);
            if (data.Count == 0)
                return NotFound(Envelope("error", null, "RELIQ_NOT_FOUND"));

            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("resumenCompararTarifas")]
    public async Task<IActionResult> ResumenCompararTarifas([FromBody] ResumenCompararTarifasRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.Reliq <= 0 || request.ApsaId <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
            return UnprocessableEntity(Envelope("error", null, "Parámetros inválidos."));

        try
        {
            var data = await repository.ResumenCompararTarifasAsync(request.Reliq, request.ApsaId, request.Anno, request.Mes, cancellationToken);
            if (data is null)
                return NotFound(Envelope("error", null, "RELIQ_NOT_FOUND"));

            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("getReliInfoUsuarios")]
    public async Task<IActionResult> GetReliInfoUsuarios([FromBody] GetReliqBloqueRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.IdReliq <= 0)
            return UnprocessableEntity(Envelope("error", null, "idReliq es obligatorio."));

        try
        {
            var data = await repository.GetReliInfoUsuariosAsync(request.IdReliq, cancellationToken);
            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("getResumenEmpresa")]
    public async Task<IActionResult> GetResumenEmpresa([FromBody] GetReliqBloqueRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.IdReliq <= 0)
            return UnprocessableEntity(Envelope("error", null, "idReliq es obligatorio."));

        try
        {
            var data = await repository.GetResumenEmpresaAsync(request.IdReliq, cancellationToken);
            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("getResumenAPS")]
    public async Task<IActionResult> GetResumenAps([FromBody] GetReliqBloqueRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.IdReliq <= 0)
            return UnprocessableEntity(Envelope("error", null, "idReliq es obligatorio."));

        try
        {
            var data = await repository.GetResumenApsAsync(request.IdReliq, cancellationToken);
            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("getResumenRelleno")]
    public async Task<IActionResult> GetResumenRelleno([FromBody] GetReliqBloqueRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.IdReliq <= 0)
            return UnprocessableEntity(Envelope("error", null, "idReliq es obligatorio."));

        try
        {
            var data = await repository.GetResumenRellenoAsync(request.IdReliq, cancellationToken);
            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("getReliInfoAdicional")]
    public async Task<IActionResult> GetReliInfoAdicional([FromBody] GetReliqBloqueRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (request.IdReliq <= 0)
            return UnprocessableEntity(Envelope("error", null, "idReliq es obligatorio."));

        try
        {
            var data = await repository.GetReliInfoAdicionalAsync(request.IdReliq, cancellationToken);
            return Ok(Envelope("ok", data, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("updateReliInfoUsuarios")]
    public async Task<IActionResult> UpdateReliInfoUsuarios([FromBody] BatchUpdateRequestDto<UpdateReliInfoUsuariosRequestDto> request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (!request.Data.Any())
            return UnprocessableEntity(Envelope("error", null, "PAYLOAD_EMPTY"));

        if (request.Data.Any(x => x.IuaeId <= 0 || x.ReliId <= 0 || x.Cantidad < 0 || x.Toneladas < 0))
            return UnprocessableEntity(Envelope("error", null, "Parámetros inválidos."));

        try
        {
            var affected = await repository.UpdateReliInfoUsuariosAsync(request.Data, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("ok", new { affected }, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("updateResumenEmpresa")]
    public async Task<IActionResult> UpdateResumenEmpresa([FromBody] BatchUpdateRequestDto<UpdateResumenEmpresaRequestDto> request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (!request.Data.Any())
            return UnprocessableEntity(Envelope("error", null, "PAYLOAD_EMPTY"));

        if (request.Data.Any(x => x.InedId <= 0 || x.ReliId <= 0 || x.Cblj < 0 || x.Costo < 0 || x.Tarifa < 0))
            return UnprocessableEntity(Envelope("error", null, "Parámetros inválidos."));

        try
        {
            var affected = await repository.UpdateResumenEmpresaAsync(request.Data, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("ok", new { affected }, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("updateResumenAPS")]
    public async Task<IActionResult> UpdateResumenAps([FromBody] BatchUpdateRequestDto<UpdateResumenApsRequestDto> request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (!request.Data.Any())
            return UnprocessableEntity(Envelope("error", null, "PAYLOAD_EMPTY"));

        if (request.Data.Any(x => x.IaedId <= 0 || x.ReliId <= 0 || x.Qrtz < 0 || x.Costo < 0 || x.Tarifa < 0))
            return UnprocessableEntity(Envelope("error", null, "Parámetros inválidos."));

        try
        {
            var affected = await repository.UpdateResumenApsAsync(request.Data, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("ok", new { affected }, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("updateResumenRellno")]
    public async Task<IActionResult> UpdateResumenRellno([FromBody] BatchUpdateRequestDto<UpdateResumenRellenoRequestDto> request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (!request.Data.Any())
            return UnprocessableEntity(Envelope("error", null, "PAYLOAD_EMPTY"));

        if (request.Data.Any(x => x.IareId <= 0 || x.ReliId <= 0 || x.Qrs < 0 || x.Costo < 0 || x.Tarifa < 0))
            return UnprocessableEntity(Envelope("error", null, "Parámetros inválidos."));

        try
        {
            var affected = await repository.UpdateResumenRellenoAsync(request.Data, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("ok", new { affected }, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    [HttpPost("updateResumenAdicional")]
    public async Task<IActionResult> UpdateResumenAdicional([FromBody] BatchUpdateRequestDto<UpdateResumenAdicionalRequestDto> request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", null, "No autorizado."));

        if (!request.Data.Any())
            return UnprocessableEntity(Envelope("error", null, "PAYLOAD_EMPTY"));

        if (request.Data.Any(x => x.CeadId <= 0 || x.ReliId <= 0 || x.Cdf < 0 || x.Ctl < 0))
            return UnprocessableEntity(Envelope("error", null, "Parámetros inválidos."));

        try
        {
            var affected = await repository.UpdateResumenAdicionalAsync(request.Data, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("ok", new { affected }, "OK"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", null, $"Error: {ex.Message}"));
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private object Envelope(string status, object? data, string message)
        => new { status, data, message, traceId = HttpContext.TraceIdentifier };

    public sealed class CompararRequestDto
    {
        public long Reliq { get; set; }
    }

    public sealed class ResumenCompararTarifasRequestDto
    {
        public long Reliq { get; set; }
        public long ApsaId { get; set; }
        public int Anno { get; set; }
        public int Mes { get; set; }
    }

    public sealed class CompararCostosCargueRequestDto
    {
        public long Reliq { get; set; }
        public long ApsaId { get; set; }
    }
}
