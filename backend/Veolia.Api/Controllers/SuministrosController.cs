using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Contracts.Suministros;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Services;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/suministros")]
public sealed class SuministrosController(ISuministrosRepository suministrosRepository, FileParserService fileParserService, ICargueProductividadService cargueProductividadService) : ControllerBase
{
    [HttpPost("filecarguecomercial")]
    public async Task<IActionResult> FileCargueComercial([FromForm] int aps, [FromForm] int anno, [FromForm] int mes, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "El archivo es obligatorio." });
        }

        try
        {
            var parsed = await fileParserService.ParseComercialAsync(file, cancellationToken);
            var inserted = await suministrosRepository.InsertCargueComercialBatchAsync(parsed.ValidRows, anno, mes, cancellationToken);
            var response = new FileUploadBatchResponse(parsed.TotalRows, parsed.ValidRows.Count, parsed.Errors.Count, inserted, parsed.Errors);
            return Ok(new { data = response });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error", message = "No fue posible procesar el archivo comercial." });
        }
    }

    [HttpPost("filecarguecomercialsemestral")]
    public async Task<IActionResult> FileCargueComercialSemestral([FromForm] int aps, [FromForm] int anno, [FromForm] int mes, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "El archivo es obligatorio." });
        }

        try
        {
            var parsed = await fileParserService.ParseComercialSemAsync(file, cancellationToken);
            var inserted = await suministrosRepository.InsertCargueUsuSemBatchAsync(parsed.ValidRows, cancellationToken);
            var response = new FileUploadBatchResponse(parsed.TotalRows, parsed.ValidRows.Count, parsed.Errors.Count, inserted, parsed.Errors);
            return Ok(new { data = response });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error", message = "No fue posible procesar el archivo comercial semestral." });
        }
    }

    [HttpPost("setCargueInfPropia")]
    public Task<IActionResult> SetCargueInfPropia([FromBody] CarguePropiaRequest request, CancellationToken cancellationToken) =>
        ExecuteIntAsync(() => suministrosRepository.SetCargueInfPropiaAsync(request, cancellationToken));

    [HttpPost("setCargueInfPropiaSem")]
    public Task<IActionResult> SetCargueInfPropiaSem([FromBody] CarguePropiaSemRequest request, CancellationToken cancellationToken) =>
        ExecuteIntAsync(() => suministrosRepository.SetCargueInfPropiaSemAsync(request, cancellationToken));

    [HttpPost("setCargueInfCompetidor")]
    public Task<IActionResult> SetCargueInfCompetidor([FromBody] CargueCompetidorRequest request, CancellationToken cancellationToken) =>
        ExecuteIntAsync(() => suministrosRepository.SetCargueInfCompetidorAsync(request, cancellationToken));

    [HttpPost("setCargueInfCompetidorSemestral")]
    public Task<IActionResult> SetCargueInfCompetidorSemestral([FromBody] CargueCompetidorSemRequest request, CancellationToken cancellationToken) =>
        ExecuteIntAsync(() => suministrosRepository.SetCargueInfCompetidorSemestralAsync(request, cancellationToken));

    [HttpPost("setTerceros")]
    public Task<IActionResult> SetTerceros([FromBody] TercerosRequest request, CancellationToken cancellationToken) =>
        ExecuteIntAsync(() => suministrosRepository.SetTercerosAsync(request, cancellationToken));

    [HttpPost("guardarProductividad")]
    public async Task<IActionResult> GuardarProductividad([FromBody] CargueProductividadGuardarRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            await cargueProductividadService.GuardarAsync(request, cancellationToken);
            return Ok(new { data = "Guardado productividad correctamente" });
        }
        catch (InvalidOperationException ex)
        {
            return Ok(new { data = ex.Message });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("cargueProductividad")]
    public async Task<IActionResult> CargueProductividad([FromBody] CargueProductividadConsultaRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var (propios, terceros) = await cargueProductividadService.ConsultarAsync(request.anno, request.mes, cancellationToken);
            return Ok(new { data = new { propios, terceros } });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("guardarQRTRural")]
    public Task<IActionResult> GuardarQrtRural([FromBody] QRTRuralRequest request, CancellationToken cancellationToken) =>
        ExecuteIntAsync(() => suministrosRepository.GuardarQrtRuralAsync(request, cancellationToken));

    [HttpPost("getcanCertificate")]
    public Task<IActionResult> GetCanCertificate([FromBody] PrevalidarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.GetCanCertificateAsync(request, cancellationToken));

    [HttpPost("getcanCertificateSemestral")]
    public Task<IActionResult> GetCanCertificateSemestral([FromBody] PrevalidarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.GetCanCertificateSemestralAsync(request, cancellationToken));

    [HttpPost("Certificar")]
    public Task<IActionResult> Certificar([FromBody] CertificarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.CertificarAsync(request, cancellationToken));

    [HttpPost("Certificarsemestral")]
    public Task<IActionResult> CertificarSemestral([FromBody] CertificarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.CertificarSemestralAsync(request, cancellationToken));

    [HttpPost("certificarMensual")]
    public Task<IActionResult> CertificarMensual([FromBody] CertificarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.CertificarMensualAsync(request, cancellationToken));

    [HttpPost("plcertificarSemestral")]
    public Task<IActionResult> PlCertificarSemestral([FromBody] CertificarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.PlCertificarSemestralAsync(request, cancellationToken));

    [HttpPost("cenrtificarEditar")]
    public Task<IActionResult> CenrtificarEditar([FromBody] CertificarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.CenrtificarEditarAsync(request, cancellationToken));

    [HttpPost("getPoda")]
    public Task<IActionResult> GetPoda([FromBody] PodaConsultaRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.GetPodaAsync(request, cancellationToken));

    [HttpPost("consultaCostoPoda")]
    public Task<IActionResult> ConsultaCostoPoda([FromBody] PodaCatalogoRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.ConsultaCostoPodaAsync(request, cancellationToken));

    [HttpPost("newCostoPoda")]
    public async Task<IActionResult> NewCostoPoda([FromBody] PodaNuevoRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            await suministrosRepository.NewCostoPodaAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = "OK" });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("registrarPoda")]
    public async Task<IActionResult> RegistrarPoda([FromBody] PodaEditarRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            await suministrosRepository.RegistrarPodaAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = "OK" });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("setReversion")]
    public async Task<IActionResult> SetReversion([FromBody] SetReversionRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        if (string.IsNullOrWhiteSpace(request.motivo))
        {
            return Ok(new ReversionResponse(false, "El motivo es obligatorio.", null));
        }

        try
        {
            var result = await suministrosRepository.SetReversionAsync(request, (int)tokenContext.SisuId, cancellationToken);
            return Ok(result);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpGet("getReversion")]
    public async Task<IActionResult> GetReversion(CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var data = await suministrosRepository.GetReversionAsync(cancellationToken);
            return Ok(data);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private async Task<IActionResult> ExecuteIntAsync(Func<Task<int>> action)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await action();
            return Ok(new { data = result });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    private async Task<IActionResult> ExecuteDataAsync<T>(Func<Task<T>> action)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await action();
            return Ok(new { data = result });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }
}
