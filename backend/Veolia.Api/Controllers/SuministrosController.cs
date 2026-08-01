using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Contracts.Suministros;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Validaciones;
using Veolia.Api.Services;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/suministros")]
public sealed class SuministrosController(ISuministrosRepository suministrosRepository, ICargueProductividadService cargueProductividadService, IValidacionesRepository validacionesRepository) : ControllerBase
{
    [HttpPost("filecarguecomercial")]
    public async Task<IActionResult> FileCargueComercial([FromBody] CargueComercialRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var inserted = await suministrosRepository.SetCargueComercialAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = inserted });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error", message = "No fue posible procesar el archivo comercial." });
        }
    }

    [HttpPost("filecarguecomercialsemestral")]
    public async Task<IActionResult> FileCargueComercialSemestral([FromBody] CargueComercialSemRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var inserted = await suministrosRepository.SetCargueComercialSemAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = inserted });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error", message = "No fue posible procesar el archivo comercial semestral." });
        }
    }

    [HttpPost("setCargueInfPropia")]
    public async Task<IActionResult> SetCargueInfPropia([FromBody] CarguePropiaRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await suministrosRepository.SetCargueInfPropiaAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = result });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("setCargueInfPropiaSem")]
    public async Task<IActionResult> SetCargueInfPropiaSem([FromBody] CarguePropiaSemRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await suministrosRepository.SetCargueInfPropiaSemAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = result });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("setCargueInfCompetidor")]
    public async Task<IActionResult> SetCargueInfCompetidor([FromBody] CargueCompetidorRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await suministrosRepository.SetCargueInfCompetidorAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = result });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("setCargueInfCompetidorSemestral")]
    public async Task<IActionResult> SetCargueInfCompetidorSemestral([FromBody] CargueCompetidorSemRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await suministrosRepository.SetCargueInfCompetidorSemestralAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = result });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("setTerceros")]
    public async Task<IActionResult> SetTerceros([FromBody] TercerosRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await suministrosRepository.SetTercerosAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = result });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

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
    public async Task<IActionResult> GuardarQrtRural([FromBody] QRTRuralRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await suministrosRepository.GuardarQrtRuralAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = result });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("existeRelleno")]
    public async Task<IActionResult> ExisteRelleno([FromBody] PrevalidarSemestralRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var mesCierre = request.semestre == 1 ? 6 : 12;
            var raw = await validacionesRepository.ExecuteAsync("fauco_existerelleno", request.aps, request.anno, mesCierre, cancellationToken);
            return Ok(new { data = raw == "1" });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("getcanCertificate")]
    public Task<IActionResult> GetCanCertificate([FromBody] PrevalidarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.GetCanCertificateAsync(request, cancellationToken));

    [HttpPost("getcanCertificateSemestral")]
    public Task<IActionResult> GetCanCertificateSemestral([FromBody] PrevalidarSemestralRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.GetCanCertificateSemestralAsync(request, cancellationToken));

    [HttpPost("Certificar")]
    public Task<IActionResult> Certificar([FromBody] CertificarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.CertificarAsync(request, cancellationToken));

    [HttpPost("Certificarsemestral")]
    public async Task<IActionResult> CertificarSemestral([FromBody] CertificarSemestralRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await suministrosRepository.CertificarSemestralAsync(request, tokenContext.SisuId, cancellationToken);
            return Ok(new { data = result });
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { data = "Error" });
        }
    }

    [HttpPost("certificarMensual")]
    public Task<IActionResult> CertificarMensual([FromBody] CertificarRequest request, CancellationToken cancellationToken) =>
        ExecuteDataAsync(() => suministrosRepository.CertificarMensualAsync(request, cancellationToken));

    [HttpPost("plcertificarSemestral")]
    public Task<IActionResult> PlCertificarSemestral([FromBody] CertificarSemestralRequest request, CancellationToken cancellationToken) =>
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
