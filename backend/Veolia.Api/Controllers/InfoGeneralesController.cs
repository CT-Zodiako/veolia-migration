using Microsoft.AspNetCore.Mvc;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Contracts.InfoGenerales;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/infogenerales")]
public sealed class InfoGeneralesController(IInfoGeneralesRepository repository) : ControllerBase
{
    [HttpPost("consultaenergia")]
    public Task<IActionResult> ConsultaEnergia([FromBody] ConsultaProyeccionRequestDto request, CancellationToken cancellationToken)
        => HandleProyeccionAsync(request, repository.ConsultaEnergiaAsync, cancellationToken);

    [HttpPost("consultaacueducto")]
    public Task<IActionResult> ConsultaAcueducto([FromBody] ConsultaProyeccionRequestDto request, CancellationToken cancellationToken)
        => HandleProyeccionAsync(request, repository.ConsultaAcueductoAsync, cancellationToken);

    [HttpPost("consultacostos")]
    public Task<IActionResult> ConsultaCostos([FromBody] ConsultaProyeccionRequestDto request, CancellationToken cancellationToken)
        => HandleProyeccionAsync(request, repository.ConsultaCostosAsync, cancellationToken);

    [HttpPost("consultatarifas")]
    public Task<IActionResult> ConsultaTarifas([FromBody] ConsultaProyeccionRequestDto request, CancellationToken cancellationToken)
        => HandleProyeccionAsync(request, repository.ConsultaTarifasAsync, cancellationToken);

    [HttpPost("consultaHistorialCertificaciones")]
    public Task<IActionResult> ConsultaHistorialCertificaciones([FromBody] ConsultaHistorialRequestDto request, CancellationToken cancellationToken)
        => HandleHistorialAsync(request, repository.ConsultaHistorialCertificacionesAsync, cancellationToken);

    [HttpPost("consultaHistorialProductividad")]
    public Task<IActionResult> ConsultaHistorialProductividad([FromBody] ConsultaHistorialRequestDto request, CancellationToken cancellationToken)
        => HandleHistorialAsync(request, repository.ConsultaHistorialProductividadAsync, cancellationToken);

    private async Task<IActionResult> HandleProyeccionAsync(
        ConsultaProyeccionRequestDto request,
        Func<long, long, long, CancellationToken, Task<IReadOnlyList<object>>> action,
        CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Apsaid <= 0 || request.Proyid <= 0)
            return BadRequest(Envelope("error", Array.Empty<object>(), "apsaid y proyid son obligatorios."));

        try
        {
            var rows = await action(request.Apsaid, request.Proyid, tokenContext.SisuId, cancellationToken);
            if (rows.Count == 0)
                return NotFound(Envelope("error", Array.Empty<object>(), "No se encontraron resultados."));

            return Ok(Envelope("success", rows, "OK"));
        }
        catch (OracleException ex) when (IsDataSourceNotReady(ex))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, Envelope("error", Array.Empty<object>(), "DataSourceNotReady"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    private async Task<IActionResult> HandleHistorialAsync(
        ConsultaHistorialRequestDto request,
        Func<int, int, long, CancellationToken, Task<IReadOnlyList<object>>> action,
        CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

        if (request.Anno <= 0 || request.Mes is < 1 or > 12)
            return BadRequest(Envelope("error", Array.Empty<object>(), "anno y mes son obligatorios. mes debe estar entre 1 y 12."));

        try
        {
            var rows = await action(request.Anno, request.Mes, tokenContext.SisuId, cancellationToken);
            if (rows.Count == 0)
                return NotFound(Envelope("error", Array.Empty<object>(), "No se encontraron resultados."));

            return Ok(Envelope("success", rows, "OK"));
        }
        catch (OracleException ex) when (IsDataSourceNotReady(ex))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, Envelope("error", Array.Empty<object>(), "DataSourceNotReady"));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, Envelope("error", Array.Empty<object>(), $"Error: {ex.Message}"));
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private ApiEnvelopeResponse<T> Envelope<T>(string status, T data, string message)
        => new(status, data, message, HttpContext.TraceIdentifier, null);

    private static bool IsDataSourceNotReady(OracleException ex)
        => ex.Number is 942 or 4043;
}
