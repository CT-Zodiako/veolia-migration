using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/suministros/certificacion")]
public sealed class CertificacionController(ICertificacionRepository repository) : ControllerBase
{
    [HttpGet("periodos")]
    public async Task<IActionResult> GetPeriodos([FromQuery] PeriodoRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.GetPeriodosAsync(request.Vigencia, cancellationToken), "Períodos consultados correctamente.");

    [HttpGet("municipios")]
    public async Task<IActionResult> GetMunicipios([FromQuery] MunicipioRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.GetMunicipiosAsync(request.DepartamentoId, cancellationToken), "Municipios consultados correctamente.");

    [HttpGet("prestadores")]
    public async Task<IActionResult> GetPrestadores([FromQuery] PrestadorRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.GetPrestadoresAsync(request.MunicipioId, request.Filtro, cancellationToken), "Prestadores consultados correctamente.");

    [HttpGet("tipos-cargue")]
    public async Task<IActionResult> GetTiposCargue(CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.GetTiposCargueAsync(cancellationToken), "Tipos de cargue consultados correctamente.");

    [HttpPost("cargues")]
    public async Task<IActionResult> CrearCargue([FromBody] CrearCargueRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.CrearCargueAsync(request, cancellationToken), "Cargue creado correctamente.");

    [HttpPost("cargues/{cargueId:long}/archivo")]
    public async Task<IActionResult> SubirArchivo([FromRoute] long cargueId, [FromForm] IFormFile file, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.SubirArchivoAsync(cargueId, file, cancellationToken), "Archivo cargado correctamente.");

    [HttpPost("cargues/{cargueId:long}/parsear")]
    public async Task<IActionResult> ParsearArchivo([FromRoute] long cargueId, [FromBody] ParsearArchivoRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.ParsearArchivoAsync(cargueId, request, cancellationToken), "Archivo parseado correctamente.");

    [HttpGet("cargues/{cargueId:long}/resumen")]
    public async Task<IActionResult> GetResumen([FromRoute] long cargueId, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.GetResumenCargueAsync(cargueId, cancellationToken), "Resumen consultado correctamente.");

    [HttpGet("cargues/{cargueId:long}/errores")]
    public async Task<IActionResult> GetErrores(
        [FromRoute] long cargueId,
        [FromQuery][Range(1, int.MaxValue, ErrorMessage = "La página debe ser mayor o igual a 1.")] int page = 1,
        [FromQuery][Range(1, 200, ErrorMessage = "El tamaño debe estar entre 1 y 200.")] int size = 50,
        CancellationToken cancellationToken = default)
        => await ExecuteAsync(async () => await repository.GetErroresCargueAsync(cargueId, page, size, cancellationToken), "Errores consultados correctamente.");

    [HttpPost("cargues/{cargueId:long}/confirmar")]
    public async Task<IActionResult> Confirmar([FromRoute] long cargueId, [FromBody] ConfirmarCargueRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.ConfirmarCargueAsync(cargueId, request, cancellationToken), "Cargue confirmado correctamente.");

    [HttpPost("validaciones/ejecutar")]
    public async Task<IActionResult> EjecutarValidaciones([FromBody] EjecutarValidacionRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.EjecutarValidacionAsync(request, cancellationToken), "Validaciones en ejecución.");

    [HttpGet("validaciones/{validacionId:long}")]
    public async Task<IActionResult> GetValidacion([FromRoute] long validacionId, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.GetValidacionAsync(validacionId, cancellationToken), "Estado de validación consultado correctamente.");

    [HttpPost("ejecuciones")]
    public async Task<IActionResult> EjecutarCertificacion([FromBody] EjecutarCertificacionRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.EjecutarCertificacionAsync(request, cancellationToken), "Ejecución iniciada correctamente.");

    [HttpGet("ejecuciones/{ejecucionId:long}")]
    public async Task<IActionResult> GetEjecucion([FromRoute] long ejecucionId, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.GetEjecucionAsync(ejecucionId, cancellationToken), "Estado de ejecución consultado correctamente.");

    [HttpGet("resultados/{cargueId:long}")]
    public async Task<IActionResult> GetResultados([FromRoute] long cargueId, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.GetResultadosAsync(cargueId, cancellationToken), "Resultados consultados correctamente.");

    [HttpPost("cargues/{cargueId:long}/revertir")]
    public async Task<IActionResult> Revertir([FromRoute] long cargueId, [FromBody] RevertirCargueRequest request, CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.RevertirCargueAsync(cargueId, request, cancellationToken), "Cargue revertido correctamente.");

    [HttpGet("plantilla")]
    public async Task<IActionResult> GetPlantilla(
        [FromQuery][Range(1, int.MaxValue, ErrorMessage = "El tipo de cargue es obligatorio.")] int tipoCargueId,
        CancellationToken cancellationToken)
        => await ExecuteAsync(async () => await repository.GetPlantillaAsync(tipoCargueId, cancellationToken), "Plantilla descargada correctamente.");

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
            var ok = new ApiEnvelopeResponse<T>("success", data, successMessage, HttpContext.TraceIdentifier, null);
            return Ok(ok);
        }
        catch (ValidationException ex)
        {
            var badRequest = new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, null);
            return BadRequest(badRequest);
        }
        catch (InvalidOperationException ex)
        {
            var badRequest = new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, null);
            return BadRequest(badRequest);
        }
        catch (NotFoundException ex)
        {
            var notFound = new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, null);
            return NotFound(notFound);
        }
        catch (ConflictException ex)
        {
            var conflict = new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, null);
            return StatusCode(StatusCodes.Status409Conflict, conflict);
        }
        catch (OracleTimeoutException ex)
        {
            var gateway = new ApiEnvelopeResponse<object>("error", new { }, ex.Message, HttpContext.TraceIdentifier, "ORA-03135");
            return StatusCode(StatusCodes.Status502BadGateway, gateway);
        }
        catch (Exception ex)
        {
            var oraCode = ex.Message.Contains("ORA-") ? ExtractOraCode(ex.Message) : "ORA-00000";
            var error = new ApiEnvelopeResponse<object>("error", new { }, "Ocurrió un error procesando la solicitud.", HttpContext.TraceIdentifier, oraCode);
            return StatusCode(StatusCodes.Status500InternalServerError, error);
        }
    }

    private static string? ExtractOraCode(string message)
    {
        var match = System.Text.RegularExpressions.Regex.Match(message, @"ORA-\d+");
        return match.Success ? match.Value : null;
    }
}
